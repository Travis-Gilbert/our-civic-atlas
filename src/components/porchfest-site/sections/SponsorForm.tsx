// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ScrollReveal from '../components/ScrollReveal';
import { SPONSOR_TIERS, SPONSOR_CATEGORIES } from '../porchfest-data';
import { resolveBrowserGraphqlEndpoint } from '@/lib/api/graphql/endpoints';
import {
  C,
  serif,
  sans,
  mono,
  cardGradient,
  cardBorder,
} from '../tokens';

// Sponsor interest is captured the same way every other application is: a
// submitEventApplication GraphQL mutation that writes to the Postgres
// event_applications ledger plus the backup-receipt outbox. No Formspree, no
// service credential in the browser - the public GraphQL endpoint is the only
// boundary. Sponsor-specific fields ride in categoryPayload.
const PORCHFEST_EVENT_SLUG = 'porchfest-2026';
const SUBMIT_SPONSOR_MUTATION = `
  mutation SubmitSponsorApplication($input: EventApplicationSubmitInput!) {
    submitEventApplication(input: $input) {
      application { id }
      created
      duplicate
      backupRecorded
    }
  }
`;

const labelStyle = {
  ...mono,
  display: 'block',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: 'rgba(240,235,228,.5)',
  marginBottom: 8,
};

const optionalStyle = {
  color: 'rgba(240,235,228,.25)',
  fontWeight: 400,
  marginLeft: 4,
};

const inputBase = {
  ...sans,
  width: '100%',
  padding: '12px 14px',
  borderRadius: 8,
  border: '1.5px solid rgba(240,235,228,.1)',
  background: 'rgba(240,235,228,.05)',
  color: C.heroText,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color .2s',
  boxSizing: 'border-box',
};

const errorTextStyle = {
  ...sans,
  fontSize: 13,
  color: C.error,
  marginTop: 4,
};

function TextInput({ id, type = 'text', value, onChange, placeholder, error, ...rest }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      aria-invalid={error ? 'true' : 'false'}
      aria-describedby={error ? `${id}-error` : undefined}
      style={{
        ...inputBase,
        borderColor: error ? C.error : focused ? C.teal : 'rgba(240,235,228,.1)',
      }}
      {...rest}
    />
  );
}

function TierRadio({ tier, selected, onSelect }) {
  const [hover, setHover] = useState(false);
  const border = selected
    ? C.teal
    : hover
    ? 'rgba(240,235,228,.16)'
    : 'rgba(240,235,228,.08)';
  const bg = selected
    ? 'rgba(42,122,123,.12)'
    : hover
    ? 'rgba(240,235,228,.07)'
    : 'rgba(240,235,228,.04)';

  return (
    <label
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '16px 12px',
        borderRadius: 10,
        textAlign: 'center',
        border: `1.5px solid ${border}`,
        background: bg,
        cursor: 'pointer',
        transition: 'all .25s',
        position: 'relative',
        display: 'block',
      }}
    >
      <input
        type="radio"
        name="tier"
        value={tier.id}
        checked={selected}
        onChange={() => onSelect(tier.id)}
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          border: `1.5px solid ${selected ? C.teal : 'rgba(240,235,228,.2)'}`,
          background: selected ? C.teal : 'transparent',
          position: 'absolute',
          top: 8,
          right: 8,
          transition: 'all .2s',
          display: 'block',
        }}
      />
      <div
        style={{
          ...serif,
          fontSize: 14,
          fontWeight: 700,
          color: C.heroText,
          marginBottom: 2,
        }}
      >
        {tier.name}
      </div>
      <div
        style={{
          ...mono,
          fontSize: 16,
          fontWeight: 700,
          color: C.tealBright,
        }}
      >
        {tier.price}
      </div>
    </label>
  );
}

function SuccessCard() {
  return (
    <div
      style={{
        background: cardGradient,
        border: `1.5px solid ${cardBorder}`,
        borderRadius: 16,
        padding: '56px 36px',
        boxShadow: '0 8px 40px rgba(0,0,0,.25)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `2px solid ${C.teal}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.tealBright} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      </div>
      <p
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: C.tealBright,
          marginBottom: 12,
        }}
      >
        Received
      </p>
      <h3
        style={{
          ...serif,
          fontSize: 28,
          fontWeight: 800,
          color: C.heroText,
          marginBottom: 12,
        }}
      >
        We got it.
      </h3>
      <p
        style={{
          ...sans,
          fontSize: 15,
          color: 'rgba(240,235,228,.5)',
          lineHeight: 1.7,
          maxWidth: '46ch',
          margin: '0 auto 24px',
        }}
      >
        We will reply within 48 hours.
      </p>
      <Link
        href="/"
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          color: C.heroText,
          textDecoration: 'none',
          borderBottom: `1px solid ${C.tealBright}`,
          paddingBottom: 2,
        }}
      >
        Back to Porchfest
      </Link>
    </div>
  );
}

export default function SponsorForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsoringAs, setSponsoringAs] = useState('');
  const [tier, setTier] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    const handler = (e) => setTier(e.detail);
    window.addEventListener('select-sponsor-tier', handler);
    return () => window.removeEventListener('select-sponsor-tier', handler);
  }, []);

  const validate = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'Required';
    if (!lastName.trim()) errs.lastName = 'Required';
    if (!email.trim()) errs.email = 'Required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!tier) errs.tier = 'Pick a sponsorship level';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNetworkError(false);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setTimeout(() => {
        const firstAlert = formRef.current?.querySelector('[role="alert"]');
        if (firstAlert) firstAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }
    setSubmitting(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const normalizedEmail = email.trim().toLowerCase();
      const selectedTier = SPONSOR_TIERS.find((t) => t.id === tier);
      const input = {
        eventSlug: PORCHFEST_EVENT_SLUG,
        category: 'sponsor',
        displayName: fullName || normalizedEmail,
        contactName: fullName || null,
        contactEmail: normalizedEmail,
        contactPhone: phone.trim() || null,
        bio: message.trim() || null,
        flintBased: false,
        categoryPayload: {
          // Human-readable level + amount so the workspace shows "Gold / $500".
          tier: selectedTier?.name ?? tier,
          tierPrice: selectedTier?.price ?? null,
          sponsoringAs: sponsoringAs || null,
          message: message.trim() || null,
        },
        // One sponsor email is one intake row: a double submit updates rather
        // than duplicates, matching the apply form's sourceKey convention.
        sourceKey: `public:sponsor:${normalizedEmail}`,
      };

      const res = await fetch(resolveBrowserGraphqlEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: SUBMIT_SPONSOR_MUTATION,
          variables: { input },
        }),
      });

      if (!res.ok) throw new Error(`GraphQL returned ${res.status}`);
      const json = await res.json();
      if (json.errors?.length) {
        throw new Error(json.errors[0].message ?? 'GraphQL error');
      }
      setSubmitted(true);
    } catch {
      setNetworkError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="sponsor-form"
      style={{
        padding: '80px clamp(20px,5vw,80px)',
        maxWidth: 780,
        margin: '0 auto',
      }}
    >
      <ScrollReveal>
        <p
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            color: C.tealBright,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          Get Started
        </p>
        <h2
          style={{
            ...serif,
            fontSize: 'clamp(24px, 3.5vw, 36px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 8,
            color: C.heroText,
            textAlign: 'center',
          }}
        >
          Become a sponsor.
        </h2>
        <p
          style={{
            ...sans,
            fontSize: 15,
            color: 'rgba(240,235,228,.5)',
            lineHeight: 1.7,
            maxWidth: '50ch',
            margin: '0 auto 40px',
            textAlign: 'center',
          }}
        >
          Fill this out. We will reply within 48 hours. No commitment until we talk.
        </p>
      </ScrollReveal>

      {submitted ? (
        <SuccessCard />
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          noValidate
          className="sponsor-form-card"
          style={{
            background: cardGradient,
            border: `1.5px solid ${cardBorder}`,
            borderRadius: 16,
            padding: '40px 36px',
            boxShadow: '0 8px 40px rgba(0,0,0,.25)',
          }}
        >
          <div
            className="sponsor-form-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <label htmlFor="first-name" style={labelStyle}>First Name *</label>
              <TextInput
                id="first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                error={errors.firstName}
              />
              {errors.firstName && (
                <p id="first-name-error" role="alert" aria-live="polite" style={errorTextStyle}>
                  {errors.firstName}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="last-name" style={labelStyle}>Last Name *</label>
              <TextInput
                id="last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                error={errors.lastName}
              />
              {errors.lastName && (
                <p id="last-name-error" role="alert" aria-live="polite" style={errorTextStyle}>
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="email" style={labelStyle}>Email *</label>
            <TextInput
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              error={errors.email}
            />
            {errors.email && (
              <p id="email-error" role="alert" aria-live="polite" style={errorTextStyle}>
                {errors.email}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="phone" style={labelStyle}>
              Phone<span style={optionalStyle}>Optional</span>
            </label>
            <TextInput
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="sponsoring-as" style={labelStyle}>
              Sponsoring as<span style={optionalStyle}>Optional</span>
            </label>
            <select
              id="sponsoring-as"
              value={sponsoringAs}
              onChange={(e) => setSponsoringAs(e.target.value)}
              style={{
                ...inputBase,
                WebkitAppearance: 'none',
                appearance: 'none',
                cursor: 'pointer',
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path fill='none' stroke='%23F0EBE488' stroke-width='1.5' d='M1 1.5l5 5 5-5'/></svg>\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 40,
              }}
            >
              <option value="">Select one...</option>
              {SPONSOR_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Sponsorship Level *</label>
            <div
              className="sponsor-tier-selector"
              role="radiogroup"
              aria-label="Sponsorship level"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {SPONSOR_TIERS.map((t) => (
                <TierRadio
                  key={t.id}
                  tier={t}
                  selected={tier === t.id}
                  onSelect={setTier}
                />
              ))}
            </div>
            {errors.tier && (
              <p role="alert" aria-live="polite" style={errorTextStyle}>
                {errors.tier}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label htmlFor="message" style={labelStyle}>
              Anything you want us to know?<span style={optionalStyle}>Optional</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ideas for activation, questions about deliverables, or anything else."
              style={{
                ...inputBase,
                minHeight: 100,
                resize: 'vertical',
                fontFamily: sans.fontFamily,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...mono,
              width: '100%',
              padding: 14,
              border: 'none',
              borderRadius: 8,
              background: C.teal,
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              cursor: submitting ? 'wait' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: 8,
              transition: 'background .2s',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Sponsorship Interest'}
          </button>

          {networkError && (
            <p
              role="alert"
              aria-live="polite"
              style={{
                ...sans,
                fontSize: 13,
                color: C.error,
                marginTop: 16,
                textAlign: 'center',
              }}
            >
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      )}

      <style>{`
        .sponsor-form-card input::placeholder,
        .sponsor-form-card textarea::placeholder {
          color: rgba(240,235,228,.2);
        }
        .sponsor-form-card select:focus,
        .sponsor-form-card textarea:focus,
        .sponsor-form-card input:focus {
          border-color: ${C.teal};
        }
        @media (max-width: 600px) {
          .sponsor-form-row { grid-template-columns: 1fr !important; }
          .sponsor-form-card { padding: 28px 20px !important; }
          .sponsor-tier-selector { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 420px) {
          .sponsor-tier-selector { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
