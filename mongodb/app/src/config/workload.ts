export interface WorkloadConfig {
  insertBatchSize: number;
  maxOperationsPerObject: number;
  objectCount: number;
  replicaCount: number;
  seed: number;
}

const DEFAULT_WORKLOAD_CONFIG: WorkloadConfig = {
  insertBatchSize: 250,
  maxOperationsPerObject: 1_000,
  objectCount: 10_000,
  replicaCount: 5,
  seed: 20260411,
};

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function loadWorkloadConfig(): WorkloadConfig {
  return {
    insertBatchSize: readPositiveInt(
      "MONGO_INSERT_BATCH_SIZE",
      DEFAULT_WORKLOAD_CONFIG.insertBatchSize,
    ),
    maxOperationsPerObject: readPositiveInt(
      "MONGO_MAX_OPERATIONS_PER_OBJECT",
      DEFAULT_WORKLOAD_CONFIG.maxOperationsPerObject,
    ),
    objectCount: readPositiveInt(
      "MONGO_OBJECTS",
      DEFAULT_WORKLOAD_CONFIG.objectCount,
    ),
    replicaCount: readPositiveInt(
      "MONGO_REPLICAS",
      DEFAULT_WORKLOAD_CONFIG.replicaCount,
    ),
    seed: readPositiveInt("MONGO_SEED", DEFAULT_WORKLOAD_CONFIG.seed),
  };
}
