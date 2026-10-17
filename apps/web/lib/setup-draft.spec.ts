import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSetupDraft, loadSetupDraft, saveSetupDraft, type SetupDraft } from './setup-draft';

/** A minimal in-memory localStorage (tests run in Node). */
function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const draft = (userId: string, brideName: string): SetupDraft => ({
  userId,
  step: 'details',
  details: {
    brideName,
    groomName: '',
    title: brideName,
    titleEdited: false,
    date: '',
    city: '',
    description: '',
    slug: '',
    slugEdited: false,
  },
  ceremonies: [],
});

let storage: ReturnType<typeof memoryStorage>;
beforeEach(() => {
  storage = memoryStorage();
  vi.stubGlobal('window', { localStorage: storage });
});
afterEach(() => vi.unstubAllGlobals());

describe('setup draft', () => {
  it('keeps a separate draft for each person using the browser', () => {
    saveSetupDraft(draft('kavya', 'Kavya'));
    saveSetupDraft(draft('meera', 'Meera'));

    expect(loadSetupDraft('kavya')?.details.brideName).toBe('Kavya');
    expect(loadSetupDraft('meera')?.details.brideName).toBe('Meera');
    expect(loadSetupDraft('someone-else')).toBeNull();
  });

  it('clears only that person’s draft', () => {
    saveSetupDraft(draft('kavya', 'Kavya'));
    saveSetupDraft(draft('meera', 'Meera'));
    clearSetupDraft('meera');

    expect(loadSetupDraft('meera')).toBeNull();
    expect(loadSetupDraft('kavya')?.details.brideName).toBe('Kavya');
  });

  it('drops the old shared draft', () => {
    storage.setItem('mmm.setupDraft.v1', JSON.stringify(draft('kavya', 'Kavya')));
    expect(loadSetupDraft('kavya')).toBeNull();
    expect(storage.items.has('mmm.setupDraft.v1')).toBe(false);
  });

  it('still works when storage is unavailable', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
    });
    expect(() => saveSetupDraft(draft('kavya', 'Kavya'))).not.toThrow();
    expect(loadSetupDraft('kavya')).toBeNull();
    expect(() => clearSetupDraft('kavya')).not.toThrow();
  });
});
