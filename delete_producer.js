const stompit = require("stompit");
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "root",
  database: "ecommerce",
});

const connectOptions = { host: "localhost", port: 61613 };

stompit.connect(connectOptions, (err, client) => {
  if (err) return console.error("Erreur ActiveMQ:", err);

  const commandeId = 1;

  db.query(
    "DELETE FROM commande_items WHERE commande_id = ?",
    [commandeId],
    (err) => {
      if (err) throw err;

      db.query("DELETE FROM commandes WHERE id = ?", [commandeId], (err) => {
        if (err) throw err;

        // 3 supprimer le client si nécessaire
        // db.query("DELETE FROM clients WHERE id = ?", [clientId]);

        // 4 Envoyer le message delete à ActiveMQ pour MongoDB
        const message = {
          action: "delete",
          commande_id: commandeId,
        };

        const frame = client.send({ destination: "/queue/orders" });
        frame.write(JSON.stringify(message));
        frame.end();

        console.log("Commande supprimée de MySQL et message delete envoyé ");
      });
    }
  );
});
