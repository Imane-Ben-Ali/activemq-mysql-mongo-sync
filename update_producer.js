const stompit = require("stompit");
const mysql = require("mysql2/promise");

// Configuration MySQL
const dbConfig = {
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "root",
  database: "ecommerce",
};

// ActiveMQ
const connectOptions = { host: "localhost", port: 61613 };

async function updateOrder() {
  // 1. Connexion MySQL
  const db = await mysql.createConnection(dbConfig);

  // 2. Connexion ActiveMQ
  stompit.connect(connectOptions, async (err, client) => {
    if (err) {
      console.error("Erreur ActiveMQ:", err);
      return;
    }

    const commandeId = 1; // commande à modifier
    const newTotal = 3100;

    const newItems = [
      { produit_id: 1, nom: "Laptop", prix_unitaire: 1500, quantite: 2 },
      { produit_id: 2, nom: "Souris", prix_unitaire: 50, quantite: 2 },
    ];

    const clientInfo = {
      nom: "imane",
      email: "imane123updated@mail.com",
      telephone: "0600000000",
    };

    try {
      // -------------------------------
      // 1  Mettre à jour la commande
      // -------------------------------
      await db.execute("UPDATE commandes SET total = ? WHERE id = ?", [
        newTotal,
        commandeId,
      ]);

      // -------------------------------
      // 2  Mettre à jour les items
      // -------------------------------
      for (const item of newItems) {
        await db.execute(
          "UPDATE commande_items SET quantite = ?, prix_unitaire = ? WHERE commande_id = ? AND produit_id = ?",
          [item.quantite, item.prix_unitaire, commandeId, item.produit_id]
        );
      }

      // -------------------------------
      // 3 Mettre à jour le client
      // -------------------------------
      const [rows] = await db.execute(
        "SELECT client_id FROM commandes WHERE id = ?",
        [commandeId]
      );

      const clientId = rows[0].client_id;

      await db.execute(
        "UPDATE clients SET nom = ?, email = ?, telephone = ? WHERE id = ?",
        [clientInfo.nom, clientInfo.email, clientInfo.telephone, clientId]
      );

      // -------------------------------
      // 4 Envoyer message ActiveMQ
      // -------------------------------
      const message = {
        action: "update",

        commande_id: commandeId,
        client_id: clientId, //  important pour cohérence
        total: newTotal,
        items: newItems,
        client_nom: clientInfo.nom,
        client_email: clientInfo.email,
        client_telephone: clientInfo.telephone,
      };

      const frame = client.send({ destination: "/queue/orders" });
      frame.write(JSON.stringify(message));
      frame.end();

      console.log("UPDATE MySQL OK + message envoyé à ActiveMQ");

      client.disconnect();
      await db.end();
    } catch (error) {
      console.error("Erreur UPDATE:", error);
    }
  });
}

updateOrder();
