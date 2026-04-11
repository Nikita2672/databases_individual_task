export interface WorkloadConfig {
  objectCount: number;
  replicaCount: number;
  seed: number;
  targetOperations: number;
  persistChunkSize: number;
}

const DEFAULT_WORKLOAD_CONFIG: WorkloadConfig = {
  objectCount: 8,
  replicaCount: 3,
  seed: 20260411,
  targetOperations: 1_000_000,
  persistChunkSize: 10_000,
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
    objectCount: readPositiveInt(
      "WORKLOAD_OBJECTS",
      DEFAULT_WORKLOAD_CONFIG.objectCount,
    ),
    replicaCount: readPositiveInt(
      "WORKLOAD_REPLICAS",
      DEFAULT_WORKLOAD_CONFIG.replicaCount,
    ),
    seed: readPositiveInt("WORKLOAD_SEED", DEFAULT_WORKLOAD_CONFIG.seed),
    targetOperations: readPositiveInt(
      "WORKLOAD_TARGET_OPERATIONS",
      DEFAULT_WORKLOAD_CONFIG.targetOperations,
    ),
    persistChunkSize: readPositiveInt(
      "WORKLOAD_PERSIST_CHUNK_SIZE",
      DEFAULT_WORKLOAD_CONFIG.persistChunkSize,
    ),
  };
}
