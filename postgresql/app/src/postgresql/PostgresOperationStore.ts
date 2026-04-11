import { Pool, type PoolConfig } from "pg";
import type { Operation } from "@gvsem/epistyl";

export class PostgresOperationStore {
  private readonly pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool(config);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  async ensureReferences(input: {
    objectIds: readonly string[];
    replicaIds: readonly string[];
  }): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await this.insertReplicas(client, input.replicaIds);
      await this.insertObjects(client, input.objectIds);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async persistOperationBatch(operations: readonly Operation[]): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      await this.insertOperations(client, operations);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertReplicas(
    client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
    replicaIds: readonly string[],
  ): Promise<void> {
    if (replicaIds.length === 0) {
      return;
    }

    await client.query(
      `
        INSERT INTO replicas (replica_id)
        SELECT DISTINCT value
        FROM unnest($1::text[]) AS source(value)
        ON CONFLICT (replica_id) DO NOTHING
      `,
      [replicaIds],
    );
  }

  private async insertObjects(
    client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
    objectIds: readonly string[],
  ): Promise<void> {
    if (objectIds.length === 0) {
      return;
    }

    await client.query(
      `
        INSERT INTO objects (object_id)
        SELECT DISTINCT value
        FROM unnest($1::text[]) AS source(value)
        ON CONFLICT (object_id) DO NOTHING
      `,
      [objectIds],
    );
  }

  private async insertOperations(
    client: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
    operations: readonly Operation[],
  ): Promise<void> {
    if (operations.length === 0) {
      return;
    }

    const batchSize = 500;

    for (let offset = 0; offset < operations.length; offset += batchSize) {
      const batch = operations.slice(offset, offset + batchSize);
      const values: string[] = [];
      const params: unknown[] = [];

      for (const operation of batch) {
        const base = params.length;

        params.push(
          operation.opId,
          operation.txId,
          operation.objectId,
          operation.replicaId,
          operation.clock,
          operation.action,
        );

        values.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}::jsonb)`,
        );
      }

      await client.query(
        `
          INSERT INTO operations (
            op_id,
            tx_id,
            object_id,
            replica_id,
            clock,
            action
          )
          VALUES ${values.join(", ")}
          ON CONFLICT (op_id) DO NOTHING
        `,
        params,
      );
    }
  }
}
