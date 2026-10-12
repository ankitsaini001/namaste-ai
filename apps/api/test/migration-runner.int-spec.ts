import mongoose, { type Connection, Schema } from 'mongoose';
import { runMigrations } from '../src/database/migration-runner';
import type { Migration } from '../src/database/migrations/migration';
import { testMongoUri } from './support/test-db';

describe('runMigrations', () => {
  let connection: Connection;
  const ran: string[] = [];
  const migration = (id: string): Migration => ({
    id,
    up: async () => {
      ran.push(id);
    },
  });

  beforeAll(async () => {
    connection = await mongoose.createConnection(testMongoUri(), { autoIndex: false }).asPromise();
    const schema = new Schema({ email: String });
    schema.index({ email: 1 }, { unique: true });
    connection.model('Thing', schema);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  it('applies pending migrations in order, records them and creates indexes', async () => {
    const result = await runMigrations(connection, [
      migration('0001_first'),
      migration('0002_second'),
    ]);
    expect(result.applied).toEqual(['0001_first', '0002_second']);
    expect(ran).toEqual(['0001_first', '0002_second']);

    const records = await connection.collection('migrations').find().toArray();
    expect(records.map((r) => r._id)).toEqual(['0001_first', '0002_second']);

    const indexes = await connection.collection('things').indexes();
    expect(indexes.some((index) => index.unique && index.key.email === 1)).toBe(true);
  });

  it('skips migrations that already ran', async () => {
    const result = await runMigrations(connection, [
      migration('0001_first'),
      migration('0002_second'),
      migration('0003_third'),
    ]);
    expect(result.applied).toEqual(['0003_third']);
    expect(ran).toEqual(['0001_first', '0002_second', '0003_third']);
  });

  it('refuses badly named or out-of-order migrations before running anything', async () => {
    await expect(runMigrations(connection, [migration('first')])).rejects.toThrow(
      /0001_snake_case/,
    );
    await expect(
      runMigrations(connection, [migration('0005_b'), migration('0004_a')]),
    ).rejects.toThrow(/out of order/);
  });
});
