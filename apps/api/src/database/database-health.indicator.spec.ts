import { type Connection, ConnectionStates } from 'mongoose';
import { DatabaseHealthIndicator } from './database-health.indicator';

function indicatorFor(readyState: ConnectionStates, ping?: () => Promise<unknown>) {
  const connection = {
    readyState,
    db: ping ? { admin: () => ({ ping }) } : undefined,
  } as unknown as Connection;
  return new DatabaseHealthIndicator(connection);
}

describe('DatabaseHealthIndicator', () => {
  it('is down when not connected', async () => {
    await expect(indicatorFor(ConnectionStates.disconnected).isUp()).resolves.toBe(false);
  });

  it('is up when connected and the ping succeeds', async () => {
    const indicator = indicatorFor(ConnectionStates.connected, () => Promise.resolve({ ok: 1 }));
    await expect(indicator.isUp()).resolves.toBe(true);
  });

  it('is down when the ping fails', async () => {
    const indicator = indicatorFor(ConnectionStates.connected, () =>
      Promise.reject(new Error('no primary')),
    );
    await expect(indicator.isUp()).resolves.toBe(false);
  });

  it('is down when the ping takes longer than the timeout', async () => {
    const indicator = indicatorFor(ConnectionStates.connected, () => new Promise(() => {}));
    await expect(indicator.isUp(20)).resolves.toBe(false);
  });
});
