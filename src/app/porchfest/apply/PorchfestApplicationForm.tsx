"use client";

/**
 * PorchFest 2026 public application · Observable register.
 *
 * Multi-step flow with CTHNA parity: category select -> details -> review
 * -> received, with a localStorage draft so an interrupted applicant never
 * retypes. Validation mirrors the live CTHNA rules per category; multi-
 * selects are chips that read/write the comma-joined form state the
 * porchfest-application bridge already splits into arrays, so the submit
 * path (GraphQL capture ledger, FR-001/006) is untouched by the redesign.
 * Payment is never in this path (FR-013).
 *
 * Visual system: src/app/porchfest/apply/apply.css, mapped to the
 * Observable tokens. Navy appears exactly once per screen as the primary
 * action; chips and radio cards select with the code-surface-blue wash.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Building2,
  Check,
  ChevronLeft,
  Mic2,
  Music2,
  Store,
} from "lucide-react";
import { useMutation } from "urql";

import { SubmitEventApplicationDocument } from "@/lib/api/graphql/generated/graphql";
import type { EventApplicationSubmitInput } from "@/lib/api/graphql/generated/graphql";
import {
  BAND_SIZES,
  ENT_TYPES,
  FOOD_TYPES,
  SETUP_NEEDS,
  VENDOR_NEEDS,
} from "@/lib/civic/civic-object-schema";
import {
  INITIAL_PORCHFEST_APPLICATION_STATE,
  porchfestApplicationSourceKey,
  porchfestApplicationSubmitInput,
  splitList,
  type PorchfestApplicationCategory,
  type PorchfestApplicationFormState,
} from "@/lib/civic/porchfest-application";

const DRAFT_KEY = "civic-apply:porchfest-2026";

type Stage = "category" | "form" | "review" | "done";

type Errors = Partial<
  Record<keyof PorchfestApplicationFormState | "agree", string>
>;

type SubmitState =
  | { kind: "idle" }
  | {
      kind: "success";
      duplicate: boolean;
      backupRecorded: boolean;
      sourceKey: string;
    }
  | { kind: "error"; message: string };

const CATEGORY_META: Record<
  PorchfestApplicationCategory,
  { label: string; description: string; Icon: typeof Music2 }
> = {
  musician: {
    label: "Musician / Band",
    description:
      "Solo, duo, full band, or DJ. Any genre. Send us your sound and we will match you to a porch.",
    Icon: Music2,
  },
  vendor: {
    label: "Food Vendor",
    description:
      "Trucks, tents, and tables. Tell us what you serve and what your setup needs.",
    Icon: Store,
  },
  entertainer: {
    label: "Entertainer",
    description:
      "Comedy, dance, spoken word, chalk art, magic. Whatever makes a block party come alive.",
    Icon: Mic2,
  },
  other: {
    label: "Something Else",
    description:
      "Community tables, activities, ideas that do not fit a box. Pitch us.",
    Icon: Building2,
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** CTHNA-parity validation, per category. */
function validate(state: PorchfestApplicationFormState): Errors {
  const errors: Errors = {};
  if (!state.name.trim()) errors.name = "Required";
  if (!state.email.trim()) errors.email = "Required";
  else if (!EMAIL_RE.test(state.email.trim())) {
    errors.email = "Enter a valid email";
  }

  if (state.category === "musician") {
    if (!state.musicLink.trim()) errors.musicLink = "Please add a music link";
    if (!state.artistName.trim()) errors.artistName = "Required";
    if (!state.genre.trim()) errors.genre = "Required";
    if (!state.bio.trim()) errors.bio = "Tell us about yourself";
    if (!state.porchfestHistory) errors.porchfestHistory = "Required";
    if (!state.canDoThirty) errors.canDoThirty = "Required";
  }
  if (state.category === "vendor") {
    if (!state.businessName.trim()) errors.businessName = "Required";
    if (!state.foodDescription.trim()) {
      errors.foodDescription = "Tell us what you serve";
    }
  }
  if (state.category === "entertainer") {
    if (!state.actName.trim()) errors.actName = "Required";
    if (!state.actDescription.trim()) {
      errors.actDescription = "Tell us about your act";
    }
  }
  if (state.category === "other") {
    if (!state.orgName.trim()) errors.orgName = "Required";
    if (!state.proposal.trim()) errors.proposal = "Tell us your idea";
  }
  return errors;
}

/** Toggle one option inside a comma-joined multi-select value. */
function toggleListValue(joined: string, option: string): string {
  const items = splitList(joined);
  const next = items.includes(option)
    ? items.filter((item) => item !== option)
    : [...items, option];
  return next.join(", ");
}

/** Coerce a stored draft (possibly from the older boolean shape). */
function coerceDraftState(raw: unknown): PorchfestApplicationFormState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const draft = raw as Record<string, unknown>;
  const next: Record<string, unknown> = {
    ...INITIAL_PORCHFEST_APPLICATION_STATE,
  };
  for (const key of Object.keys(INITIAL_PORCHFEST_APPLICATION_STATE)) {
    const value = draft[key];
    if (typeof value === "string") next[key] = value;
  }
  // Legacy boolean tri-states: true was an explicit yes; false is
  // indistinguishable from unanswered, so it stays unanswered.
  if (draft.canDoThirty === true) next.canDoThirty = "yes";
  if (draft.ownPA === true) next.ownPA = "yes";
  return next as unknown as PorchfestApplicationFormState;
}

/* ---------------------------------------------------------------- */
/* Primitives                                                        */
/* ---------------------------------------------------------------- */

function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="civic-apply-field">
      <label className="civic-apply-label" htmlFor={htmlFor}>
        {label}
      </label>
      {hint ? <p className="civic-apply-hint">{hint}</p> : null}
      {children}
      {error ? (
        <p className="civic-apply-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onToggle,
}: {
  options: readonly string[];
  value: string;
  onToggle: (option: string) => void;
}) {
  const selected = new Set(splitList(value));
  return (
    <div className="civic-apply-chip-row">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className="civic-apply-chip"
          aria-pressed={selected.has(option)}
          onClick={() => onToggle(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function RadioCards({
  name,
  options,
  value,
  onChange,
  stack = false,
}: {
  name: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  stack?: boolean;
}) {
  return (
    <div className="civic-apply-radio-row" data-stack={stack || undefined}>
      {options.map((option) => (
        <label
          key={option.value}
          className="civic-apply-radio-card"
          data-checked={value === option.value}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="civic-apply-radio-dot" aria-hidden="true" />
          {option.label}
        </label>
      ))}
    </div>
  );
}

const STEPS: { id: Stage; label: string }[] = [
  { id: "category", label: "01 Category" },
  { id: "form", label: "02 Details" },
  { id: "review", label: "03 Review" },
];

function StepRail({ stage }: { stage: Stage }) {
  const order: Stage[] = ["category", "form", "review"];
  const currentIndex = order.indexOf(stage);
  return (
    <ol
      className="civic-apply-steps"
      aria-label={`Application step ${currentIndex + 1} of 3`}
    >
      {STEPS.map((step, index) => (
        <li
          key={step.id}
          className="civic-apply-step"
          data-state={
            index === currentIndex
              ? "current"
              : index < currentIndex
                ? "done"
                : "todo"
          }
          aria-current={index === currentIndex ? "step" : undefined}
        >
          {index > 0 ? (
            <span className="civic-apply-step-rule" aria-hidden="true" />
          ) : null}
          {step.label}
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- */
/* Form                                                              */
/* ---------------------------------------------------------------- */

export function PorchfestApplicationForm() {
  const [stage, setStage] = useState<Stage>("category");
  const [state, setState] = useState<PorchfestApplicationFormState>(
    INITIAL_PORCHFEST_APPLICATION_STATE,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [agree, setAgree] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });
  const [{ fetching }, submitApplication] = useMutation(
    SubmitEventApplicationDocument,
  );
  const hydratedRef = useRef(false);

  // Draft restore. Anything typed into the form survives a closed tab.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { stage?: Stage; state?: unknown };
        const coerced = coerceDraftState(parsed.state);
        if (coerced) {
          setState(coerced);
          if (
            parsed.stage === "form" ||
            parsed.stage === "review" ||
            parsed.stage === "category"
          ) {
            setStage(parsed.stage);
          }
        }
      }
    } catch {
      // Blocked or malformed storage never blocks applying.
    }
    hydratedRef.current = true;
  }, []);

  // Draft persist.
  useEffect(() => {
    if (!hydratedRef.current || stage === "done") return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ stage, state }));
    } catch {
      // Ignore blocked storage.
    }
  }, [stage, state]);

  const set = useCallback(
    <K extends keyof PorchfestApplicationFormState>(
      key: K,
      value: PorchfestApplicationFormState[K],
    ) => {
      setState((current) => ({ ...current, [key]: value }));
      setErrors((current) => {
        if (!(key in current)) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const toggleList = useCallback(
    (
      key: "equipment" | "foodType" | "vendorNeeds" | "actType",
      option: string,
    ) => {
      setState((current) => ({
        ...current,
        [key]: toggleListValue(current[key], option),
      }));
    },
    [],
  );

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      document
        .querySelector('[role="alert"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const handleReview = () => {
    const found = validate(state);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      scrollToFirstError();
      return;
    }
    setStage("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!agree) {
      setErrors({ agree: "Please confirm before submitting" });
      return;
    }
    setSubmitState({ kind: "idle" });
    const input: EventApplicationSubmitInput =
      porchfestApplicationSubmitInput(state);
    const result = await submitApplication({ input });

    if (result.error) {
      // The application data is untouched on failure; the applicant can
      // retry without retyping (the draft also still exists).
      setSubmitState({ kind: "error", message: result.error.message });
      return;
    }
    const submission = result.data?.submitEventApplication;
    setSubmitState({
      kind: "success",
      duplicate: Boolean(submission?.duplicate),
      backupRecorded: Boolean(submission?.backupRecorded),
      sourceKey: porchfestApplicationSourceKey(state),
    });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore blocked storage.
    }
    setStage("done");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStartOver = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore blocked storage.
    }
    setState(INITIAL_PORCHFEST_APPLICATION_STATE);
    setErrors({});
    setAgree(false);
    setSubmitState({ kind: "idle" });
    setStage("category");
  };

  const meta = CATEGORY_META[state.category];

  return (
    <main className="civic-apply">
      <div className="civic-apply-column">
        <header>
          <p className="civic-apply-overline">
            Carriage Town · Flint, Michigan
          </p>
          <h1 className="civic-apply-display">PorchFest 2026 application</h1>
          <p className="civic-apply-lede">
            Free to apply, free to play. Your application is saved the moment
            you submit it; nothing else is required first.
          </p>
        </header>

        {stage !== "done" ? <StepRail stage={stage} /> : null}

        {/* ----- stage 1 · category ------------------------------------ */}
        {stage === "category" ? (
          <section
            className="civic-apply-stage"
            aria-label="Choose a category"
          >
            <h2 className="civic-apply-section-h">What are you bringing?</h2>
            <p className="civic-apply-section-sub">
              Pick the closest fit; the form adapts to it.
            </p>
            <div className="civic-apply-category-grid">
              {(
                Object.entries(CATEGORY_META) as [
                  PorchfestApplicationCategory,
                  (typeof CATEGORY_META)[PorchfestApplicationCategory],
                ][]
              ).map(([value, option]) => (
                <button
                  key={value}
                  type="button"
                  className="civic-apply-category-card"
                  aria-pressed={state.category === value}
                  onClick={() => set("category", value)}
                >
                  <span className="civic-apply-category-name">
                    <option.Icon aria-hidden="true" size={17} />
                    {option.label}
                  </span>
                  <span className="civic-apply-category-desc">
                    {option.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="civic-apply-actions">
              <button
                type="button"
                className="civic-apply-btn civic-apply-btn--primary"
                onClick={() => {
                  setStage("form");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Start application
              </button>
            </div>
          </section>
        ) : null}

        {/* ----- stage 2 · details -------------------------------------- */}
        {stage === "form" ? (
          <form
            className="civic-apply-stage"
            onSubmit={(event) => {
              event.preventDefault();
              handleReview();
            }}
            noValidate
          >
            <section className="civic-apply-section" style={{ paddingTop: 0 }}>
              <h2 className="civic-apply-section-h">Contact info</h2>
              <p className="civic-apply-section-sub">How can we reach you?</p>
              <div className="civic-apply-grid-2">
                <Field
                  label="Full name *"
                  htmlFor="apply-name"
                  error={errors.name}
                >
                  <input
                    id="apply-name"
                    className="civic-apply-input"
                    data-invalid={Boolean(errors.name) || undefined}
                    value={state.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </Field>
                <Field
                  label="Email *"
                  htmlFor="apply-email"
                  error={errors.email}
                >
                  <input
                    id="apply-email"
                    type="email"
                    className="civic-apply-input"
                    data-invalid={Boolean(errors.email) || undefined}
                    value={state.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Phone" hint="Optional" htmlFor="apply-phone">
                  <input
                    id="apply-phone"
                    type="tel"
                    className="civic-apply-input"
                    value={state.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                  />
                </Field>
                <Field label="City" hint="Optional" htmlFor="apply-city">
                  <input
                    id="apply-city"
                    className="civic-apply-input"
                    value={state.city}
                    onChange={(e) => set("city", e.target.value)}
                    placeholder="Flint, MI"
                    autoComplete="address-level2"
                  />
                </Field>
              </div>
            </section>

            {state.category === "musician" ? (
              <>
                <section className="civic-apply-section">
                  <h2 className="civic-apply-section-h">Your music</h2>
                  <p className="civic-apply-section-sub">
                    Share your sound. We listen to every submission.
                  </p>
                  <Field
                    label="Music link *"
                    hint="SoundCloud, Bandcamp, Spotify, YouTube, etc."
                    htmlFor="apply-musicLink"
                    error={errors.musicLink}
                  >
                    <input
                      id="apply-musicLink"
                      type="url"
                      className="civic-apply-input"
                      data-invalid={Boolean(errors.musicLink) || undefined}
                      value={state.musicLink}
                      onChange={(e) => set("musicLink", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                  <Field
                    label="Second link"
                    hint="Optional. Another sample, video, or press kit."
                    htmlFor="apply-musicLink2"
                  >
                    <input
                      id="apply-musicLink2"
                      type="url"
                      className="civic-apply-input"
                      value={state.musicLink2}
                      onChange={(e) => set("musicLink2", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                  <div className="civic-apply-grid-2">
                    <Field
                      label="Artist / band name *"
                      htmlFor="apply-artistName"
                      error={errors.artistName}
                    >
                      <input
                        id="apply-artistName"
                        className="civic-apply-input"
                        data-invalid={Boolean(errors.artistName) || undefined}
                        value={state.artistName}
                        onChange={(e) => set("artistName", e.target.value)}
                        placeholder="Your name or band name"
                      />
                    </Field>
                    <Field
                      label="Genre *"
                      htmlFor="apply-genre"
                      error={errors.genre}
                    >
                      <input
                        id="apply-genre"
                        className="civic-apply-input"
                        data-invalid={Boolean(errors.genre) || undefined}
                        value={state.genre}
                        onChange={(e) => set("genre", e.target.value)}
                        placeholder="e.g., Hip-Hop, Rock, Jazz"
                      />
                    </Field>
                  </div>
                  <Field label="Band size" htmlFor="apply-bandSize">
                    <select
                      id="apply-bandSize"
                      className="civic-apply-select"
                      value={state.bandSize}
                      onChange={(e) =>
                        set(
                          "bandSize",
                          e.target
                            .value as PorchfestApplicationFormState["bandSize"],
                        )
                      }
                    >
                      <option value="">How many people?</option>
                      {BAND_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </Field>
                </section>

                <section className="civic-apply-section">
                  <h2 className="civic-apply-section-h">About you</h2>
                  <p className="civic-apply-section-sub">
                    Tell us who you are and your connection to the community.
                  </p>
                  <Field
                    label="Bio *"
                    hint="A few sentences about your music and background."
                    htmlFor="apply-bio"
                    error={errors.bio}
                  >
                    <textarea
                      id="apply-bio"
                      className="civic-apply-textarea"
                      data-invalid={Boolean(errors.bio) || undefined}
                      rows={5}
                      value={state.bio}
                      onChange={(e) => set("bio", e.target.value)}
                      placeholder="Tell us about yourself..."
                    />
                  </Field>
                  <Field
                    label="Have you played PorchFest before? *"
                    error={errors.porchfestHistory}
                  >
                    <RadioCards
                      name="porchfestHistory"
                      stack
                      options={[
                        { value: "first", label: "First time applying" },
                        { value: "returning", label: "Returning performer" },
                      ]}
                      value={state.porchfestHistory}
                      onChange={(value) =>
                        set(
                          "porchfestHistory",
                          value as PorchfestApplicationFormState["porchfestHistory"],
                        )
                      }
                    />
                  </Field>
                  <Field label="Are you based in Flint?">
                    <RadioCards
                      name="flintConnection"
                      stack
                      options={[
                        { value: "yes", label: "Yes, Flint-based" },
                        { value: "nearby", label: "Nearby (Genesee County)" },
                        { value: "outside", label: "Outside the area" },
                      ]}
                      value={state.flintConnection}
                      onChange={(value) =>
                        set(
                          "flintConnection",
                          value as PorchfestApplicationFormState["flintConnection"],
                        )
                      }
                    />
                  </Field>
                </section>

                <section className="civic-apply-section">
                  <h2 className="civic-apply-section-h">Logistics</h2>
                  <p className="civic-apply-section-sub">
                    Help us plan your set.
                  </p>
                  <Field
                    label="Can you do at least a thirty minute set? *"
                    error={errors.canDoThirty}
                  >
                    <RadioCards
                      name="canDoThirty"
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      value={state.canDoThirty}
                      onChange={(value) =>
                        set(
                          "canDoThirty",
                          value as PorchfestApplicationFormState["canDoThirty"],
                        )
                      }
                    />
                  </Field>
                  <Field label="Equipment needs" hint="Select any that apply">
                    <ChipGroup
                      options={SETUP_NEEDS}
                      value={state.equipment}
                      onToggle={(option) => toggleList("equipment", option)}
                    />
                  </Field>
                  <Field label="Bringing your own PA?">
                    <RadioCards
                      name="ownPA"
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      value={state.ownPA}
                      onChange={(value) =>
                        set(
                          "ownPA",
                          value as PorchfestApplicationFormState["ownPA"],
                        )
                      }
                    />
                  </Field>
                  <Field
                    label="Accessibility needs"
                    hint="Ramp access, ground-level stage, other accommodations"
                    htmlFor="apply-accessNeeds"
                  >
                    <textarea
                      id="apply-accessNeeds"
                      className="civic-apply-textarea"
                      rows={3}
                      value={state.accessNeeds}
                      onChange={(e) => set("accessNeeds", e.target.value)}
                      placeholder="Let us know if you need anything specific"
                    />
                  </Field>
                </section>
              </>
            ) : null}

            {state.category === "vendor" ? (
              <>
                <section className="civic-apply-section">
                  <h2 className="civic-apply-section-h">Your food</h2>
                  <p className="civic-apply-section-sub">
                    Tell us what you serve.
                  </p>
                  <Field
                    label="Business name *"
                    htmlFor="apply-businessName"
                    error={errors.businessName}
                  >
                    <input
                      id="apply-businessName"
                      className="civic-apply-input"
                      data-invalid={Boolean(errors.businessName) || undefined}
                      value={state.businessName}
                      onChange={(e) => set("businessName", e.target.value)}
                      placeholder="Your business or brand name"
                    />
                  </Field>
                  <Field
                    label="What do you serve? *"
                    htmlFor="apply-foodDescription"
                    error={errors.foodDescription}
                  >
                    <textarea
                      id="apply-foodDescription"
                      className="civic-apply-textarea"
                      data-invalid={
                        Boolean(errors.foodDescription) || undefined
                      }
                      rows={4}
                      value={state.foodDescription}
                      onChange={(e) => set("foodDescription", e.target.value)}
                      placeholder="Describe your menu or offerings"
                    />
                  </Field>
                  <Field label="Type of food" hint="Select all that apply">
                    <ChipGroup
                      options={FOOD_TYPES}
                      value={state.foodType}
                      onToggle={(option) => toggleList("foodType", option)}
                    />
                  </Field>
                  <Field
                    label="Social media / website"
                    htmlFor="apply-vendorLink"
                  >
                    <input
                      id="apply-vendorLink"
                      type="url"
                      className="civic-apply-input"
                      value={state.vendorLink}
                      onChange={(e) => set("vendorLink", e.target.value)}
                      placeholder="https://"
                    />
                  </Field>
                </section>

                <section className="civic-apply-section">
                  <h2 className="civic-apply-section-h">Setup details</h2>
                  <p className="civic-apply-section-sub">
                    Help us plan your space.
                  </p>
                  <Field
                    label="Space footprint"
                    hint="Approximate size of your setup"
                    htmlFor="apply-footprint"
                  >
                    <input
                      id="apply-footprint"
                      className="civic-apply-input"
                      value={state.footprint}
                      onChange={(e) => set("footprint", e.target.value)}
                      placeholder="e.g., 10x10 tent, food truck"
                    />
                  </Field>
                  <Field label="On-site needs" hint="Select all that apply">
                    <ChipGroup
                      options={VENDOR_NEEDS}
                      value={state.vendorNeeds}
                      onToggle={(option) => toggleList("vendorNeeds", option)}
                    />
                  </Field>
                  <Field label="Have you vended at PorchFest before?">
                    <RadioCards
                      name="vendedBefore"
                      options={[
                        { value: "yes", label: "Yes" },
                        { value: "no", label: "No" },
                      ]}
                      value={state.vendedBefore}
                      onChange={(value) =>
                        set(
                          "vendedBefore",
                          value as PorchfestApplicationFormState["vendedBefore"],
                        )
                      }
                    />
                  </Field>
                </section>
              </>
            ) : null}

            {state.category === "entertainer" ? (
              <section className="civic-apply-section">
                <h2 className="civic-apply-section-h">What do you do?</h2>
                <p className="civic-apply-section-sub">
                  PorchFest is music, comedy, visual art, and whatever else
                  makes a block party come alive. Tell us what you are
                  bringing.
                </p>
                <Field
                  label="Act / artist name *"
                  htmlFor="apply-actName"
                  error={errors.actName}
                >
                  <input
                    id="apply-actName"
                    className="civic-apply-input"
                    data-invalid={Boolean(errors.actName) || undefined}
                    value={state.actName}
                    onChange={(e) => set("actName", e.target.value)}
                    placeholder="Your name or act name"
                  />
                </Field>
                <Field label="Type of act" hint="Select all that apply">
                  <ChipGroup
                    options={ENT_TYPES}
                    value={state.actType}
                    onToggle={(option) => toggleList("actType", option)}
                  />
                </Field>
                <Field
                  label="Describe your act *"
                  htmlFor="apply-actDescription"
                  error={errors.actDescription}
                >
                  <textarea
                    id="apply-actDescription"
                    className="civic-apply-textarea"
                    data-invalid={Boolean(errors.actDescription) || undefined}
                    rows={5}
                    value={state.actDescription}
                    onChange={(e) => set("actDescription", e.target.value)}
                    placeholder="What should we expect?"
                  />
                </Field>
                <Field
                  label="Link to your work"
                  hint="Website, social media, video, etc."
                  htmlFor="apply-workLink"
                >
                  <input
                    id="apply-workLink"
                    type="url"
                    className="civic-apply-input"
                    value={state.workLink}
                    onChange={(e) => set("workLink", e.target.value)}
                    placeholder="https://"
                  />
                </Field>
              </section>
            ) : null}

            {state.category === "other" ? (
              <section className="civic-apply-section">
                <h2 className="civic-apply-section-h">Your idea</h2>
                <p className="civic-apply-section-sub">
                  Tell us what you want to bring to PorchFest.
                </p>
                <Field
                  label="Name / organization *"
                  htmlFor="apply-orgName"
                  error={errors.orgName}
                >
                  <input
                    id="apply-orgName"
                    className="civic-apply-input"
                    data-invalid={Boolean(errors.orgName) || undefined}
                    value={state.orgName}
                    onChange={(e) => set("orgName", e.target.value)}
                    placeholder="Your name or organization"
                  />
                </Field>
                <Field
                  label="What is your proposal? *"
                  htmlFor="apply-proposal"
                  error={errors.proposal}
                >
                  <textarea
                    id="apply-proposal"
                    className="civic-apply-textarea"
                    data-invalid={Boolean(errors.proposal) || undefined}
                    rows={6}
                    value={state.proposal}
                    onChange={(e) => set("proposal", e.target.value)}
                    placeholder="Describe what you want to do at PorchFest"
                  />
                </Field>
                <Field
                  label="Links"
                  hint="Website, social media, portfolio, etc."
                  htmlFor="apply-otherLinks"
                >
                  <input
                    id="apply-otherLinks"
                    type="url"
                    className="civic-apply-input"
                    value={state.otherLinks}
                    onChange={(e) => set("otherLinks", e.target.value)}
                    placeholder="https://"
                  />
                </Field>
              </section>
            ) : null}

            <div className="civic-apply-actions">
              <button
                type="button"
                className="civic-apply-btn civic-apply-btn--ghost"
                onClick={() => {
                  setErrors({});
                  setStage("category");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <ChevronLeft aria-hidden="true" size={16} />
                Back
              </button>
              <button
                type="submit"
                className="civic-apply-btn civic-apply-btn--primary"
              >
                Review application
              </button>
            </div>
          </form>
        ) : null}

        {/* ----- stage 3 · review ----------------------------------------- */}
        {stage === "review" ? (
          <section
            className="civic-apply-stage"
            aria-label="Review your application"
          >
            <h2 className="civic-apply-section-h">Look it over</h2>
            <p className="civic-apply-section-sub">
              This is exactly what we will receive.
            </p>

            <div className="civic-apply-review">
              <div className="civic-apply-review-section">
                <p className="civic-apply-review-h">Contact</p>
                <dl className="civic-apply-review-grid">
                  <ReviewItem label="Name" value={state.name} />
                  <ReviewItem label="Email" value={state.email} />
                  <ReviewItem label="Phone" value={state.phone} />
                  <ReviewItem label="City" value={state.city} />
                </dl>
              </div>
              <div className="civic-apply-review-section">
                <p className="civic-apply-review-h">{meta.label}</p>
                <dl className="civic-apply-review-grid">
                  {state.category === "musician" ? (
                    <>
                      <ReviewItem
                        label="Artist / band"
                        value={state.artistName}
                      />
                      <ReviewItem label="Genre" value={state.genre} />
                      <ReviewItem label="Music link" value={state.musicLink} />
                      <ReviewItem
                        label="Second link"
                        value={state.musicLink2}
                      />
                      <ReviewItem label="Band size" value={state.bandSize} />
                      <ReviewItem
                        label="PorchFest history"
                        value={
                          state.porchfestHistory === "first"
                            ? "First time applying"
                            : state.porchfestHistory === "returning"
                              ? "Returning performer"
                              : ""
                        }
                      />
                      <ReviewItem
                        label="Flint based"
                        value={
                          state.flintConnection === "yes"
                            ? "Yes, Flint-based"
                            : state.flintConnection === "nearby"
                              ? "Nearby (Genesee County)"
                              : "Outside the area"
                        }
                      />
                      <ReviewItem
                        label="30+ minute set"
                        value={state.canDoThirty}
                      />
                      <ReviewItem label="Equipment" value={state.equipment} />
                      <ReviewItem label="Own PA" value={state.ownPA} />
                      <ReviewItem label="Bio" value={state.bio} wide />
                      <ReviewItem
                        label="Accessibility"
                        value={state.accessNeeds}
                        wide
                      />
                    </>
                  ) : null}
                  {state.category === "vendor" ? (
                    <>
                      <ReviewItem
                        label="Business"
                        value={state.businessName}
                      />
                      <ReviewItem label="Food types" value={state.foodType} />
                      <ReviewItem label="Link" value={state.vendorLink} />
                      <ReviewItem label="Footprint" value={state.footprint} />
                      <ReviewItem
                        label="On-site needs"
                        value={state.vendorNeeds}
                      />
                      <ReviewItem
                        label="Vended before"
                        value={state.vendedBefore}
                      />
                      <ReviewItem
                        label="What they serve"
                        value={state.foodDescription}
                        wide
                      />
                    </>
                  ) : null}
                  {state.category === "entertainer" ? (
                    <>
                      <ReviewItem label="Act name" value={state.actName} />
                      <ReviewItem label="Act type" value={state.actType} />
                      <ReviewItem label="Work link" value={state.workLink} />
                      <ReviewItem
                        label="Description"
                        value={state.actDescription}
                        wide
                      />
                    </>
                  ) : null}
                  {state.category === "other" ? (
                    <>
                      <ReviewItem label="Name / org" value={state.orgName} />
                      <ReviewItem label="Links" value={state.otherLinks} />
                      <ReviewItem
                        label="Proposal"
                        value={state.proposal}
                        wide
                      />
                    </>
                  ) : null}
                </dl>
              </div>
            </div>

            <label
              className="civic-apply-agree"
              data-invalid={Boolean(errors.agree) || undefined}
            >
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => {
                  setAgree(e.target.checked);
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.agree;
                    return next;
                  });
                }}
              />
              <span>
                This is accurate and I want to take part in PorchFest 2026.
                Applying is free; nothing is owed to submit.
              </span>
            </label>
            {errors.agree ? (
              <p className="civic-apply-error" role="alert">
                {errors.agree}
              </p>
            ) : null}

            {submitState.kind === "error" ? (
              <div
                className="civic-apply-callout"
                data-tone="error"
                role="alert"
              >
                Submitting did not go through: {submitState.message}. Your
                answers are still here; please try again.
              </div>
            ) : null}

            <div className="civic-apply-actions">
              <button
                type="button"
                className="civic-apply-btn civic-apply-btn--ghost"
                onClick={() => setStage("form")}
              >
                <ChevronLeft aria-hidden="true" size={16} />
                Edit application
              </button>
              <button
                type="button"
                className="civic-apply-btn civic-apply-btn--primary"
                disabled={fetching}
                onClick={handleSubmit}
              >
                {fetching ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </section>
        ) : null}

        {/* ----- stage 4 · received ----------------------------------------- */}
        {stage === "done" && submitState.kind === "success" ? (
          <section
            className="civic-apply-success"
            aria-label="Application received"
          >
            <span className="civic-apply-success-mark">
              <Check aria-hidden="true" size={28} />
            </span>
            <h2>Application received</h2>
            <p>
              {submitState.duplicate
                ? "We already had an application for this email and category; this one is on file with it. We review everything and reply by email."
                : "It is saved on our side as of right now. We review everything and reply by email."}
            </p>
            <div className="civic-apply-receipt">
              <span>Ref {submitState.sourceKey}</span>
              {submitState.backupRecorded ? (
                <span>Backup recorded</span>
              ) : null}
            </div>
            <div
              className="civic-apply-actions"
              style={{ justifyContent: "center" }}
            >
              <button
                type="button"
                className="civic-apply-link-btn"
                onClick={handleStartOver}
              >
                Submit another application
              </button>
            </div>
          </section>
        ) : null}

        {stage !== "done" ? (
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <button
              type="button"
              className="civic-apply-link-btn"
              onClick={handleStartOver}
            >
              Start over
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ReviewItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  if (!value.trim()) return null;
  return (
    <div
      className="civic-apply-review-item"
      style={wide ? { gridColumn: "1 / -1" } : undefined}
    >
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
