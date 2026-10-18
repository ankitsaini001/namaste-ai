import { describe, expect, it } from 'vitest';
import {
  createEventSchema,
  endsAtProblem,
  mapQuery,
  presetDefaultDay,
  updateEventSchema,
} from './events';

describe('presetDefaultDay (owner’s decision, 18 Oct 2026)', () => {
  it.each([
    ['mehendi', '2027-02-13'],
    ['haldi', '2027-02-13'],
    ['sangeet', '2027-02-13'],
    ['cocktail', '2027-02-13'],
    ['wedding', '2027-02-14'],
    ['reception', '2027-02-15'],
    ['custom', '2027-02-14'],
    ['engagement', null],
    ['roka', null],
  ] as const)('%s → %s', (type, day) => {
    expect(presetDefaultDay(type, '2027-02-14')).toBe(day);
  });

  it('crosses month ends', () => {
    expect(presetDefaultDay('mehendi', '2027-03-01')).toBe('2027-02-28');
    expect(presetDefaultDay('reception', '2027-12-31')).toBe('2028-01-01');
  });
});

describe('mapQuery', () => {
  it('joins the venue and address the map should show', () => {
    expect(mapQuery('Royal Garden', 'Rajpur Road, Dehradun')).toBe(
      'Royal Garden, Rajpur Road, Dehradun',
    );
    expect(mapQuery(null, 'Rajpur Road')).toBe('Rajpur Road');
    expect(mapQuery(null, null)).toBeNull();
  });
});

describe('createEventSchema', () => {
  const sangeet = {
    type: 'sangeet',
    name: 'Sangeet',
    startsAt: '2027-02-13T14:30:00.000Z',
  };

  it('fills the optional details with null', () => {
    expect(createEventSchema.parse({ ...sangeet, venueName: '  ', dressCode: '' })).toMatchObject({
      endsAt: null,
      venueName: null,
      dressCode: null,
      mapUrl: null,
      livestreamUrl: null,
      showOnWebsite: true,
    });
  });

  it.each([
    [{ endsAt: '2027-02-13T14:00:00.000Z' }, 'The end time must be after the start.'],
    [{ mapUrl: 'maps.google.com/xyz' }, /whole link from Google Maps/],
    [{ livestreamUrl: 'https://vimeo.com/123' }, /YouTube link/],
    [{ venueName: 'x'.repeat(81) }, /under 81/],
    [{ name: '' }, 'Enter the ceremony name.'],
  ])('rejects %j', (change, message) => {
    expect(
      createEventSchema.safeParse({ ...sangeet, ...change }).error?.issues[0]?.message,
    ).toMatch(message);
  });

  it('accepts YouTube links in their usual forms', () => {
    for (const url of [
      'https://www.youtube.com/live/abc',
      'https://youtu.be/abc',
      'https://m.youtube.com/watch?v=abc',
    ]) {
      expect(createEventSchema.safeParse({ ...sangeet, livestreamUrl: url }).success).toBe(true);
    }
  });
});

describe('updateEventSchema', () => {
  it('takes any field but the type', () => {
    expect(updateEventSchema.parse({ type: 'haldi', dressCode: 'Yellow' })).toEqual({
      dressCode: 'Yellow',
    });
    expect(updateEventSchema.safeParse({ type: 'haldi' }).success).toBe(false);
  });
});

describe('endsAtProblem', () => {
  it('needs the end after the start, when there is one', () => {
    expect(endsAtProblem('2027-02-13T14:30:00.000Z', null)).toBeNull();
    expect(endsAtProblem('2027-02-13T14:30:00.000Z', '2027-02-13T19:30:00.000Z')).toBeNull();
    expect(endsAtProblem('2027-02-13T14:30:00.000Z', '2027-02-13T14:30:00.000Z')).toMatch(/after/);
  });
});
