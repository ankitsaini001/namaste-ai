import { validateApiEnv } from './env';

const MONGODB_URI = 'mongodb://localhost:27017/makemymarriage?directConnection=true';

describe('validateApiEnv', () => {
  it('applies defaults, coerces PORT and normalises WEB_ORIGIN', () => {
    expect(
      validateApiEnv({ PORT: '4100', WEB_ORIGIN: 'http://localhost:3000/', MONGODB_URI }),
    ).toEqual({
      NODE_ENV: 'development',
      MONGODB_URI,
      PORT: 4100,
      WEB_ORIGIN: 'http://localhost:3000',
    });
  });

  it('names every invalid variable in one readable error', () => {
    expect(() => validateApiEnv({ PORT: 'abc' })).toThrow(
      /MONGODB_URI[\s\S]*PORT[\s\S]*WEB_ORIGIN/,
    );
  });

  it('rejects a database URI that is not a MongoDB connection string', () => {
    expect(() =>
      validateApiEnv({ WEB_ORIGIN: 'http://localhost:3000', MONGODB_URI: 'postgres://db' }),
    ).toThrow(/MONGODB_URI: Must start with mongodb/);
  });
});
