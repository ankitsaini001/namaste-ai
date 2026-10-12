import { z } from 'zod';
import { toFieldPath, validationException } from './validation.pipe';

describe('toFieldPath', () => {
  it('formats nested paths like the API Design examples', () => {
    expect(toFieldPath(['events', 1, 'count'])).toBe('events[1].count');
    expect(toFieldPath(['email'])).toBe('email');
    expect(toFieldPath([])).toBeNull();
  });
});

describe('validationException', () => {
  it('uses the first field message and lists every issue', () => {
    const schema = z.object({ email: z.email('Enter a valid email.'), age: z.number() });
    const error = schema.safeParse({ email: 'x', age: 'old' }).error!;
    const exception = validationException(error);
    expect(exception.getStatus()).toBe(400);
    expect(exception.code).toBe('VALIDATION_FAILED');
    expect(exception.message).toBe('Enter a valid email.');
    expect(exception.field).toBe('email');
    expect(exception.details).toEqual({
      issues: [
        { field: 'email', message: 'Enter a valid email.' },
        { field: 'age', message: expect.any(String) },
      ],
    });
  });

  it('falls back to a general message when the whole body is wrong', () => {
    const error = z.object({ email: z.string() }).safeParse(undefined).error!;
    expect(validationException(error).message).toBe(
      'Some of the information is missing or not valid.',
    );
  });
});
