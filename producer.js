const stompit = require("stompit");
const mysql = require("mysql2/promise"); // version promise pour async/await

// Connexion MySQL
const dbConfig = {
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "root",
  database: "ecommerce",
};

// Connexion ActiveMQ
const connectOptions = {
  host: "localhost",
  port: 61613, // port de protocole STOMP
};

// Fonction pour récupérer ou créer le client
async function getClientId(db, clientInfo) {
  const [result] = await db.execute(
    "INSERT INTO clients (nom, email, telephone) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id",
    [clientInfo.nom, clientInfo.email, clientInfo.telephone]
  );

  if (result.insertId) return result.insertId; // nouveau client sinon retourne 0

  // client existant → récupérer ID réel
  const [rows] = await db.execute("SELECT id FROM clients WHERE email = ?", [
    clientInfo.email,
  ]);
  return rows[0].id;
}

// Fonction pour récupérer ou créer le produit
async function getProductId(db, product) {
  const [result] = await db.execute(
    "INSERT INTO produits (nom, prix, stock) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=id",
    [product.nom, product.prix, product.stock]
  );

  if (result.insertId) return result.insertId; // nouveau produit

  const [rows] = await db.execute("SELECT id FROM produits WHERE nom = ?", [
    product.nom,
  ]);
  return rows[0].id;
}

// Fonction principale
async function main() {
  // connect au data base
  const db = await mysql.createConnection(dbConfig);
  //conexion to activemq correcte
  stompit.connect(connectOptions, async (err, client) => {
    if (err) {
      console.error("Erreur ActiveMQ:", err);
      return;
    }

    const clientInfo = {
      nom: "oumaima",
      email: "oumaim@mail.com",
      telephone: "0600000000",
    };

    try {
      // 1 Client
      const clientId = await getClientId(db, clientInfo); // insert client and return its id

      // 2 Produits
      const products = [
        { nom: "ZEET L3OUD", prix: 1200, stock: 10 },
        { nom: "Souris", prix: 30, stock: 50 },
        { nom: "DJAJ", prix: 60, stock: 50 },
      ];

      for (const p of products) {
        p.id = await getProductId(db, p); // insert each product and return its id
      }

      // 3 Créer la commande
      const items = products.map((p) => ({
        //create commande
        produit_id: p.id,
        nom: p.nom,
        quantite: p.nom === "Laptop" ? 2 : 1,
        prix_unitaire: p.prix,
      }));

      //calculer total de la commande (sum of quantity*price of all products)
      const total = items.reduce(
        (sum, i) => sum + i.quantite * i.prix_unitaire,
        0
      );

      const [commandeResult] = await db.execute(
        "INSERT INTO commandes (client_id, total) VALUES (?, ?)",
        [clientId, total]
      );
      // Recuperation du commande
      const commandeId = commandeResult.insertId;

      // Insérer les items
      for (const item of items) {
        await db.execute(
          "INSERT INTO commande_items (commande_id, produit_id, quantite, prix_unitaire) VALUES (?, ?, ?, ?)",
          [commandeId, item.produit_id, item.quantite, item.prix_unitaire]
        );
      }

      // definir notre message
      const message = {
        commande_id: commandeId,
        client_id: clientId,
        client_nom: clientInfo.nom,
        client_email: clientInfo.email,
        client_telephone: clientInfo.telephone,
        total: total,
        items: items,
      };
      //send message to activemq in queue named orders
      //client est la connexion ActiveMQ via STOMP
      const frame = client.send({ destination: "/queue/orders" });
      frame.write(JSON.stringify(message)); // write le message JSON
      frame.end();

      console.log("Commande complète envoyée à ActiveMQ ");
    } catch (error) {
      console.error(error);
    } finally {
      await db.end();
    }
  });
}

main();
