import { validateApiEnv } from './env';

describe('validateApiEnv', () => {
  it('applies defaults, coerces PORT and normalises WEB_ORIGIN', () => {
    expect(validateApiEnv({ PORT: '4100', WEB_ORIGIN: 'http://localhost:3000/' })).toEqual({
      NODE_ENV: 'development',
      PORT: 4100,
      WEB_ORIGIN: 'http://localhost:3000',
    });
  });

  it('names every invalid variable in one readable error', () => {
    expect(() => validateApiEnv({ PORT: 'abc' })).toThrow(/PORT[\s\S]*WEB_ORIGIN/);
  });
});
