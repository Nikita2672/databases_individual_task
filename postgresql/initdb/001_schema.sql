CREATE TABLE replicas (
    replica_id TEXT PRIMARY KEY
);

CREATE TABLE objects (
    object_id TEXT PRIMARY KEY
);

CREATE TABLE operations (
    op_id TEXT PRIMARY KEY,
    tx_id TEXT NOT NULL,
    object_id TEXT NOT NULL REFERENCES objects(object_id) ON DELETE CASCADE,
    replica_id TEXT NOT NULL REFERENCES replicas(replica_id),
    clock JSONB NOT NULL,
    action JSONB NOT NULL,
    CONSTRAINT chk_clock_is_object CHECK (jsonb_typeof(clock) = 'object'),
    CONSTRAINT chk_action_is_object CHECK (jsonb_typeof(action) = 'object'),
    CONSTRAINT chk_action_has_type CHECK (action ? 'type')
);

CREATE INDEX idx_operations_object_id
    ON operations (object_id);

CREATE INDEX idx_operations_replica_id
    ON operations (replica_id);

CREATE INDEX idx_operations_tx_id
    ON operations (tx_id);

CREATE INDEX idx_operations_action_type
    ON operations ((action ->> 'type'));

CREATE INDEX idx_operations_clock_gin
    ON operations USING GIN (clock);

CREATE INDEX idx_operations_action_gin
    ON operations USING GIN (action);
