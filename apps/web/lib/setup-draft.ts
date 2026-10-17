/**
 * What someone has typed during setup, kept in this browser until the wedding is created, so a
 * refresh or a closed tab doesn't lose it (WED-10). Each user has their own draft, so family
 * members sharing a computer don't overwrite or see each other's.
 */
export type CeremonyDraft = {
  key: string;
  type: string;
  name: string;
  day: string;
  time: string;
  showOnWebsite: boolean;
};

export type SetupDraft = {
  userId: string;
  step: 'details' | 'ceremonies';
  details: {
    brideName: string;
    groomName: string;
    title: string;
    titleEdited: boolean;
    date: string;
    city: string;
    description: string;
    slug: string;
    slugEdited: boolean;
  };
  ceremonies: CeremonyDraft[];
};

const keyFor = (userId: string) => `mmm.setupDraft.v2.${userId}`;
// Before v2, one draft was shared by everyone using the browser.
const LEGACY_KEY = 'mmm.setupDraft.v1';

export function loadSetupDraft(userId: string): SetupDraft | null {
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const draft = JSON.parse(raw) as SetupDraft;
    return draft.userId === userId ? draft : null;
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: SetupDraft): void {
  try {
    window.localStorage.setItem(keyFor(draft.userId), JSON.stringify(draft));
  } catch {
    // Private mode or storage full: setup still works, the draft just isn't kept.
  }
}

export function clearSetupDraft(userId: string): void {
  try {
    window.localStorage.removeItem(keyFor(userId));
  } catch {
    // Nothing to clear.
  }
}
