import stomp
import json
from pymongo import MongoClient
# Pour se connecter à MongoDB et insérer/modifier/supprimer des documents.
import time
# Juste pour garder le programme en marche avec une boucle sleep.



# Connexion MongoDB
mongo = MongoClient("mongodb://localhost:27017/")
db = mongo["ecommerce"]
collection = db["commandes"]


# une classe qui va écouter les événements du broker (ActiveMQ).
class OrderListener(stomp.ConnectionListener):
    def on_error(self, frame):
        print("Erreur ActiveMQ :", frame.body)
    
    # s’exécute automatiquement quand ActiveMQ envoie un message de /queue/orders.
    def on_message(self, frame): 
        try:
            body = frame.body
            data = json.loads(body)
            action = data.get("action", "insert")  # par défaut insert

            if action == "insert":
                # Création du document MongoDB
                document = {
                    "commande_id": data["commande_id"],
                    "total": data["total"],
                    "client": {
                        "client_id": data["client_id"],
                        "nom": data.get("client_nom", ""),
                        "email": data.get("client_email", ""),
                        "telephone": data.get("client_telephone", "")
                    },
                    "items": data["items"]
                }
                inserted_id = collection.insert_one(document).inserted_id
                document["_id"] = str(inserted_id)
                print("Commande insérée ")
                print(json.dumps(document, indent=4))

            elif action == "update":
                commande_id = data["commande_id"]
                update_fields = {}
                if "total" in data:
                    update_fields["total"] = data["total"]
                if "items" in data:
                    update_fields["items"] = data["items"]
                if "client_nom" in data:
                    update_fields["client.nom"] = data["client_nom"]
                if "client_email" in data:
                    update_fields["client.email"] = data["client_email"]
                if "client_telephone" in data:
                    update_fields["client.telephone"] = data["client_telephone"]

                result = collection.update_one(
                    {"commande_id": commande_id},
                    {"$set": update_fields}
                )
                print(f"Commande {commande_id} mise à jour  ({result.modified_count} doc modifié)")

            elif action == "delete":
                commande_id = data["commande_id"]
                result = collection.delete_one({"commande_id": commande_id})
                print(f"Commande {commande_id} supprimée  ({result.deleted_count} doc supprimé)")

            else:
                print("Action inconnue :", action)

        except Exception as e:
            print("Erreur :", e)

# Connexion à ActiveMQ
conn = stomp.Connection([('localhost', 61613)])
conn.set_listener('', OrderListener())
# Quand un message arrive, utilise OrderListener pour le traiter.
conn.connect(wait=True) # conn.connect(wait=True)


# S'abonner à la queue
conn.subscribe(destination='/queue/orders', id=1, ack='auto')

print("Consumer actif. En attente des messages…")

try:
    while True:
        time.sleep(1)  # Pour que le processus reste ouvert et receve les messages.
except KeyboardInterrupt:
    print("Arrêt du consumer...")
    conn.disconnect() # Ça arrête proprement la connexion STOMP.
    print("Déconnecté.")