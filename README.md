# activemq-mysql-mongo-sync
Real-time data sync between MySQL and MongoDB using Apache ActiveMQ (STOMP) — Node.js producer + Python consumer

## Architecture

```
Node.js (Producer) ──STOMP──▶ ActiveMQ /queue/orders ──STOMP──▶ Python (Consumer)
     │                                                                   │
  MySQL CRUD                                                       MongoDB sync
```

## Stack

- **Producer** : Node.js, stompit, mysql2
- **Consumer** : Python, stomp.py, pymongo
- **Broker** : Apache ActiveMQ (STOMP port 61613)
- **Databases** : MySQL + MongoDB

## Setup

```bash
# Node.js
npm install

# Python
pip install stomp.py pymongo
```

## Usage

```bash
# Terminal 1 — start consumer
python consumer/consumer.py

# Terminal 2 — run operations
node producer/insert.js
node producer/update.js
node producer/delete.js
```

## Message Format

```json
{
  "action": "insert | update | delete",
  "commande_id": 1,
  "total": 1290,
  "items": [...]
}
```

---

**Imane Ben Ali** · ENSAM Meknès · [LinkedIn](https://www.linkedin.com/in/imane-ben-ali-872b10338)
