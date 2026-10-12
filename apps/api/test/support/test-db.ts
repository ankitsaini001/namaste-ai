import { randomUUID } from 'node:crypto';

/** A connection string to a fresh, uniquely named database on the test MongoDB container. */
export function testMongoUri(): string {
  const base = process.env.TEST_MONGO_URI;
  if (!base) {
    throw new Error(
      'TEST_MONGO_URI is not set: run database tests through the "db" Vitest project.',
    );
  }
  const url = new URL(base);
  url.pathname = `/test_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  url.searchParams.set('directConnection', 'true');
  return url.toString();
}
