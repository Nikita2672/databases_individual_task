import { MongoClient } from "mongodb";
import type { Action, Operation } from "@gvsem/epistyl";

export interface ObjectDocument {
  objectId: string;
  operations: Operation[];
}

export class MongoObjectStore {
  private readonly client: MongoClient;
  private readonly databaseName: string;

  constructor(uri: string, databaseName: string) {
    this.client = new MongoClient(uri);
    this.databaseName = databaseName;
  }

  async connect(): Promise<void> {
    await this.client.connect();
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  async replaceObjects(batch: readonly ObjectDocument[]): Promise<void> {
    if (batch.length === 0) {
      return;
    }

    const collection = this.client
      .db(this.databaseName)
      .collection<ObjectDocument>("objects");

    await collection.bulkWrite(
      batch.map((document) => ({
        replaceOne: {
          filter: { objectId: document.objectId },
          replacement: document,
          upsert: true,
        },
      })),
      { ordered: false },
    );
  }
}

export type { Action };
