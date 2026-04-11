db = db.getSiblingDB("crdt_lab");

db.createCollection("replicas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["replicaId", "createdAt"],
      properties: {
        replicaId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        metadata: { bsonType: ["object", "null"] }
      }
    }
  }
});

db.createCollection("objects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["objectId", "objectType", "createdBy", "createdAt"],
      properties: {
        objectId: { bsonType: "string" },
        objectType: { bsonType: "string" },
        createdBy: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        metadata: { bsonType: ["object", "null"] }
      }
    }
  }
});

db.createCollection("operations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "opId",
        "objectId",
        "replicaId",
        "actionType",
        "actionPath",
        "payload",
        "wallTime",
        "replicaSeq",
        "vectorClock"
      ],
      properties: {
        opId: { bsonType: "string" },
        objectId: { bsonType: "string" },
        replicaId: { bsonType: "string" },
        txId: { bsonType: ["string", "null"] },
        actionType: { bsonType: "string" },
        actionPath: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        payload: { bsonType: ["object", "array", "string", "number", "bool", "null"] },
        wallTime: { bsonType: "date" },
        replicaSeq: { bsonType: "long" },
        vectorClock: { bsonType: "object" },
        dependencies: {
          bsonType: ["array", "null"],
          items: { bsonType: "string" }
        }
      }
    }
  }
});

db.createCollection("snapshots", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["snapshotId", "objectId", "snapshotVersion", "state", "createdAt"],
      properties: {
        snapshotId: { bsonType: "string" },
        objectId: { bsonType: "string" },
        baseOpId: { bsonType: ["string", "null"] },
        snapshotVersion: { bsonType: "long" },
        state: { bsonType: ["object", "array"] },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.replicas.createIndex({ replicaId: 1 }, { unique: true, name: "uq_replica_id" });
db.objects.createIndex({ objectId: 1 }, { unique: true, name: "uq_object_id" });
db.objects.createIndex({ createdBy: 1, createdAt: -1 }, { name: "idx_objects_creator_time" });

db.operations.createIndex({ opId: 1 }, { unique: true, name: "uq_op_id" });
db.operations.createIndex({ replicaId: 1, replicaSeq: 1 }, { unique: true, name: "uq_replica_seq" });
db.operations.createIndex({ objectId: 1, wallTime: -1 }, { name: "idx_object_time" });
db.operations.createIndex({ objectId: 1, replicaId: 1, replicaSeq: -1 }, { name: "idx_object_replica_seq" });
db.operations.createIndex({ actionType: 1 }, { name: "idx_action_type" });
db.operations.createIndex({ dependencies: 1 }, { name: "idx_dependencies" });

db.snapshots.createIndex({ snapshotId: 1 }, { unique: true, name: "uq_snapshot_id" });
db.snapshots.createIndex({ objectId: 1, snapshotVersion: 1 }, { unique: true, name: "uq_object_snapshot_version" });
db.snapshots.createIndex({ objectId: 1, createdAt: -1 }, { name: "idx_snapshot_object_time" });
