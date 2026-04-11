import {
  createReplicaState,
  issueReplicaOperation,
  observeClock,
  type Action,
  type LeafValue,
  type Operation,
  type ReplicaState,
} from "@gvsem/epistyl";
import { loadWorkloadConfig } from "./config/workload.js";
import { MongoObjectStore, type ObjectDocument } from "./mongodb/MongoObjectStore.js";

interface ObjectState {
  attendeeCount: number;
  building: string;
  color: string;
  description: string;
  endAt: string;
  note: string;
  objectId: string;
  operations: Operation[];
  organizer: string;
  room: string;
  startAt: string;
  tags: Set<string>;
  title: string;
}

type ObjectMutation = (object: ObjectState, random: SeededRandom) => Action;

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

function createReplicaIds(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `R${index + 1}`);
}

function createReplicaStates(replicaIds: readonly string[]): Map<string, ReplicaState> {
  const states = new Map<string, ReplicaState>();

  for (const replicaId of replicaIds) {
    states.set(replicaId, createReplicaState(replicaId));
  }

  return states;
}

function createRefValue(objectId: string): LeafValue {
  return {
    type: "ref",
    objectId,
  };
}

function createObjectState(index: number): ObjectState {
  return {
    attendeeCount: 1,
    building: "HQ",
    color: "blue",
    description: "Weekly planning",
    endAt: "2026-03-07T11:00:00.000Z",
    note: "base-note",
    objectId: `event-${index + 1}`,
    operations: [],
    organizer: "user-1",
    room: "A-101",
    startAt: "2026-03-07T10:00:00.000Z",
    tags: new Set(["team"]),
    title: "Team Sync",
  };
}

function pushOperation(
  replicas: Map<string, ReplicaState>,
  object: ObjectState,
  replicaId: string,
  action: Action,
): void {
  const currentReplica = replicas.get(replicaId)!;
  const issued = issueReplicaOperation(currentReplica, object.objectId, action);

  replicas.set(replicaId, issued.replica);
  object.operations.push(issued.operation);
}

function applyActions(
  replicas: Map<string, ReplicaState>,
  object: ObjectState,
  replicaId: string,
  actions: readonly Action[],
): void {
  for (const action of actions) {
    pushOperation(replicas, object, replicaId, action);
  }
}

function bootstrapObject(
  object: ObjectState,
  replicas: Map<string, ReplicaState>,
  replicaId: string,
): void {
  applyActions(replicas, object, replicaId, [
    { type: "field.set", path: ["title"], value: object.title },
    { type: "field.set", path: ["description"], value: object.description },
    { type: "field.set", path: ["startAt"], value: object.startAt },
    { type: "field.set", path: ["endAt"], value: object.endAt },
    {
      type: "field.set",
      path: ["organizer"],
      value: createRefValue(object.organizer),
    },
    { type: "field.set", path: ["location", "room"], value: object.room },
    { type: "field.set", path: ["location", "building"], value: object.building },
    { type: "set.add", path: ["tags"], value: "team" },
    {
      type: "array.insert",
      path: ["attendees"],
      index: 0,
      value: createRefValue("user-2"),
    },
    { type: "node.initObject", path: ["metadata"] },
    { type: "field.set", path: ["metadata", "color"], value: object.color },
    { type: "field.set", path: ["metadata", "note"], value: object.note },
  ]);
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

function mutateTitle(object: ObjectState, random: SeededRandom): Action {
  object.title = `Sync ${random.pick(TITLE_WORDS)} ${random.int(1, 99)}`;
  return { type: "field.set", path: ["title"], value: object.title };
}

function mutateDescription(object: ObjectState, random: SeededRandom): Action {
  object.description = `Agenda ${random.pick(AGENDA_WORDS)} ${random.pick(STATUS_WORDS)}`;
  return { type: "field.set", path: ["description"], value: object.description };
}

function mutateStartAt(object: ObjectState, random: SeededRandom): Action {
  object.startAt = randomTimestamp(random);
  return { type: "field.set", path: ["startAt"], value: object.startAt };
}

function mutateEndAt(object: ObjectState, random: SeededRandom): Action {
  object.endAt = randomTimestamp(random, 1, 4);
  return { type: "field.set", path: ["endAt"], value: object.endAt };
}

function mutateOrganizer(object: ObjectState, random: SeededRandom): Action {
  object.organizer = random.pick(USER_IDS);
  return {
    type: "field.set",
    path: ["organizer"],
    value: createRefValue(object.organizer),
  };
}

function mutateRoom(object: ObjectState, random: SeededRandom): Action {
  object.room = random.pick(ROOMS);
  return { type: "field.set", path: ["location", "room"], value: object.room };
}

function mutateBuilding(object: ObjectState, random: SeededRandom): Action {
  object.building = random.pick(BUILDINGS);
  return { type: "field.set", path: ["location", "building"], value: object.building };
}

function mutateColor(object: ObjectState, random: SeededRandom): Action {
  object.color = random.pick(COLORS);
  return { type: "field.set", path: ["metadata", "color"], value: object.color };
}

function mutateNote(object: ObjectState, random: SeededRandom): Action {
  object.note = `note-${random.pick(NOTE_WORDS)}-${random.int(1, 500)}`;
  return { type: "field.set", path: ["metadata", "note"], value: object.note };
}

function addTag(object: ObjectState, random: SeededRandom): Action {
  const tag = random.pick(TAGS);
  object.tags.add(tag);
  return { type: "set.add", path: ["tags"], value: tag };
}

function toggleTag(object: ObjectState, random: SeededRandom): Action {
  if (object.tags.size > 0 && random.chance(0.7)) {
    const tag = random.pick([...object.tags]);
    object.tags.delete(tag);
    return { type: "set.remove", path: ["tags"], value: tag };
  }

  return addTag(object, random);
}

function addAttendee(object: ObjectState, random: SeededRandom): Action {
  const attendeeId = random.pick(USER_IDS);
  const index = random.int(0, object.attendeeCount);
  object.attendeeCount += 1;

  return {
    type: "array.insert",
    path: ["attendees"],
    index,
    value: createRefValue(attendeeId),
  };
}

const OBJECT_MUTATIONS: readonly ObjectMutation[] = [
  mutateTitle,
  mutateDescription,
  mutateStartAt,
  mutateEndAt,
  mutateOrganizer,
  mutateRoom,
  mutateBuilding,
  mutateColor,
  mutateNote,
  addTag,
  toggleTag,
  addAttendee,
] as const;

function buildRandomAction(object: ObjectState, random: SeededRandom): Action {
  return random.pick(OBJECT_MUTATIONS)(object, random);
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

  replicas.set(targetId, {
    ...target,
    clockState: observeClock(target.clockState, source.clockState.clock),
  });

  if (random.chance(0.5)) {
    const nextSource = replicas.get(sourceId)!;
    const nextTarget = replicas.get(targetId)!;

    replicas.set(sourceId, {
      ...nextSource,
      clockState: observeClock(nextSource.clockState, nextTarget.clockState.clock),
    });
  }
}

function createObjectDocument(state: ObjectState): ObjectDocument {
  return {
    objectId: state.objectId,
    operations: state.operations,
  };
}

function formatLogTimestamp(date: Date): string {
  return date.toISOString();
}

async function main(): Promise<void> {
  const config = loadWorkloadConfig();
  const random = new SeededRandom(config.seed);
  const replicaIds = createReplicaIds(config.replicaCount);
  const replicas = createReplicaStates(replicaIds);
  const store = new MongoObjectStore(
    process.env.MONGO_URI ??
      "mongodb://root:root@127.0.0.1:57017/crdt_lab?authSource=admin",
    process.env.MONGO_DATABASE ?? "crdt_lab",
  );

  await store.connect();

  try {
    let totalOperations = 0;

    for (let startIndex = 0; startIndex < config.objectCount; startIndex += config.insertBatchSize) {
      const batch: ObjectDocument[] = [];
      const endIndex = Math.min(startIndex + config.insertBatchSize, config.objectCount);

      for (let index = startIndex; index < endIndex; index += 1) {
        const object = createObjectState(index);
        bootstrapObject(object, replicas, replicaIds[0]!);

        const targetOperations = random.int(
          Math.min(12, config.maxOperationsPerObject),
          config.maxOperationsPerObject,
        );

        while (object.operations.length < targetOperations) {
          const replicaId = random.pick(replicaIds);
          const action = buildRandomAction(object, random);

          pushOperation(replicas, object, replicaId, action);
          maybeExchangeKnowledge(replicas, replicaIds, random);
        }

        totalOperations += object.operations.length;
        batch.push(createObjectDocument(object));
      }

      await store.replaceObjects(batch);

      console.log(
        `[${formatLogTimestamp(new Date())}] Total objects committed: ${endIndex}, total operations generated: ${totalOperations}`,
      );
    }

    console.log("MongoDB workload generated");
    console.log(`Seed: ${config.seed}`);
    console.log(`Replicas: ${replicaIds.length}`);
    console.log(`Objects: ${config.objectCount}`);
    console.log(`Max operations per object: ${config.maxOperationsPerObject}`);
    console.log(`Insert batch size: ${config.insertBatchSize}`);
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
  console.error("MongoDB workload generation failed");
  console.error(error);
  process.exitCode = 1;
});
