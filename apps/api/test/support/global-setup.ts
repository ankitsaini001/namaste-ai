import { MongoDBContainer, type StartedMongoDBContainer } from '@testcontainers/mongodb';

let container: StartedMongoDBContainer | undefined;

/** Starts one throwaway MongoDB replica set for all database tests (needs Docker). */
export async function setup(): Promise<void> {
  container = await new MongoDBContainer('mongo:8.0').start();
  // Test workers start after this and inherit the environment.
  process.env.TEST_MONGO_URI = container.getConnectionString();
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
