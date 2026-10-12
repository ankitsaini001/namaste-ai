import { validateApiEnv, validateWorkerEnv } from './env';

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

describe('validateWorkerEnv', () => {
  it('needs only the database settings; email defaults to Mailpit over SMTP', () => {
    expect(validateWorkerEnv({ MONGODB_URI })).toEqual({
      NODE_ENV: 'development',
      MONGODB_URI,
      EMAIL_TRANSPORT: 'smtp',
      SMTP_HOST: 'localhost',
      SMTP_PORT: 1025,
      EMAIL_FROM: 'Make My Marriage <no-reply@localhost>',
      EMAIL_DAILY_LIMIT: 100,
      EMAIL_RESERVED: 20,
    });
  });

  it('refuses to start without MONGODB_URI', () => {
    expect(() => validateWorkerEnv({})).toThrow(/Invalid environment variables for the worker/);
  });

  it('requires a Resend API key when sending through Resend', () => {
    expect(() => validateWorkerEnv({ MONGODB_URI, EMAIL_TRANSPORT: 'resend' })).toThrow(
      /RESEND_API_KEY: Required when EMAIL_TRANSPORT=resend/,
    );
  });

  it('keeps the reserved slots below the daily limit', () => {
    expect(() =>
      validateWorkerEnv({ MONGODB_URI, EMAIL_DAILY_LIMIT: '20', EMAIL_RESERVED: '20' }),
    ).toThrow(/EMAIL_RESERVED/);
  });
});
