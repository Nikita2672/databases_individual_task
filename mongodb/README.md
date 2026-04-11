# MongoDB Storage Sandbox

This environment starts a standalone MongoDB instance for document-oriented modeling of CRDT operation logs.

## Start

```bash
docker compose -f infra/mongodb/compose.yaml up -d
```

## Stop

```bash
docker compose -f infra/mongodb/compose.yaml down
```

## Connection

- host: `localhost`
- port: `57017`
- database: `crdt_lab`
- user: `root`
- password: `root`

## Collections

- `replicas`
- `objects`
- `operations`
- `snapshots`

The initialization script creates collection validators and indexes for common access patterns:

- unique operation lookup
- per-replica sequence validation
- per-object operation history
- snapshot retrieval by object and version

The initialization script lives in `initdb/001_init.js`.
