package ru.yandex.zen.devel.ssokolviak;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.function.BiConsumer;

import ru.yandex.inside.yt.kosher.impl.ytree.builder.YTree;
import ru.yandex.inside.yt.kosher.ytree.YTreeNode;

/**
 * Generator for Epistyl CRDT operations in calendar domain.
 * Generates realistic operations for calendar events with proper vector clocks.
 *
 * @author n.d.ivanov
 */
public class OperationGenerator {

    private final int objectCount;
    private final int replicaCount;
    private final int operationsPerObject;
    private final Random random;

    // Calendar domain data
    private static final String[] EVENT_TITLES = {
            "Team Sync",
            "Sprint Planning",
            "Retrospective",
            "1:1 with Manager",
            "Code Review",
            "Architecture Discussion",
            "Client Call",
            "Interview",
            "Lunch Meeting",
            "Training Session",
            "All Hands",
            "Demo Day",
            "Release Planning",
            "Bug Triage",
            "Design Review"
    };

    private static final String[] LOCATIONS = {
            "Conference Room A",
            "Conference Room B",
            "Zoom",
            "Google Meet",
            "Office 301",
            "Cafeteria",
            "Remote",
            "Building 5, Floor 2"
    };

    private static final String[] STATUSES = {
            "confirmed",
            "tentative",
            "cancelled"
    };

    private static final String[] PARTICIPANTS = {
            "user@example.com",
            "REDACTED__N8__",
            "REDACTED__N9__",
            "REDACTED__N10__",
            "REDACTED__N11__",
            "REDACTED__N12__",
            "REDACTED__N13__",
            "REDACTED__N14__"
    };

    private static final String[] REMINDERS = {
            "5 min before",
            "15 min before",
            "30 min before",
            "1 hour before",
            "1 day before"
    };

    private static final String[] FIELD_NAMES = {
            "title",
            "description",
            "startTime",
            "endTime",
            "location",
            "status"
    };

    public OperationGenerator(int objectCount, int replicaCount, int operationsPerObject) {
        this.objectCount = objectCount;
        this.replicaCount = replicaCount;
        this.operationsPerObject = operationsPerObject;
        this.random = new Random();
    }

    public OperationGenerator(int objectCount, int replicaCount, int operationsPerObject, long seed) {
        this.objectCount = objectCount;
        this.replicaCount = replicaCount;
        this.operationsPerObject = operationsPerObject;
        this.random = new Random(seed);
    }

    /**
     * Generate list of operations for calendar events.
     */
    public List<OperationDao.Entry> generate() {
        List<OperationDao.Entry> entries = new ArrayList<>();

        // Track vector clock state per replica
        Map<String, Long> globalClock = new HashMap<>();
        for (int r = 0; r < replicaCount; r++) {
            globalClock.put("replica-" + r, 0L);
        }

        // Generate operations for each object
        for (int obj = 0; obj < objectCount; obj++) {
            String objectId = "event-" + obj;

            // Each object gets operations from random replicas
            for (int op = 0; op < operationsPerObject; op++) {
                // Pick random replica for this operation
                int replicaIndex = random.nextInt(replicaCount);
                String replicaId = "replica-" + replicaIndex;

                // Increment clock for this replica
                long newCounter = globalClock.get(replicaId) + 1;
                globalClock.put(replicaId, newCounter);

                // Create vector clock snapshot
                Map<String, Long> clock = new HashMap<>(globalClock);

                // Generate operation key
                String txId = replicaId + ":tx:" + newCounter;
                String opId = replicaId + ":" + newCounter;

                OperationDao.Key key = new OperationDao.Key(objectId, replicaId, txId, opId);

                // Generate random action
                OperationDao.Action action = generateAction(objectId, op);

                entries.add(new OperationDao.Entry(key, clock, action));
            }
        }

        return entries;
    }

    /**
     * Generate random action for calendar event.
     */
    private OperationDao.Action generateAction(String objectId, int operationIndex) {
        // First operation for object is always init
        if (operationIndex == 0) {
            return new OperationDao.Action("node.initObject", List.of(objectId));
        }

        // Random action type with weighted distribution
        int actionType = random.nextInt(100);

        if (actionType < 50) {
            // 50% - field.set
            return generateFieldSetAction(objectId);
        } else if (actionType < 70) {
            // 20% - set.add (participants)
            return generateSetAddAction(objectId);
        } else if (actionType < 85) {
            // 15% - array.insert (reminders)
            return generateArrayInsertAction(objectId);
        } else if (actionType < 95) {
            // 10% - set.remove
            return generateSetRemoveAction(objectId);
        } else {
            // 5% - array.remove
            return generateArrayRemoveAction(objectId);
        }
    }

    private OperationDao.Action generateFieldSetAction(String objectId) {
        String fieldName = FIELD_NAMES[random.nextInt(FIELD_NAMES.length)];
        YTreeNode value = generateFieldValue(fieldName);

        return new OperationDao.Action(
                "field.set",
                List.of(objectId, fieldName),
                value
        );
    }

    private YTreeNode generateFieldValue(String fieldName) {
        String value = switch (fieldName) {
            case "title" -> EVENT_TITLES[random.nextInt(EVENT_TITLES.length)];
            case "description" -> "Meeting description #" + random.nextInt(1000);
            case "startTime" -> generateRandomTime();
            case "endTime" -> generateRandomTime();
            case "location" -> LOCATIONS[random.nextInt(LOCATIONS.length)];
            case "status" -> STATUSES[random.nextInt(STATUSES.length)];
            default -> "unknown";
        };
        return YTree.stringNode(value);
    }

    private String generateRandomTime() {
        int day = 1 + random.nextInt(28);
        int hour = 9 + random.nextInt(10);
        int minute = random.nextInt(4) * 15;
        return String.format("2026-04-%02dT%02d:%02d:00", day, hour, minute);
    }

    private OperationDao.Action generateSetAddAction(String objectId) {
        String participant = PARTICIPANTS[random.nextInt(PARTICIPANTS.length)];

        return new OperationDao.Action(
                "set.add",
                List.of(objectId, "participants"),
                YTree.stringNode(participant)
        );
    }

    private OperationDao.Action generateSetRemoveAction(String objectId) {
        String participant = PARTICIPANTS[random.nextInt(PARTICIPANTS.length)];

        return new OperationDao.Action(
                "set.remove",
                List.of(objectId, "participants"),
                YTree.stringNode(participant)
        );
    }

    private OperationDao.Action generateArrayInsertAction(String objectId) {
        String reminder = REMINDERS[random.nextInt(REMINDERS.length)];
        long index = random.nextInt(5);

        return new OperationDao.Action(
                "array.insert",
                List.of(objectId, "reminders"),
                YTree.stringNode(reminder),
                index
        );
    }

    private OperationDao.Action generateArrayRemoveAction(String objectId) {
        long index = random.nextInt(5);

        return new OperationDao.Action(
                "array.remove",
                List.of(objectId, "reminders"),
                (YTreeNode) null,
                index
        );
    }

    /**
     * Generate and save operations in batches with progress logging.
     * Memory-efficient: doesn't store all operations in memory at once.
     *
     * @param dao OperationDao for saving operations
     * @param batchSize Number of operations per batch (e.g., 10000)
     * @param progressLogger Callback for progress updates: (savedCount, totalCount)
     */
    public void generateAndSave(OperationDao dao, int batchSize, BiConsumer<Integer, Integer> progressLogger) {
        int totalOperations = objectCount * operationsPerObject;
        int savedCount = 0;

        // Track vector clock state per replica
        Map<String, Long> globalClock = new HashMap<>();
        for (int r = 0; r < replicaCount; r++) {
            globalClock.put("replica-" + r, 0L);
        }

        List<OperationDao.Entry> batch = new ArrayList<>(batchSize);

        // Generate operations for each object
        for (int obj = 0; obj < objectCount; obj++) {
            String objectId = "event-" + obj;

            // Each object gets operations from random replicas
            for (int op = 0; op < operationsPerObject; op++) {
                // Pick random replica for this operation
                int replicaIndex = random.nextInt(replicaCount);
                String replicaId = "replica-" + replicaIndex;

                // Increment clock for this replica
                long newCounter = globalClock.get(replicaId) + 1;
                globalClock.put(replicaId, newCounter);

                // Create vector clock snapshot
                Map<String, Long> clock = new HashMap<>(globalClock);

                // Generate operation key
                String txId = replicaId + ":tx:" + newCounter;
                String opId = replicaId + ":" + newCounter;

                OperationDao.Key key = new OperationDao.Key(objectId, replicaId, txId, opId);

                // Generate random action
                OperationDao.Action action = generateAction(objectId, op);

                batch.add(new OperationDao.Entry(key, clock, action));

                // Save batch when full
                if (batch.size() >= batchSize) {
                    dao.insert(batch);
                    savedCount += batch.size();
                    progressLogger.accept(savedCount, totalOperations);
                    batch.clear();
                }
            }
        }

        // Save remaining operations
        if (!batch.isEmpty()) {
            dao.insert(batch);
            savedCount += batch.size();
            progressLogger.accept(savedCount, totalOperations);
        }
    }

    /**
     * Get total number of operations that will be generated.
     */
    public int getTotalOperations() {
        return objectCount * operationsPerObject;
    }

    /**
     * Get statistics about generated operations.
     */
    public String getStatistics(List<OperationDao.Entry> entries) {
        Map<String, Integer> actionCounts = new HashMap<>();
        Map<String, Integer> objectCounts = new HashMap<>();
        Map<String, Integer> replicaCounts = new HashMap<>();

        for (OperationDao.Entry entry : entries) {
            String actionType = entry.getAction().getType();
            actionCounts.merge(actionType, 1, Integer::sum);

            String objectId = entry.getKey().getObjectId();
            objectCounts.merge(objectId, 1, Integer::sum);

            String replicaId = entry.getKey().getReplicaId();
            replicaCounts.merge(replicaId, 1, Integer::sum);
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== Operation Generation Statistics ===\n");
        sb.append("Total operations: ").append(entries.size()).append("\n");
        sb.append("Unique objects: ").append(objectCounts.size()).append("\n");
        sb.append("Unique replicas: ").append(replicaCounts.size()).append("\n");
        sb.append("\nAction types:\n");
        actionCounts.forEach((type, count) ->
                sb.append(String.format("  %s: %d (%.1f%%)\n", type, count, 100.0 * count / entries.size())));
        sb.append("\nOperations per object:\n");
        objectCounts.forEach((obj, count) ->
                sb.append("  ").append(obj).append(": ").append(count).append("\n"));

        return sb.toString();
    }
}