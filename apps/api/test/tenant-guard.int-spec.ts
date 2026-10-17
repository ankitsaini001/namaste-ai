import mongoose, { type Connection, type Model, Schema, Types } from 'mongoose';
import { tenantGuard } from '../src/database/plugins/tenant-guard.plugin';
import { testMongoUri } from './support/test-db';

describe('tenant guard (System Design §10.2)', () => {
  let connection: Connection;
  let Things: Model<{ weddingId: Types.ObjectId; name: string }>;
  const weddingId = new Types.ObjectId();
  const otherWedding = new Types.ObjectId();

  beforeAll(async () => {
    connection = await mongoose.createConnection(testMongoUri()).asPromise();
    const schema = new Schema({
      weddingId: { type: Schema.Types.ObjectId, required: true },
      name: String,
    });
    schema.plugin(tenantGuard);
    Things = connection.model<{ weddingId: Types.ObjectId; name: string }>('Thing', schema);
    await Things.create([
      { weddingId, name: 'ours' },
      { weddingId: otherWedding, name: 'theirs' },
    ]);
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
  });

  it.each([
    ['find', () => Things.find({ name: 'ours' })],
    ['findOne', () => Things.findOne({ name: 'ours' })],
    ['findById', () => Things.findById(new Types.ObjectId())],
    ['countDocuments', () => Things.countDocuments({})],
    ['updateOne', () => Things.updateOne({ name: 'ours' }, { name: 'x' })],
    ['updateMany', () => Things.updateMany({}, { name: 'x' })],
    ['deleteMany', () => Things.deleteMany({})],
    ['findOneAndUpdate', () => Things.findOneAndUpdate({ name: 'ours' }, { name: 'x' })],
    ['distinct', () => Things.distinct('name')],
    ['a null weddingId', () => Things.find({ weddingId: null })],
  ])('refuses %s without weddingId', async (_label, run) => {
    await expect(run()).rejects.toThrow(/Unscoped query on Thing/);
  });

  it('allows queries scoped to a wedding, and returns only that wedding’s data', async () => {
    const found = await Things.find({ weddingId });
    expect(found.map((t) => t.name)).toEqual(['ours']);
  });

  it('allows a deliberate, commented exemption', async () => {
    const found = await Things.findOne({ name: 'theirs' }).setOptions({ skipTenantGuard: true });
    expect(found?.name).toBe('theirs');
  });

  it('requires aggregates to start with $match on weddingId', async () => {
    await expect(Things.aggregate([{ $match: { name: 'ours' } }])).rejects.toThrow(
      /\$match on weddingId/,
    );
    await expect(Things.aggregate([{ $match: { weddingId } }, { $count: 'n' }])).resolves.toEqual([
      { n: 1 },
    ]);
  });
});
