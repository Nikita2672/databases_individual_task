package ru.yandex.zen.devel.ssokolviak;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import ru.yandex.zen.common.configs.properties.PropertiesX;
import ru.yandex.zen.mains.ZenMainSupportNoArgs;
import ru.yandex.zen.yt.YtClients;
import ru.yandex.zen.yt.ZenYtCluster;
import ru.yandex.zen.yt.dyntable.rpc.YtRpcClients;

/**
 * @author ndivanov
 */
public class MainYt extends ZenMainSupportNoArgs {
    private static final Logger logger = LoggerFactory.getLogger(MainYt.class);
    private static final String TABLE_NAME = "alerts";

    public static void main(String[] args) {
        new MainYt().run();
    }

    @Override
    public void runMain(PropertiesX properties) {
        // Раскомментировать нужное:
        // generateAndPrintOperations();
        runQueryBenchmarks();
        System.out.println("End program");
    }

    private void generateAndPrintOperations() {
        // Configuration: 10 replicas, 10 objects, 10000 operations per object = 1,000,000 total
        int replicaCount = 10;
        int objectCount = 10;
        int operationsPerObject = 100000;
        int batchSize = 10000;
        long seed = 44L;

        int totalOperations = objectCount * operationsPerObject;

        System.out.println("\n=== Generating and Saving Epistyl CRDT Operations ===");
        System.out.println("Configuration:");
        System.out.println("  Replicas: " + replicaCount);
        System.out.println("  Objects: " + objectCount);
        System.out.println("  Operations per object: " + operationsPerObject);
        System.out.println("  Total operations: " + totalOperations);
        System.out.println("  Batch size: " + batchSize);
        System.out.println();

        // Create generator
        OperationGenerator generator = new OperationGenerator(objectCount, replicaCount, operationsPerObject, seed);

        // Create DAO for saving to YT
        FullYtClientsPack pack = new FullYtClientsPack("n.d.ivanov", ZenYtCluster.MIRANDA);
        YtClients ytClients = pack.getYtClients();
        YtRpcClients ytRpcClients = pack.getYtRpcClients();
        OperationDao operationDao = new OperationDao(ytClients, ytRpcClients);

        // Track start time for progress reporting
        long startTime = System.currentTimeMillis();

        // Generate and save with progress logging
        generator.generateAndSave(operationDao, batchSize, (saved, total) -> {
            long elapsed = System.currentTimeMillis() - startTime;
            double percent = 100.0 * saved / total;
            double opsPerSec = saved / (elapsed / 1000.0);

            System.out.printf("[%s] Saved %,d/%,d operations (%.1f%%) - %.0f ops/sec%n",
                    formatDuration(elapsed), saved, total, percent, opsPerSec);
        });

        long totalTime = System.currentTimeMillis() - startTime;
        System.out.println();
        System.out.println("=== Completed ===");
        System.out.printf("Total: %,d operations saved in %s%n", totalOperations, formatDuration(totalTime));
        System.out.printf("Average speed: %.0f ops/sec%n", totalOperations / (totalTime / 1000.0));
    }

    private String formatDuration(long millis) {
        long seconds = millis / 1000;
        long minutes = seconds / 60;
        seconds = seconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    private void runQueryBenchmarks() {
        System.out.println("\n=== Query Benchmarks ===\n");

        // Create DAO
        FullYtClientsPack pack = new FullYtClientsPack("n.d.ivanov", ZenYtCluster.MIRANDA);
        YtClients ytClients = pack.getYtClients();
        YtRpcClients ytRpcClients = pack.getYtRpcClients();
        OperationDao operationDao = new OperationDao(ytClients, ytRpcClients);

        // Test data
        String objectId = "event-0";
        String replicaId = "replica-1";
        String txId = "replica-1:tx:1000";

        // 1. findByObjectId
        long start = System.currentTimeMillis();
        List<OperationDao.Entry> result1 = operationDao.findByObjectId(objectId);
        System.out.printf("[1] findByObjectId: %d ms, %d entries%n",
                System.currentTimeMillis() - start, result1.size());

        // 2. findByObjectAndReplica
        start = System.currentTimeMillis();
        List<OperationDao.Entry> result2 = operationDao.findByObjectAndReplica(objectId, replicaId);
        System.out.printf("[2] findByObjectAndReplica: %d ms, %d entries%n",
                System.currentTimeMillis() - start, result2.size());

        // 3. findByObjectReplicaAndTx
        start = System.currentTimeMillis();
        List<OperationDao.Entry> result3 = operationDao.findByObjectReplicaAndTx(objectId, replicaId, txId);
        System.out.printf("[3] findByObjectReplicaAndTx: %d ms, %d entries%n",
                System.currentTimeMillis() - start, result3.size());

        // 4. findByObjectIdAndPath (title)
        start = System.currentTimeMillis();
        List<OperationDao.Entry> result4 = operationDao.findByObjectIdAndPath(objectId, List.of(objectId, "title"));
        System.out.printf("[4] findByObjectIdAndPath(title): %d ms, %d entries%n",
                System.currentTimeMillis() - start, result4.size());

        // 5. findByObjectIdAndPath (participants)
        start = System.currentTimeMillis();
        List<OperationDao.Entry> result5 = operationDao.findByObjectIdAndPath(objectId, List.of(objectId, "participants"));
        System.out.printf("[5] findByObjectIdAndPath(participants): %d ms, %d entries%n",
                System.currentTimeMillis() - start, result5.size());

        System.out.println("\n=== Done ===");
    }
}
