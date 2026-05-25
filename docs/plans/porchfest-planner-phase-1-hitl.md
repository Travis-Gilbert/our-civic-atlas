# Porchfest Planner Phase 1 — Human-in-the-loop steps

One manual step remains before the final
"porchfest.ourcivicatlas.org renders the carriage town map"
acceptance check passes.

## 1. ✅ KML import — DONE

The fixture at
`src/data/open-flint-atlas/fixtures/porchfest-2026.json` was
generated from the live Carriage Town Porch Fest 2026 Google My
Maps document via:

```sh
node scripts/kml-to-event-layer.mjs \
  --in ~/Downloads/Carriage\ Town\ Porch\ Fest\ 2026.kmz \
  --out src/data/open-flint-atlas/fixtures/porchfest-2026.json \
  --slug porchfest-2026 \
  --title "Carriage Town Porchfest 2026" \
  --follow-networklink
```

Result: **76 placements** (after_party=1, amenity=8, food_court=2,
kid_zone=1, music=14, parking=2, rest_area=2, restroom=1,
vendor=45) + 3 non-Point features (Walkways/Opening LineStrings)
skipped. Zero TODO_CATEGORY entries.

To re-import (e.g., when Travis edits the My Maps doc):

```sh
npm install   # picks up xml2js + adm-zip devDependencies
node scripts/kml-to-event-layer.mjs \
  --in <kmz-or-kml-path> \
  --out src/data/open-flint-atlas/fixtures/porchfest-2026.json \
  --follow-networklink   # follows the GMM NetworkLink shortcut
```

The `--follow-networklink` flag means re-imports always pick up
the latest pins from My Maps without needing a fresh export.

### Seeding Postgres

Once `DATABASE_URL` is set, run the seeder from the backend repo:

```sh
DATABASE_URL=postgres://...                 \
  python3 scripts/seed_porchfest_2026.py    \
    --fixture ../Open-Flint-Atlas-main-release/src/data/open-flint-atlas/fixtures/porchfest-2026.json
```

The seeder is idempotent — running twice yields the same DB state.

## 2. ⏳ Vercel domain alias + DNS CNAME for `porchfest.ourcivicatlas.org`

The middleware at `src/middleware.ts` already rewrites the
`porchfest.ourcivicatlas.org` and `porchfest.localhost:3000` hosts
to the `/open-flint-atlas/plan/porchfest-2026` route. What's
missing is the production hostname binding.

To unblock:

1. Vercel project → Settings → Domains → Add Domain → enter
   `porchfest.ourcivicatlas.org`.
2. Vercel will display the required CNAME target
   (`cname.vercel-dns.com`).
3. At the DNS registrar for `ourcivicatlas.org`, add a CNAME record
   for the `porchfest` subdomain pointing at `cname.vercel-dns.com`.
4. Wait for Vercel to verify (usually under a minute once DNS
   propagates).
5. Make sure the `feat/porchfest-planner` branch is deployed (or
   merged to main) before pinning the alias to a deployment.

For local testing without the Vercel alias, add this line to
`/etc/hosts`:

```
127.0.0.1 porchfest.localhost
```

Then `npm run dev` and visit `http://porchfest.localhost:3000`.
