"use client";

import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import clsx from "clsx";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  MapPin,
  Mic2,
  Music2,
  Phone,
  Send,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useMutation } from "urql";

import {
  SubmitEventApplicationDocument,
  type EventApplicationSubmitInput,
} from "@/lib/api/graphql/generated/graphql";
import { BAND_SIZES, PORCHFEST_HISTORY } from "@/lib/civic/civic-object-schema";
import {
  INITIAL_PORCHFEST_APPLICATION_STATE,
  PORCHFEST_APPLICATION_CATEGORIES,
  porchfestApplicationSubmitInput,
  type PorchfestApplicationCategory,
  type PorchfestApplicationFormState,
} from "@/lib/civic/porchfest-application";

const CATEGORY_ICONS: Record<PorchfestApplicationCategory, LucideIcon> = {
  musician: Music2,
  vendor: Store,
  entertainer: Mic2,
  other: Building2,
};

const CATEGORY_OPTIONS = PORCHFEST_APPLICATION_CATEGORIES.map((option) => ({
  ...option,
  Icon: CATEGORY_ICONS[option.value],
}));

type SubmitState =
  | { readonly kind: "idle" }
  | { readonly kind: "success"; readonly duplicate: boolean; readonly backupRecorded: boolean }
  | { readonly kind: "error"; readonly message: string };

function Field({
  children,
  hint,
  label,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
  readonly label: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-[13px] font-medium planner-ink-soft">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[11px] font-normal planner-muted">{hint}</span> : null}
    </label>
  );
}

function TextInput({
  name,
  onChange,
  placeholder,
  required = false,
  state,
  type = "text",
}: {
  readonly name: keyof PorchfestApplicationFormState;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly state: PorchfestApplicationFormState;
  readonly type?: "email" | "tel" | "text" | "url";
}) {
  return (
    <input
      className="planner-input h-11 w-full px-3 text-[15px]"
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      type={type}
      value={String(state[name])}
    />
  );
}

function TextArea({
  name,
  onChange,
  placeholder,
  required = false,
  rows = 4,
  state,
}: {
  readonly name: keyof PorchfestApplicationFormState;
  readonly onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly rows?: number;
  readonly state: PorchfestApplicationFormState;
}) {
  return (
    <textarea
      className="planner-input min-h-28 w-full resize-y px-3 py-3 text-[15px]"
      name={name}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      rows={rows}
      value={String(state[name])}
    />
  );
}

export function PorchfestApplicationForm() {
  const [state, setState] = useState<PorchfestApplicationFormState>(
    INITIAL_PORCHFEST_APPLICATION_STATE,
  );
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [{ fetching }, submitApplication] = useMutation(SubmitEventApplicationDocument);

  const selectedCategory = useMemo(
    () => CATEGORY_OPTIONS.find((option) => option.value === state.category),
    [state.category],
  );

  const handleText = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const name = event.target.name as keyof PorchfestApplicationFormState;
    const { value } = event.target;
    setState((current) => ({ ...current, [name]: value }));
  };

  const handleCheck = (event: ChangeEvent<HTMLInputElement>) => {
    const name = event.target.name as keyof PorchfestApplicationFormState;
    const { checked } = event.target;
    setState((current) => ({ ...current, [name]: checked }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitState({ kind: "idle" });

    const input: EventApplicationSubmitInput =
      porchfestApplicationSubmitInput(state);
    const result = await submitApplication({
      input,
    });

    if (result.error) {
      setSubmitState({ kind: "error", message: result.error.message });
      return;
    }

    const submission = result.data?.submitEventApplication;
    setSubmitState({
      kind: "success",
      duplicate: Boolean(submission?.duplicate),
      backupRecorded: Boolean(submission?.backupRecorded),
    });
  };

  return (
    <main className="h-full overflow-y-auto px-4 py-5 sm:px-8">
      <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-5 pb-12 pt-2">
        <header className="planner-panel planner-panel--primary p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="planner-kicker">Carriage Town</p>
              <h1 className="mt-2 text-balance text-3xl font-semibold planner-ink sm:text-4xl">
                PorchFest 2026 application
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 text-[12px] planner-muted">
              <span className="planner-tile inline-flex items-center gap-2 px-3 py-2">
                <MapPin aria-hidden="true" size={15} />
                Flint, Michigan
              </span>
              <span className="planner-tile inline-flex items-center gap-2 px-3 py-2">
                {selectedCategory ? <selectedCategory.Icon aria-hidden="true" size={15} /> : null}
                {selectedCategory?.label}
              </span>
            </div>
          </div>
        </header>

        <form className="planner-panel p-5 sm:p-6" onSubmit={handleSubmit}>
          <section className="flex flex-col gap-5">
            <div>
              <p className="planner-kicker">Category</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORY_OPTIONS.map(({ Icon, label, value }) => (
                  <button
                    aria-pressed={state.category === value}
                    className={clsx(
                      "planner-control flex h-14 items-center justify-center gap-2 px-3 text-[13px] font-medium",
                      state.category === value && "is-active",
                    )}
                    key={value}
                    onClick={() => setState((current) => ({ ...current, category: value }))}
                    type="button"
                  >
                    <Icon aria-hidden="true" size={17} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="planner-divider" />

            <section className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 planner-muted"
                    size={16}
                  />
                  <input
                    className="planner-input h-11 w-full px-9 text-[15px]"
                    name="name"
                    onChange={handleText}
                    required
                    value={state.name}
                  />
                </div>
              </Field>
              <Field label="Email">
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 planner-muted"
                    size={16}
                  />
                  <input
                    className="planner-input h-11 w-full px-9 text-[15px]"
                    name="email"
                    onChange={handleText}
                    required
                    type="email"
                    value={state.email}
                  />
                </div>
              </Field>
              <Field label="Phone">
                <div className="relative">
                  <Phone
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 planner-muted"
                    size={16}
                  />
                  <input
                    className="planner-input h-11 w-full px-9 text-[15px]"
                    name="phone"
                    onChange={handleText}
                    type="tel"
                    value={state.phone}
                  />
                </div>
              </Field>
              <Field label="City">
                <TextInput name="city" onChange={handleText} state={state} />
              </Field>
              <Field label="Flint connection">
                <select
                  className="planner-input h-11 w-full px-3 text-[15px]"
                  name="flintConnection"
                  onChange={handleText}
                  value={state.flintConnection}
                >
                  <option value="yes">Flint based</option>
                  <option value="nearby">Nearby</option>
                  <option value="outside">Outside Flint</option>
                </select>
              </Field>
              <Field label="Access needs">
                <TextInput name="accessNeeds" onChange={handleText} state={state} />
              </Field>
              <Field label="Bio">
                <TextArea
                  name="bio"
                  onChange={handleText}
                  required={state.category === "musician"}
                  rows={4}
                  state={state}
                />
              </Field>
            </section>

            <div className="planner-divider" />

            {state.category === "musician" ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Artist or band name">
                  <TextInput name="artistName" onChange={handleText} required state={state} />
                </Field>
                <Field label="Genre">
                  <TextInput name="genre" onChange={handleText} required state={state} />
                </Field>
                <Field label="Band size">
                  <select
                    className="planner-input h-11 w-full px-3 text-[15px]"
                    name="bandSize"
                    onChange={handleText}
                    value={state.bandSize}
                  >
                    <option value="">Select</option>
                    {BAND_SIZES.map((bandSize) => (
                      <option key={bandSize} value={bandSize}>
                        {bandSize}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Set length">
                  <TextInput name="setLength" onChange={handleText} state={state} />
                </Field>
                <Field label="Music link">
                  <TextInput name="musicLink" onChange={handleText} required state={state} type="url" />
                </Field>
                <Field label="Second music link">
                  <TextInput name="musicLink2" onChange={handleText} state={state} type="url" />
                </Field>
                <Field label="Equipment">
                  <TextInput name="equipment" onChange={handleText} state={state} />
                </Field>
                <div className="grid content-end gap-3">
                  <label className="planner-tile flex min-h-11 items-center gap-3 px-3 text-[13px] planner-ink-soft">
                    <input
                      checked={state.canDoThirty}
                      className="planner-check"
                      name="canDoThirty"
                      onChange={handleCheck}
                      type="checkbox"
                    />
                    Can play a 30 minute set
                  </label>
                  <label className="planner-tile flex min-h-11 items-center gap-3 px-3 text-[13px] planner-ink-soft">
                    <input
                      checked={state.ownPA}
                      className="planner-check"
                      name="ownPA"
                      onChange={handleCheck}
                      type="checkbox"
                    />
                    Has own PA
                  </label>
                </div>
                <Field label="PorchFest history">
                  <select
                    className="planner-input h-11 w-full px-3 text-[15px]"
                    name="porchfestHistory"
                    onChange={handleText}
                    required
                    value={state.porchfestHistory}
                  >
                    <option value="">Select</option>
                    {PORCHFEST_HISTORY.map((history) => (
                      <option key={history} value={history}>
                        {history === "first" ? "First time" : "Returning"}
                      </option>
                    ))}
                  </select>
                </Field>
              </section>
            ) : null}

            {state.category === "vendor" ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name">
                  <TextInput name="businessName" onChange={handleText} required state={state} />
                </Field>
                <Field label="Food type">
                  <TextInput
                    name="foodType"
                    onChange={handleText}
                    placeholder="Vegan, tacos, coffee"
                    state={state}
                  />
                </Field>
                <Field label="Food or goods description">
                  <TextArea name="foodDescription" onChange={handleText} required state={state} />
                </Field>
                <Field label="Vendor link">
                  <TextInput name="vendorLink" onChange={handleText} state={state} type="url" />
                </Field>
                <Field label="Footprint">
                  <TextInput name="footprint" onChange={handleText} state={state} />
                </Field>
                <Field label="Vendor needs">
                  <TextInput
                    name="vendorNeeds"
                    onChange={handleText}
                    placeholder="Power, water, shade"
                    state={state}
                  />
                </Field>
                <Field label="Vended before">
                  <select
                    className="planner-input h-11 w-full px-3 text-[15px]"
                    name="vendedBefore"
                    onChange={handleText}
                    value={state.vendedBefore}
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </Field>
              </section>
            ) : null}

            {state.category === "entertainer" ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Act name">
                  <TextInput name="actName" onChange={handleText} required state={state} />
                </Field>
                <Field label="Act type">
                  <TextInput name="actType" onChange={handleText} required state={state} />
                </Field>
                <Field label="Act description">
                  <TextArea name="actDescription" onChange={handleText} required state={state} />
                </Field>
              </section>
            ) : null}

            {state.category === "other" ? (
              <section className="grid gap-4 sm:grid-cols-2">
                <Field label="Organization or project name">
                  <TextInput name="orgName" onChange={handleText} required state={state} />
                </Field>
                <Field label="Work link">
                  <TextInput name="workLink" onChange={handleText} state={state} type="url" />
                </Field>
                <Field label="Proposal">
                  <TextArea name="proposal" onChange={handleText} required state={state} />
                </Field>
                <Field label="Other links">
                  <TextInput
                    name="otherLinks"
                    onChange={handleText}
                    placeholder="Website, Instagram, portfolio"
                    state={state}
                  />
                </Field>
                <Field label="History">
                  <TextArea name="history" onChange={handleText} state={state} />
                </Field>
              </section>
            ) : null}

            {submitState.kind === "success" ? (
              <div className="planner-note flex items-start gap-3 p-4" role="status">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 planner-accent" size={18} />
                <div>
                  <p className="font-medium planner-ink-soft">
                    {submitState.duplicate
                      ? "This application is already captured."
                      : "Application captured."}
                  </p>
                  <p className="mt-1 planner-muted">
                    {submitState.backupRecorded
                      ? "A backup receipt was recorded."
                      : "The application row was saved."}
                  </p>
                </div>
              </div>
            ) : null}

            {submitState.kind === "error" ? (
              <div className="planner-note flex items-start gap-3 p-4" role="alert">
                <AlertCircle aria-hidden="true" className="mt-0.5 planner-accent" size={18} />
                <div>
                  <p className="font-medium planner-ink-soft">Submission failed.</p>
                  <p className="mt-1 planner-muted">{submitState.message}</p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12px] planner-muted">
                Payment is not required to submit.
              </p>
              <button
                className="planner-button inline-flex h-11 items-center justify-center gap-2 px-5 text-[14px] font-semibold"
                disabled={fetching}
                type="submit"
              >
                <Send aria-hidden="true" size={16} />
                {fetching ? "Submitting" : "Submit application"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
