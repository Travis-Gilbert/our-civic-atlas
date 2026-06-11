// @ts-nocheck
import { C, serif, sans, mono } from '../../tokens';
import { MARKETING } from '../../board-data';

const STATUS_COLOR = {
  draft: 'rgba(240,235,228,.45)',
  scheduled: C.gold,
  live: C.tealBright,
  sent: C.tealBright,
};

function StatusChip({ status }) {
  if (!status) return null;
  return (
    <span style={{
      ...mono,
      fontSize: 9,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '.14em',
      color: STATUS_COLOR[status] || 'rgba(240,235,228,.45)',
      background: 'rgba(240,235,228,.05)',
      padding: '4px 8px',
      borderRadius: 4,
    }}>
      {status}
    </span>
  );
}

function AssetLink({ label, url, children }) {
  if (!url) {
    return (
      <span style={{ ...sans, fontSize: 14, color: 'rgba(240,235,228,.55)' }}>
        {label} {children}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...sans,
        fontSize: 14,
        color: C.tealBright,
        textDecoration: 'none',
        borderBottom: '1px dashed rgba(53,145,143,.35)',
      }}
    >
      {label} {children}
    </a>
  );
}

function Group({ title, children, empty }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.gold, marginBottom: 14 }}>
        {title}
      </div>
      {empty ? (
        <div style={{ ...sans, fontSize: 13, color: 'rgba(240,235,228,.35)' }}>
          Nothing here yet.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {children}
        </ul>
      )}
    </div>
  );
}

function RowShell({ children }) {
  return (
    <li style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '10px 0',
      borderBottom: '1px solid rgba(240,235,228,.05)',
      flexWrap: 'wrap',
    }}>
      {children}
    </li>
  );
}

export default function MarketingPlan() {
  const { facebookPosts = [], pressReleases = [], posters = [], notes } = MARKETING;

  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        background: 'rgba(26,24,22,.6)',
        border: '1px solid rgba(240,235,228,.08)',
        borderRadius: 12,
        padding: 28,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.tealBright, marginBottom: 6 }}>
              Marketing Plan
            </div>
            <div style={{ ...serif, fontSize: 22, fontWeight: 800, color: C.heroText }}>
              The actual posts, releases, and posters
            </div>
          </div>
        </div>

        <Group title="Facebook Posts" empty={facebookPosts.length === 0}>
          {facebookPosts.map((p, i) => (
            <RowShell key={i}>
              <AssetLink label={p.label} url={p.url} />
              <StatusChip status={p.status} />
            </RowShell>
          ))}
        </Group>

        <Group title="Press Releases" empty={pressReleases.length === 0}>
          {pressReleases.map((p, i) => (
            <RowShell key={i}>
              <AssetLink label={p.label} url={p.url}>
                {p.date && (
                  <span style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.35)', marginLeft: 8 }}>
                    {p.date}
                  </span>
                )}
              </AssetLink>
              <StatusChip status={p.status} />
            </RowShell>
          ))}
        </Group>

        <Group title="Posters" empty={posters.length === 0}>
          {posters.map((p, i) => (
            <RowShell key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {p.imageUrl && (
                  <a href={p.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={p.imageUrl}
                      alt={p.label}
                      style={{
                        width: 60,
                        height: 84,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid rgba(240,235,228,.08)',
                      }}
                    />
                  </a>
                )}
                <div>
                  <div style={{ ...sans, fontSize: 14, color: C.heroText }}>
                    {p.label}
                  </div>
                  {p.locationsPosted && p.locationsPosted.length > 0 && (
                    <div style={{ ...sans, fontSize: 12, color: 'rgba(240,235,228,.5)', marginTop: 4 }}>
                      Posted at: {p.locationsPosted.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </RowShell>
          ))}
        </Group>

        {notes && (
          <div style={{
            ...sans,
            fontSize: 13,
            color: 'rgba(240,235,228,.5)',
            paddingTop: 16,
            borderTop: '1px solid rgba(240,235,228,.06)',
          }}>
            {notes}
          </div>
        )}
      </div>
    </section>
  );
}
