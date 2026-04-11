import { CalendarEventHarness } from "./calendar/Calendar.js";

function main(): void {
  const replicaA = new CalendarEventHarness({
    replicaId: "A",
    objectId: "event-smoke-1",
  }).bootstrapBaseEvent();

  const replicaB = new CalendarEventHarness({
    replicaId: "B",
    objectId: "event-smoke-1",
  }).mergeFrom(replicaA, "B");

  replicaA
    .setTitle("Smoke Title A")
    .addTag("smoke")
    .addAttendee("user-3");

  replicaB
    .setTitle("Smoke Title B")
    .setRoom("B-205")
    .setColor("green");

  const merged = new CalendarEventHarness({
    replicaId: "M",
    objectId: "event-smoke-1",
  })
    .replaceReplica(replicaA.replica)
    .mergeFrom(replicaB, "M");

  const operations =
    merged.replica.objects[merged.getObjectId()]?.operations ?? [];

  console.log("Smoke scenario completed");
  console.log(`Object: ${merged.getObjectId()}`);
  console.log(`Total operations in merged history: ${operations.length}`);
  console.log("Current view:");
  console.dir(merged.view(), { depth: null });
}

main();
