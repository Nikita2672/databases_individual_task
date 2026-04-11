# MongoDB Storage Sandbox

Данный раздел описывает автономное окружение MongoDB, используемое для документно-ориентированного моделирования данных библиотеки `@gvsem/epistyl`.

## Start

```bash
docker compose -f mongodb/compose.yaml up -d
```

## Stop

```bash
docker compose -f mongodb/compose.yaml down
```

## Connection

- host: `localhost`
- port: `57017`
- database: `crdt_lab`
- user: `root`
- password: `root`

## Collections

В текущем варианте используются следующие коллекции:

- `objects`

MongoDB-инициализация коллекций и индексов задается в `initdb/001_init.js`.

## 1. Goal And Scope

MongoDB рассматривается как документно-ориентированная альтернатива PostgreSQL для хранения того же библиотечного контракта. Если в PostgreSQL центральной единицей хранения была отдельная операция, то здесь исследуется модель, в которой история конкретного объекта хранится как один документ.

MongoDB-модель должна точно соответствовать фактическим типам библиотеки: дополнительные доменные поля в схему не вводятся.

## 2. Library Contract

Согласно фактическим типам библиотеки, операция имеет следующую структуру:

- `opId`
- `txId`
- `objectId`
- `replicaId`
- `clock`
- `action`

Поле `clock` имеет тип `VectorClock`, то есть отображение:

- `replicaId -> counter`

Поле `action` имеет тип `Action` и может принимать одно из следующих значений:

- `field.set`
- `field.delete`
- `set.add`
- `set.remove`
- `array.insert`
- `array.remove`
- `node.initObject`
- `node.initSet`
- `node.initArray`

Следовательно, поля наподобие `wallTime`, `actionType`, `actionPath`, `dependencies`, `createdBy` или `objectType` в базовую модель не входят.

## 3. Key Difference From PostgreSQL

Ключевое отличие MongoDB-варианта от PostgreSQL состоит не в структуре операции, а в выборе единицы хранения.

В PostgreSQL:

- операция являлась основной единицей хранения;
- операции сохранялись как независимые строки таблицы `operations`.

В MongoDB:

- корневой объект является основной единицей хранения;
- операции сохраняются как встроенный массив внутри документа объекта.

Таким образом, контракт `Operation` остается тем же, а меняется только способ агрегирования данных в хранилище.

## 4. Chosen Document Model

Для текущего этапа принята модель `one object = one document with embedded operations`.

Документ коллекции `objects` содержит только поля, непосредственно следующие из библиотеки:

- `objectId`
- `operations`

Поле `operations` представляет собой массив документов, каждый из которых в точности соответствует типу `Operation`:

- `opId`
- `txId`
- `objectId`
- `replicaId`
- `clock`
- `action`

## 5. Logical Data Model

Логическая модель MongoDB в данном варианте сводится к одной основной сущности хранения:

- `ObjectDocument`

`ObjectDocument` объединяет:

- идентификатор объекта;
- встроенную историю операций данного объекта.

Операция в этой модели не является top-level документом, но полностью сохраняет библиотечную структуру.

## 6. Physical Collection Design

В текущей физической реализации используется одна коллекция:

- `objects`

Каждый документ коллекции `objects` имеет вид:

- `objectId: string`
- `operations: Operation[]`

Каждый элемент массива `operations` валидируется по структуре библиотечного типа `Operation`.

### 6.1 Operation Shape In MongoDB

Внутри массива `operations` каждая операция содержит:

- `opId: string`
- `txId: string`
- `objectId: string`
- `replicaId: string`
- `clock: object`
- `action: object`

На уровне MongoDB-валидации дополнительно фиксируется только то, что:

- `clock` хранится как документ;
- `action` хранится как документ;
- внутри `action` присутствует поле `type`.

Более строгая проверка конкретной структуры `action` остается ответственностью прикладного уровня, как и в PostgreSQL-варианте.

## 7. Document Schema Diagram

Для MongoDB-варианта уместнее диаграмма структуры документа, а не классическая ER-диаграмма, поскольку единицей хранения является документ объекта со встроенным массивом операций.

![MongoDB Document Schema](./resources/diagram.png)

На диаграмме отражены:

- коллекция `objects`;
- поле верхнего уровня `objectId`;
- массив `operations`;
- структура одного элемента `operations[]`, соответствующая библиотечному типу `Operation`;
- вложенные поля `clock` и `action` как документные структуры.

Диаграмма показывает один документ коллекции `objects`, содержащий `objectId` и массив `operations`.

Артефакты раздела:

- `resources/schema.puml` — исходник диаграммы структуры документа в `PlantUML`
- `resources/diagram.png` — экспортированное изображение диаграммы структуры документа

## 8. Model Rationale

Преимущества модели:

- поля `clock` и `action` естественно представимы как вложенные документы;
- полная история объекта может быть прочитана из одного документа без отдельной коллекции операций.

Ограничения модели:

- документ MongoDB ограничен размером `16 MB`;
- большие массивы `operations` удорожают обновление документа;
- глобальные выборки по операциям через все объекты менее естественны, чем в PostgreSQL.

Итог: MongoDB в данной постановке следует рассматривать как объектно-центричную альтернативу реляционному append-only журналу, а не как универсальную замену ему.

## 9. Implementation Plan

Для практической реализации выбранной модели необходимо выполнить следующие шаги:

1. Создать коллекцию `objects` с валидатором, требующим наличие полей `objectId` и `operations`.
2. Зафиксировать внутри валидатора структуру операций в соответствии с библиотечным типом `Operation`.
3. Добавить индексы по `objectId`, `operations.opId` и `operations.replicaId`.
4. Подготовить генератор данных, создающий документы объектов со встроенными массивами операций.
5. Выполнить замеры через `explain("executionStats")` для основных MongoDB-запросов.
6. Сопоставить результаты с PostgreSQL и определить, в каких сценариях агрегатное документное хранение оказывается более или менее удачным.

## 10. Planned Query Scenarios

Для данной модели естественными являются следующие сценарии:

- получение документа объекта по `objectId`;
- получение полной встроенной истории конкретного объекта;
- поиск объекта, содержащего операцию с конкретным `opId`;
- поиск объектов, содержащих операции конкретной реплики;
- выборка объектов, в истории которых присутствуют операции с определенным `action.type`.

В отличие от PostgreSQL, в фокусе здесь находится документ объекта, а не top-level operation log.

## 11. Indexing Direction

Для выбранной модели на текущем этапе предусмотрены следующие индексы:

- уникальный индекс по `objectId`;
- индекс по `operations.opId`;
- индекс по `operations.replicaId`;
- индекс по `operations.action.type`.

Такой набор отражает главную особенность модели: индексируются вложенные поля массива операций, а не отдельная коллекция операций.

## 12. Explain("executionStats")

Основные характеристики набора данных:

- количество документов в `objects`: `10000`
- минимальное число операций в документе: `12`
- максимальное число операций в документе: `1000`
- среднее число операций в документе: `507.7832`

На основании среднего значения суммарное число встроенных операций можно оценить примерно в `5,077,832`.

Для замеров использовались следующие репрезентативные значения:

- `objectId = "event-3299"`
- `opId = "R1:365809"`
- `replicaId = "R5"`
- `action.type = "field.set"`

### 12.1 Find Object By objectId

Команда:

```javascript
db.objects.find({ objectId: "event-3299" }).explain("executionStats")
```

Наблюдение:

- используется индекс `uq_object_id`
- план: `IXSCAN -> FETCH`
- `totalKeysExamined = 1`
- `totalDocsExamined = 1`

Вывод:

- поиск по `objectId` полностью поддерживается уникальным индексом;
- это один из наиболее естественных сценариев чтения для данной модели.

### 12.2 Read Full Embedded History For Object

Команда:

```javascript
db.objects.find(
  { objectId: "event-3299" },
  { _id: 0, operations: 1 }
).explain("executionStats")
```

Наблюдение:

- используется индекс `uq_object_id`
- далее выполняется чтение одного найденного документа
- `totalKeysExamined = 1`
- `totalDocsExamined = 1`
- `executionTimeMillis = 2`

Вывод:

- получение полной истории объекта сводится к чтению одного документа.

### 12.3 Find Object By Embedded operations.opId

Команда:

```javascript
db.objects.find(
  { "operations.opId": "R1:365809" },
  { _id: 0, objectId: 1 }
).explain("executionStats")
```

Наблюдение:

- используется multikey index `idx_operations_op_id`
- план: `IXSCAN -> FETCH -> PROJECTION_SIMPLE`
- `totalKeysExamined = 1`
- `totalDocsExamined = 1`

Вывод:

- поиск объекта по встроенному `opId` работает эффективно;
- индекс по `operations.opId` оправдан.

### 12.4 Find Objects By Embedded operations.replicaId

Команда:

```javascript
db.objects.find(
  { "operations.replicaId": "R5" },
  { _id: 0, objectId: 1 }
).limit(100).explain("executionStats")
```

Наблюдение:

- используется multikey index `idx_operations_replica_id`
- план: `IXSCAN -> FETCH -> PROJECTION_SIMPLE -> LIMIT`
- `totalKeysExamined = 100`
- `totalDocsExamined = 100`

Вывод:

- индекс по `operations.replicaId` используется корректно;
- этот сценарий менее естественен для embedded-модели, чем запросы по самому объекту.

### 12.5 Find Objects By Embedded operations.action.type

Команда:

```javascript
db.objects.find(
  { "operations.action.type": "field.set" },
  { _id: 0, objectId: 1 }
).limit(100).explain("executionStats")
```

Наблюдение:

- используется multikey index `idx_operations_action_type`
- план: `IXSCAN -> FETCH -> PROJECTION_SIMPLE -> LIMIT`
- `totalKeysExamined = 100`
- `totalDocsExamined = 100`

Вывод:

- индекс по `operations.action.type` используется корректно.

### 12.6 Read Last Operations By $slice

Команда:

```javascript
db.objects.find(
  { objectId: "event-3299" },
  { _id: 0, operations: { $slice: -10 } }
).explain("executionStats")
```

Наблюдение:

- используется индекс `uq_object_id`
- план: `IXSCAN -> FETCH -> PROJECTION_DEFAULT`
- `totalKeysExamined = 1`
- `totalDocsExamined = 1`
- `executionTimeMillis = 4`

Вывод:

- чтение последних операций через `$slice` хорошо соответствует embedded-модели.

### 12.7 Commands Used

Полный список команд вынесен в `resources/explain_execution_stats_commands.md`.

## 13. Preliminary Assessment

MongoDB в выбранной embedded-модели хорошо подходит для объектно-центричных сценариев чтения: поиск по `objectId`, чтение полной истории объекта и получение последних операций через `$slice` выполняются естественно и эффективно. Индексы по вложенным полям `operations.opId`, `operations.replicaId` и `operations.action.type` также используются корректно.

Основное ограничение остается прежним: базовой единицей хранения является объект, а не операция. Поэтому глобальные выборки по операциям через весь датасет и очень длинные истории объектов выглядят менее естественно, чем в PostgreSQL.
