db = db.getSiblingDB("crdt_lab");

db.createCollection("objects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["objectId", "operations"],
      properties: {
        objectId: { bsonType: "string" },
        operations: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: [
              "opId",
              "txId",
              "objectId",
              "replicaId",
              "clock",
              "action"
            ],
            properties: {
              opId: { bsonType: "string" },
              txId: { bsonType: "string" },
              objectId: { bsonType: "string" },
              replicaId: { bsonType: "string" },
              clock: { bsonType: "object" },
              action: {
                bsonType: "object",
                required: ["type"],
                properties: {
                  type: { bsonType: "string" }
                }
              }
            }
          }
        }
      }
    }
  }
});

db.objects.createIndex({ objectId: 1 }, { unique: true, name: "uq_object_id" });
db.objects.createIndex({ "operations.opId": 1 }, { name: "idx_operations_op_id" });
db.objects.createIndex({ "operations.replicaId": 1 }, { name: "idx_operations_replica_id" });
db.objects.createIndex({ "operations.action.type": 1 }, { name: "idx_operations_action_type" });
