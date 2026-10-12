import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('keeps paths on this site', () => {
    expect(safeReturnTo('/app')).toBe('/app');
    expect(safeReturnTo('/app/guests?page=2')).toBe('/app/guests?page=2');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'app'])(
    'falls back to /app for %j',
    (value) => {
      expect(safeReturnTo(value)).toBe('/app');
    },
  );
});
