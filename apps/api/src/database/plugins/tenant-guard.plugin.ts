import type { Query, Schema } from 'mongoose';

declare module 'mongoose' {
  interface QueryOptions {
    /** Deliberate cross-wedding or lookup-by-code query. Rare; each use is commented and reviewed. */
    skipTenantGuard?: boolean;
  }
  interface AggregateOptions {
    skipTenantGuard?: boolean;
  }
}

const QUERY_HOOKS = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
] as const;

/**
 * The tenancy safety net (System Design §10.2, Database Design §16.1): refuses any query on wedding
 * data that doesn't filter by `weddingId`, so one family's data can never leak into another's.
 * Applied to every collection that belongs to a wedding.
 */
export function tenantGuard(schema: Schema): void {
  schema.pre<Query<unknown, unknown>>([...QUERY_HOOKS], function () {
    if (this.getFilter().weddingId == null && !this.getOptions().skipTenantGuard) {
      throw new Error(`Unscoped query on ${this.model.modelName}: filter by weddingId`);
    }
  });

  schema.pre('aggregate', function () {
    const first = this.pipeline()[0] as { $match?: { weddingId?: unknown } } | undefined;
    if (first?.$match?.weddingId == null && !this.options.skipTenantGuard) {
      throw new Error('Aggregate on wedding data must start with $match on weddingId');
    }
  });
}
