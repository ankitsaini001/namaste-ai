import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { type Connection, ConnectionStates } from 'mongoose';

@Injectable()
export class DatabaseHealthIndicator {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** True when MongoDB answers a ping within `timeoutMs`. Never throws. */
  async isUp(timeoutMs = 2000): Promise<boolean> {
    const db = this.connection.db;
    if (this.connection.readyState !== ConnectionStates.connected || !db) return false;

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Database ping timed out')), timeoutMs);
    });
    try {
      await Promise.race([db.admin().ping(), timeout]);
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }
}
