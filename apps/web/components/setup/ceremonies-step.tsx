'use client';

import {
  CEREMONY_PRESETS,
  ceremonyInputSchema,
  LIMITS,
  presetDefaultDay,
  WEDDING_RULES,
} from '@mmm/shared';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TextField } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import type { CeremonyDraft } from '@/lib/setup-draft';

type Preset = (typeof CEREMONY_PRESETS)[number];
type RowErrors = { name?: string; when?: string };

const newKey = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/** A preset ceremony on the wedding day at its usual time; both can be changed. */
/**
 * A preset ceremony at its usual time, on its usual day around the wedding: the day before for
 * Mehendi, Haldi, Sangeet and Cocktail, the day after for the Reception, and no date for an
 * Engagement or Roka, which the family chooses (owner's decision, 18 Oct 2026).
 */
export function presetRow(preset: Preset, weddingDay: string): CeremonyDraft {
  return {
    key: newKey(),
    type: preset.type,
    name: preset.name,
    day: presetDefaultDay(preset.type, weddingDay) ?? '',
    time: preset.time,
    showOnWebsite: true,
  };
}

/**
 * A chip stands for the ceremony it added only while that keeps the preset's name. Once renamed
 * ("Bride's Mehendi") it belongs to the family: the chip can add another, and only its bin removes
 * it (owner's decision, 18 Oct 2026).
 */
const chipRow = (row: CeremonyDraft, preset: Preset) =>
  row.type === preset.type && row.name.trim() === preset.name;

const WEDDING_PRESET = CEREMONY_PRESETS.find((preset) => preset.type === 'wedding')!;
export const weddingRow = (day: string) => presetRow(WEDDING_PRESET, day);

const LIST_MESSAGES = {
  empty: 'Add at least one ceremony.',
  tooMany: `A wedding can have up to ${LIMITS.events} ceremonies.`,
};

function validate(rows: CeremonyDraft[]): { list?: string; rows: Record<string, RowErrors> } {
  const errors: Record<string, RowErrors> = {};
  for (const row of rows) {
    const name = ceremonyInputSchema.shape.name.safeParse(row.name);
    const rowErrors: RowErrors = {
      name: name.success ? undefined : name.error.issues[0]?.message,
      when: row.day && row.time ? undefined : 'Choose a date and time.',
    };
    if (rowErrors.name || rowErrors.when) errors[row.key] = rowErrors;
  }
  const list =
    rows.length === 0
      ? LIST_MESSAGES.empty
      : rows.length > LIMITS.events
        ? LIST_MESSAGES.tooMany
        : undefined;
  return { list, rows: errors };
}

/** "events[2].startsAt" from the API → row 2's date and time. */
function serverRowError(
  field: string | null | undefined,
  message: string,
  rows: CeremonyDraft[],
): { list?: string; rows: Record<string, RowErrors> } | null {
  if (!field?.startsWith('events')) return null;
  const match = /^events\[(\d+)\]\.(\w+)/.exec(field);
  const row = match ? rows[Number(match[1])] : undefined;
  if (!match || !row) return { list: message, rows: {} };
  return { rows: { [row.key]: match[2] === 'name' ? { name: message } : { when: message } } };
}

/**
 * Step 2 (WED-05): pick the ceremonies from presets or add your own, each with a date, a start
 * time in IST and whether it appears on the wedding website. Venues and the rest come later.
 */
export function CeremoniesStep({
  weddingDay,
  value,
  onChange,
  onBack,
  onSubmit,
  submitting,
  serverError,
}: {
  weddingDay: string;
  value: CeremonyDraft[];
  onChange: (value: CeremonyDraft[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  serverError: { field: string | null; message: string } | null;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(`ceremony-${focusKey}-name`)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const local = submitted ? validate(value) : { rows: {} as Record<string, RowErrors> };
  const fromServer = serverError
    ? serverRowError(serverError.field, serverError.message, value)
    : null;
  const listError = local.list ?? fromServer?.list;
  const generalError = serverError && !fromServer ? serverError.message : null;
  const full = value.length >= LIMITS.events;

  const togglePreset = (preset: Preset) => {
    if (value.some((row) => chipRow(row, preset))) {
      onChange(value.filter((row) => !chipRow(row, preset)));
    } else if (!full) {
      onChange([...value, presetRow(preset, weddingDay)]);
    }
  };

  const addCustom = () => {
    const row: CeremonyDraft = {
      key: newKey(),
      type: 'custom',
      name: '',
      day: weddingDay,
      time: '18:00',
      showOnWebsite: true,
    };
    onChange([...value, row]);
    setFocusKey(row.key);
  };

  const updateRow = (key: string, patch: Partial<CeremonyDraft>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function submit() {
    setSubmitted(true);
    const found = validate(value);
    const firstBad = value.find((row) => found.rows[row.key]);
    if (firstBad) {
      const field = found.rows[firstBad.key]?.name ? 'name' : 'day';
      document.getElementById(`ceremony-${firstBad.key}-${field}`)?.focus();
      return;
    }
    if (found.list) {
      document.getElementById('ceremony-presets')?.focus();
      return;
    }
    onSubmit();
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-8"
    >
      <fieldset>
        <legend className="text-sm font-medium text-ink">
          Which ceremonies are you celebrating?
        </legend>
        <p id="ceremony-presets-hint" className="mt-1 text-sm text-muted">
          Tap to add or remove. You can add details like venues later.
        </p>
        <div
          id="ceremony-presets"
          tabIndex={-1}
          aria-describedby="ceremony-presets-hint"
          className="mt-3 flex flex-wrap gap-2 focus:outline-none"
        >
          {CEREMONY_PRESETS.map((preset) => {
            const selected = value.some((row) => chipRow(row, preset));
            return (
              <button
                key={preset.type}
                type="button"
                aria-pressed={selected}
                disabled={!selected && full}
                onClick={() => togglePreset(preset)}
                className={cn(
                  'inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50',
                  selected
                    ? 'border-aubergine bg-aubergine text-ivory hover:bg-aubergine-hover'
                    : 'border-line bg-white text-ink hover:border-champagne hover:bg-sand',
                )}
              >
                {selected ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                {preset.name}
              </button>
            );
          })}
        </div>
        {listError && (
          <p role="alert" className="mt-3 text-sm text-terracotta-ink">
            {listError}
          </p>
        )}
      </fieldset>

      {value.length > 0 && (
        <section aria-labelledby="ceremony-list-heading">
          <h2 id="ceremony-list-heading" className="text-sm font-medium text-ink">
            Added ceremonies ({value.length})
          </h2>
          <ol className="mt-3 space-y-4">
            {value.map((row) => (
              <CeremonyRow
                key={row.key}
                row={row}
                errors={local.rows[row.key] ?? fromServer?.rows[row.key] ?? {}}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => onChange(value.filter((other) => other.key !== row.key))}
              />
            ))}
          </ol>
        </section>
      )}

      <div>
        <Button variant="secondary" size="compact" disabled={full} onClick={addCustom}>
          <Plus aria-hidden="true" className="size-4" />
          Add another ceremony
        </Button>
        {full && (
          <p className="mt-2 text-sm text-muted">
            That’s the most a wedding can have ({LIMITS.events}).
          </p>
        )}
      </div>

      {generalError && (
        <p
          role="alert"
          className="rounded-xl bg-terracotta-tint px-4 py-3 text-sm text-terracotta-ink"
        >
          {generalError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button type="submit" loading={submitting}>
          Create our wedding
        </Button>
      </div>
    </form>
  );
}

function CeremonyRow({
  row,
  errors,
  onChange,
  onRemove,
}: {
  row: CeremonyDraft;
  errors: RowErrors;
  onChange: (patch: Partial<CeremonyDraft>) => void;
  onRemove: () => void;
}) {
  const id = `ceremony-${row.key}`;
  const label = row.name.trim() || 'this ceremony';
  return (
    <li className="rounded-xl border border-line bg-ivory p-3 sm:p-5">
      {/* Phones: name and remove on one line, date and time below. Wider: all on one line. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_auto]">
        <TextField
          id={`${id}-name`}
          label="Ceremony name"
          autoComplete="off"
          maxLength={WEDDING_RULES.eventNameMax}
          value={row.name}
          error={errors.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          // mt-7 lines the button up with the inputs, below their labels.
          className="mt-7 inline-flex size-13 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-sand hover:text-terracotta-ink sm:order-last"
        >
          <Trash2 aria-hidden="true" className="size-5" />
        </button>

        <fieldset className="col-span-2 min-w-0 sm:col-span-1">
          <legend className="sr-only">When {label} starts</legend>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
            <TextField
              id={`${id}-day`}
              label="Date"
              type="date"
              value={row.day}
              aria-invalid={errors.when ? true : undefined}
              aria-describedby={errors.when ? `${id}-when-error` : undefined}
              onChange={(e) => onChange({ day: e.target.value })}
            />
            <TextField
              id={`${id}-time`}
              label="Start time (IST)"
              type="time"
              value={row.time}
              aria-invalid={errors.when ? true : undefined}
              aria-describedby={errors.when ? `${id}-when-error` : undefined}
              onChange={(e) => onChange({ time: e.target.value })}
            />
          </div>
          {errors.when && (
            <p id={`${id}-when-error`} className="mt-2 text-sm text-terracotta-ink">
              {errors.when}
            </p>
          )}
        </fieldset>
      </div>

      <Switch
        className="mt-4"
        label="Show on wedding website"
        checked={row.showOnWebsite}
        onChange={(showOnWebsite) => onChange({ showOnWebsite })}
      />
    </li>
  );
}
