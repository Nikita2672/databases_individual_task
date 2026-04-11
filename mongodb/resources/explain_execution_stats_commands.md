# MongoDB Explain Commands

Ниже сохранен точный список основных команд, использованных для анализа MongoDB-коллекции `objects` и выполнения `explain("executionStats")`.

1. Количество документов в `objects`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval "db.objects.countDocuments()"
```

2. Документы с наибольшим числом операций

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.aggregate([{ $project: { objectId: 1, operationCount: { $size: "$operations" } } }, { $sort: { operationCount: -1 } }, { $limit: 3 }]).toArray()'
```

3. Агрегированная статистика по длине histories

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.aggregate([{ $group: { _id: null, minOps: { $min: { $size: "$operations" } }, maxOps: { $max: { $size: "$operations" } }, avgOps: { $avg: { $size: "$operations" } } } }]).toArray()'
```

4. Получение одного репрезентативного `opId`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.findOne({ objectId: "event-3299" }, { _id: 0, "operations.opId": 1 })'
```

5. `explain("executionStats")` для поиска объекта по `objectId`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ objectId: "event-3299" }).explain("executionStats")'
```

6. `explain("executionStats")` для чтения полной истории объекта

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ objectId: "event-3299" }, { _id: 0, operations: 1 }).explain("executionStats")'
```

7. `explain("executionStats")` для поиска по `operations.opId`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ "operations.opId": "R1:365809" }, { _id: 0, objectId: 1 }).explain("executionStats")'
```

8. `explain("executionStats")` для поиска по `operations.replicaId`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ "operations.replicaId": "R5" }, { _id: 0, objectId: 1 }).limit(100).explain("executionStats")'
```

9. `explain("executionStats")` для поиска по `operations.action.type`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ "operations.action.type": "field.set" }, { _id: 0, objectId: 1 }).limit(100).explain("executionStats")'
```

10. `explain("executionStats")` для чтения последних операций через `$slice`

```bash
docker exec crdt-mongodb mongosh "mongodb://root:root@127.0.0.1:27017/crdt_lab?authSource=admin" --quiet --eval 'db.objects.find({ objectId: "event-3299" }, { _id: 0, operations: { $slice: -10 } }).explain("executionStats")'
```
