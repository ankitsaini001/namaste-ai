/**
 * What someone has typed during setup, kept in this browser until the wedding is created, so a
 * refresh or a closed tab doesn't lose it (WED-10). Tied to the user, for shared family computers.
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

const KEY = 'mmm.setupDraft.v1';

export function loadSetupDraft(userId: string): SetupDraft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SetupDraft;
    return draft.userId === userId ? draft : null;
  } catch {
    return null;
  }
}

export function saveSetupDraft(draft: SetupDraft): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode or storage full: setup still works, the draft just isn't kept.
  }
}

export function clearSetupDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
