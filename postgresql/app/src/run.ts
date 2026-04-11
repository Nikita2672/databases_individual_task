import type { Action, LeafValue, Operation } from "@gvsem/epistyl";
import { loadWorkloadConfig } from "./config/workload.js";
import { PostgresOperationStore } from "./postgresql/PostgresOperationStore.js";

type VectorClock = Record<string, number>;

interface ObjectState {
  attendeeCount: number;
  building: string;
  color: string;
  description: string;
  endAt: string;
  note: string;
  objectId: string;
  organizer: string;
  room: string;
  startAt: string;
  tags: Set<string>;
  title: string;
}

interface ReplicaState {
  clock: VectorClock;
  counter: number;
  replicaId: string;
}

class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];

  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function cloneClock(clock: VectorClock): VectorClock {
  return { ...clock };
}

function mergeClock(into: VectorClock, incoming: VectorClock): void {
  for (const [replicaId, counter] of Object.entries(incoming)) {
    into[replicaId] = Math.max(into[replicaId] ?? 0, counter);
  }
}

function createReplicaIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `R${index + 1}`);
}

function createObjectStates(count: number): ObjectState[] {
  return Array.from({ length: count }, (_, index) => ({
    attendeeCount: 1,
    building: "HQ",
    color: "blue",
    description: "Weekly planning",
    endAt: "2026-03-07T11:00:00.000Z",
    note: "base-note",
    objectId: `event-${index + 1}`,
    organizer: "user-1",
    room: "A-101",
    startAt: "2026-03-07T10:00:00.000Z",
    tags: new Set(["team"]),
    title: "Team Sync",
  }));
}

function createReplicaStates(replicaIds: readonly string[]): Map<string, ReplicaState> {
  const replicas = new Map<string, ReplicaState>();

  for (const replicaId of replicaIds) {
    replicas.set(replicaId, {
      clock: {},
      counter: 0,
      replicaId,
    });
  }

  return replicas;
}

function createRefValue(objectId: string): LeafValue {
  return {
    type: "ref",
    objectId,
  };
}

function buildOperation(
  replica: ReplicaState,
  objectId: string,
  action: Action,
): Operation {
  replica.counter += 1;
  replica.clock[replica.replicaId] = replica.counter;

  return {
    action,
    clock: cloneClock(replica.clock),
    objectId,
    opId: `${replica.replicaId}:${replica.counter}`,
    replicaId: replica.replicaId,
    txId: `${replica.replicaId}:tx:${replica.counter}`,
  };
}

function createBootstrapOperations(
  replica: ReplicaState,
  object: ObjectState,
): Operation[] {
  return [
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["title"],
      value: object.title,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["description"],
      value: object.description,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["startAt"],
      value: object.startAt,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["endAt"],
      value: object.endAt,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["organizer"],
      value: createRefValue(object.organizer),
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["location", "room"],
      value: object.room,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["location", "building"],
      value: object.building,
    }),
    buildOperation(replica, object.objectId, {
      type: "set.add",
      path: ["tags"],
      value: "team",
    }),
    buildOperation(replica, object.objectId, {
      type: "array.insert",
      path: ["attendees"],
      index: 0,
      value: createRefValue("user-2"),
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["metadata", "color"],
      value: object.color,
    }),
    buildOperation(replica, object.objectId, {
      type: "field.set",
      path: ["metadata", "note"],
      value: object.note,
    }),
  ];
}

function randomTimestamp(
  random: SeededRandom,
  minDurationHours = 0,
  maxDurationHours = 0,
): string {
  const day = random.int(1, 28);
  const hour = random.int(8, 18);
  const minute = random.pick([0, 15, 30, 45]);
  const start = Date.UTC(2026, 2, day, hour, minute, 0, 0);
  const durationHours =
    maxDurationHours > 0 ? random.int(minDurationHours, maxDurationHours) : 0;

  return new Date(start + durationHours * 60 * 60 * 1000).toISOString();
}

function buildRandomAction(
  object: ObjectState,
  random: SeededRandom,
): Action {
  const actions: Array<() => Action> = [
    () => {
      object.title = `Sync ${random.pick(TITLE_WORDS)} ${random.int(1, 99)}`;
      return {
        type: "field.set",
        path: ["title"],
        value: object.title,
      };
    },
    () => {
      object.description = `Agenda ${random.pick(AGENDA_WORDS)} ${random.pick(STATUS_WORDS)}`;
      return {
        type: "field.set",
        path: ["description"],
        value: object.description,
      };
    },
    () => {
      object.startAt = randomTimestamp(random);
      return {
        type: "field.set",
        path: ["startAt"],
        value: object.startAt,
      };
    },
    () => {
      object.endAt = randomTimestamp(random, 1, 4);
      return {
        type: "field.set",
        path: ["endAt"],
        value: object.endAt,
      };
    },
    () => {
      object.organizer = random.pick(USER_IDS);
      return {
        type: "field.set",
        path: ["organizer"],
        value: createRefValue(object.organizer),
      };
    },
    () => {
      object.room = random.pick(ROOMS);
      return {
        type: "field.set",
        path: ["location", "room"],
        value: object.room,
      };
    },
    () => {
      object.building = random.pick(BUILDINGS);
      return {
        type: "field.set",
        path: ["location", "building"],
        value: object.building,
      };
    },
    () => {
      object.color = random.pick(COLORS);
      return {
        type: "field.set",
        path: ["metadata", "color"],
        value: object.color,
      };
    },
    () => {
      object.note = `note-${random.pick(NOTE_WORDS)}-${random.int(1, 500)}`;
      return {
        type: "field.set",
        path: ["metadata", "note"],
        value: object.note,
      };
    },
    () => {
      const tag = random.pick(TAGS);
      object.tags.add(tag);
      return {
        type: "set.add",
        path: ["tags"],
        value: tag,
      };
    },
    () => {
      if (object.tags.size > 0 && random.chance(0.7)) {
        const tag = random.pick([...object.tags]);
        object.tags.delete(tag);
        return {
          type: "set.remove",
          path: ["tags"],
          value: tag,
        };
      }

      const tag = random.pick(TAGS);
      object.tags.add(tag);
      return {
        type: "set.add",
        path: ["tags"],
        value: tag,
      };
    },
    () => {
      const attendeeId = random.pick(USER_IDS);
      const index = random.int(0, object.attendeeCount);
      object.attendeeCount += 1;
      return {
        type: "array.insert",
        path: ["attendees"],
        index,
        value: createRefValue(attendeeId),
      };
    },
  ];

  return random.pick(actions)();
}

function maybeExchangeKnowledge(
  replicas: Map<string, ReplicaState>,
  replicaIds: readonly string[],
  random: SeededRandom,
): void {
  if (replicaIds.length < 2 || !random.chance(0.2)) {
    return;
  }

  const sourceId = random.pick(replicaIds);
  const targetCandidates = replicaIds.filter((replicaId) => replicaId !== sourceId);

  if (targetCandidates.length === 0) {
    return;
  }

  const targetId = random.pick(targetCandidates);
  const source = replicas.get(sourceId)!;
  const target = replicas.get(targetId)!;

  mergeClock(target.clock, source.clock);

  if (random.chance(0.5)) {
    mergeClock(source.clock, target.clock);
  }
}

function formatLogTimestamp(date: Date): string {
  return date.toISOString();
}

async function persistChunk(
  store: PostgresOperationStore,
  operations: Operation[],
  totalPersisted: number,
): Promise<number> {
  if (operations.length === 0) {
    return totalPersisted;
  }

  await store.persistOperationBatch(operations);

  const nextTotal = totalPersisted + operations.length;
  console.log(`[${formatLogTimestamp(new Date())}] Total committed: ${nextTotal}`);

  operations.length = 0;
  return nextTotal;
}

async function main(): Promise<void> {
  const config = loadWorkloadConfig();
  const random = new SeededRandom(config.seed);
  const replicaIds = createReplicaIds(config.replicaCount);
  const replicas = createReplicaStates(replicaIds);
  const objects = createObjectStates(config.objectCount);
  const store = new PostgresOperationStore({
    database: process.env.PGDATABASE ?? "crdt_lab",
    host: process.env.PGHOST ?? "127.0.0.1",
    password: process.env.PGPASSWORD ?? "crdt",
    port: readPositiveInt("PGPORT", 55432),
    user: process.env.PGUSER ?? "crdt",
  });

  const pendingOperations: Operation[] = [];
  let totalPersisted = 0;

  try {
    await store.ensureReferences({
      objectIds: objects.map((object) => object.objectId),
      replicaIds,
    });

    const bootstrapReplica = replicas.get(replicaIds[0]!)!;

    for (const object of objects) {
      pendingOperations.push(...createBootstrapOperations(bootstrapReplica, object));
    }

    while (pendingOperations.length >= config.persistChunkSize) {
      totalPersisted = await persistChunk(
        store,
        pendingOperations.splice(0, config.persistChunkSize),
        totalPersisted,
      );
    }

    while (totalPersisted + pendingOperations.length < config.targetOperations) {
      const object = random.pick(objects);
      const replica = replicas.get(random.pick(replicaIds))!;
      const action = buildRandomAction(object, random);

      pendingOperations.push(buildOperation(replica, object.objectId, action));

      maybeExchangeKnowledge(replicas, replicaIds, random);

      while (pendingOperations.length >= config.persistChunkSize) {
        totalPersisted = await persistChunk(
          store,
          pendingOperations.splice(0, config.persistChunkSize),
          totalPersisted,
        );
      }
    }

    if (pendingOperations.length > 0) {
      totalPersisted = await persistChunk(store, pendingOperations, totalPersisted);
    }

    console.log("PostgreSQL workload generated");
    console.log(`Seed: ${config.seed}`);
    console.log(`Replicas: ${replicaIds.length}`);
    console.log(`Objects: ${objects.length}`);
    console.log(`Target operations: ${config.targetOperations}`);
    console.log(`Operations committed: ${totalPersisted}`);
    console.log(`Sample object: ${objects[0]!.objectId}`);
    console.dir(
      {
        attendees: objects[0]!.attendeeCount,
        description: objects[0]!.description,
        endAt: objects[0]!.endAt,
        location: {
          building: objects[0]!.building,
          room: objects[0]!.room,
        },
        metadata: {
          color: objects[0]!.color,
          note: objects[0]!.note,
        },
        organizer: objects[0]!.organizer,
        startAt: objects[0]!.startAt,
        tags: [...objects[0]!.tags],
        title: objects[0]!.title,
      },
      { depth: null },
    );
  } finally {
    await store.close();
  }
}

const TITLE_WORDS = [
  "Planning",
  "Review",
  "Standup",
  "Retro",
  "Sync",
  "Workshop",
] as const;

const AGENDA_WORDS = [
  "roadmap",
  "integration",
  "release",
  "quality",
  "migration",
  "reporting",
] as const;

const STATUS_WORDS = [
  "draft",
  "updated",
  "confirmed",
  "rescheduled",
  "expanded",
  "trimmed",
] as const;

const NOTE_WORDS = [
  "followup",
  "risk",
  "owner",
  "decision",
  "parking",
  "deadline",
] as const;

const ROOMS = [
  "A-101",
  "A-204",
  "B-205",
  "B-312",
  "C-110",
  "Zoom-1",
] as const;

const BUILDINGS = ["HQ", "North", "South", "Remote", "Campus-2"] as const;
const COLORS = ["blue", "green", "orange", "red", "yellow", "gray"] as const;
const TAGS = ["team", "urgent", "customer", "ops", "design", "backend"] as const;
const USER_IDS = [
  "user-1",
  "user-2",
  "user-3",
  "user-4",
  "user-5",
  "user-6",
] as const;

main().catch((error) => {
  console.error("Workload generation failed");
  console.error(error);
  process.exitCode = 1;
});
