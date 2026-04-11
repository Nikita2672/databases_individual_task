# EXPLAIN ANALYZE Commands

Ниже сохранен точный список команд, которые использовались для проверки датасета и запуска `EXPLAIN ANALYZE` по PostgreSQL-части.

1. Проверка версии `psql`

```bash
psql --version
```

2. Размеры таблиц

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT (SELECT count(*) FROM operations) AS operations_count, (SELECT count(*) FROM objects) AS objects_count, (SELECT count(*) FROM replicas) AS replicas_count;"
```

3. Топ объектов по числу операций

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT object_id, count(*) AS cnt FROM operations GROUP BY object_id ORDER BY cnt DESC LIMIT 3;"
```

4. Топ реплик по числу операций

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT replica_id, count(*) AS cnt FROM operations GROUP BY replica_id ORDER BY cnt DESC LIMIT 3;"
```

5. Примеры `tx_id`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT tx_id FROM operations ORDER BY random() LIMIT 3;"
```

6. Распределение по типам действий

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT action->>'type' AS action_type, count(*) AS cnt FROM operations GROUP BY action_type ORDER BY cnt DESC;"
```

7. Примеры `field.set`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT action FROM operations WHERE action->>'type' = 'field.set' LIMIT 3;"
```

8. `EXPLAIN ANALYZE` для истории объекта

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, clock, action FROM operations WHERE object_id = 'event-7' ORDER BY op_id;"
```

9. `EXPLAIN ANALYZE` для операций транзакции

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, clock, action FROM operations WHERE tx_id = 'R3:tx:238257' ORDER BY op_id;"
```

10. `EXPLAIN ANALYZE` для операций реплики

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, clock, action FROM operations WHERE replica_id = 'R2' ORDER BY op_id;"
```

11. `EXPLAIN ANALYZE` для поиска по `op_id`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, clock FROM operations WHERE op_id = 'R3:238257';"
```

12. `EXPLAIN ANALYZE` для частого `action.type`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, action FROM operations WHERE action ->> 'type' = 'field.set' ORDER BY op_id;"
```

13. `EXPLAIN ANALYZE` для JSONB payload fragment

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, action FROM operations WHERE action @> '{\"type\":\"field.set\",\"path\":[\"title\"]}'::jsonb ORDER BY op_id;"
```

14. `EXPLAIN ANALYZE` для JSONB clock fragment

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, clock FROM operations WHERE clock @> '{\"R1\": 1000}'::jsonb ORDER BY op_id LIMIT 100;"
```

15. `EXPLAIN ANALYZE` для `INSERT` с `ROLLBACK`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "BEGIN; EXPLAIN (ANALYZE, BUFFERS) INSERT INTO operations (op_id, tx_id, object_id, replica_id, clock, action) VALUES ('EXPLAIN:op:1', 'EXPLAIN:tx:1', 'event-1', 'R1', '{\"R1\": 1000001}'::jsonb, '{\"type\":\"field.set\",\"path\":[\"title\"],\"value\":\"Explain Title\"}'::jsonb); ROLLBACK;"
```

16. `EXPLAIN ANALYZE` для селективного `action.type`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "EXPLAIN (ANALYZE, BUFFERS) SELECT op_id, tx_id, object_id, replica_id, action FROM operations WHERE action ->> 'type' = 'set.remove' ORDER BY op_id;"
```

17. Опорный `op_id`

```bash
PGPASSWORD=crdt psql -h 127.0.0.1 -p 55432 -U crdt -d crdt_lab -c "SELECT op_id FROM operations ORDER BY op_id LIMIT 1;"
```
