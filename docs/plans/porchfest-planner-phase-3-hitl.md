# Porchfest Planner Phase 3 — Human-in-the-loop steps

Phase 3 is implemented end-to-end on `feat/porchfest-planner` in
`our-civic-atlas` + `our-civic-atlas-backend`. Three pieces require
work outside this branch before the loop closes:

1. **Cross-repo Stripe handler patch** (`CTHNA/porchfest-2026`).
2. **Set `PORCHFEST_WEBHOOK_SECRET`** on both repos' deploy targets.
3. **Real-device mobile smoke test** (iOS Safari + Android Chrome).

Plus the Phase 1/2 leftovers, still open:

- **Vercel domain alias + CNAME** for `porchfest.ourcivicatlas.org`
  (see Phase 1 HITL doc).
- **Magic-link invites** for the five planners (Phase 2 HITL —
  `scripts/invite_planner.py`).

---

## 1. CTHNA-side Stripe webhook patch

This is the seam between the porchfest application site and the
atlas planner. The patch lives in
`~/Tech Dev Local/Creative/Website/CTHNA/porchfest-2026/` (whichever
file already handles `checkout.session.completed`).

Wire contract the atlas side expects:

```
POST  $ATLAS_WEBHOOK_BASE/webhooks/porchfest-vendor
Headers:
  content-type: application/json
  x-porchfest-signature: <hex(hmac_sha256(raw-body, PORCHFEST_WEBHOOK_SECRET))>
Body (utf-8 json):
  {
    "tenantSlug":      "flint",
    "eventLayerSlug":  "porchfest-2026",
    "businessName":    "BBQ Steve",
    "vendorTier":      "pop_up" | "food_truck",
    "contactName":     "Steve Z.",
    "contactEmail":    "steve@example.org",
    "needs":           "power, water",
    "defaultLng":      -83.6972,
    "defaultLat":      43.0184,
    "idempotencyKey":  "<stripe checkout session id>"
  }
```

The atlas dedupes by `idempotencyKey` (it lands inside the
placement's `notes` blob as `[stripe] <key>`). Stripe retries of the
same checkout session are safe — no duplicate pins.

### Drop-in handler

Replace your current `checkout.session.completed` block in the
CTHNA Stripe handler with this pattern:

```js
// CTHNA/porchfest-2026 — Stripe webhook handler
import { createHmac } from "node:crypto";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Atlas-side base URL. In production this is the porchfest sidecar
// public URL (e.g., https://porchfest.ourcivicatlas.org with the
// sidecar reachable through the same domain via Vercel routes, OR
// the dedicated sidecar host). Locally: http://127.0.0.1:4010.
const ATLAS_WEBHOOK_BASE = process.env.ATLAS_WEBHOOK_BASE;
const ATLAS_WEBHOOK_SECRET = process.env.PORCHFEST_WEBHOOK_SECRET;

// Center of Carriage Town's central courtyard. Stripe-driven
// placements drop here in gray; planners drag them to their real
// spot. Keep this in sync with the atlas Phase 1 fixture.
const DEFAULT_LNG = -83.6972;
const DEFAULT_LAT = 43.0184;

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,                           // raw body, not parsed json
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const vendor = await loadVendorFromSession(session);

    const payload = {
      tenantSlug: "flint",
      eventLayerSlug: "porchfest-2026",
      businessName: vendor.businessName,
      vendorTier: vendor.tier,                // "pop_up" | "food_truck"
      contactName: vendor.contactName ?? "",
      contactEmail: vendor.email ?? "",
      needs: vendor.needs ?? "",
      defaultLng: DEFAULT_LNG,
      defaultLat: DEFAULT_LAT,
      idempotencyKey: session.id,             // Stripe session id
    };

    // HMAC is computed over the EXACT bytes we send. Do the
    // JSON.stringify once and reuse the result for both the
    // signature and the body to avoid byte drift.
    const bodyBytes = Buffer.from(JSON.stringify(payload), "utf8");
    const signature = createHmac("sha256", ATLAS_WEBHOOK_SECRET)
      .update(bodyBytes)
      .digest("hex");

    const response = await fetch(
      `${ATLAS_WEBHOOK_BASE}/webhooks/porchfest-vendor`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-porchfest-signature": signature,
        },
        body: bodyBytes,
      },
    );
    if (!response.ok) {
      console.error(
        "Atlas webhook rejected:",
        response.status,
        await response.text(),
      );
      // Don't fail the Stripe webhook — the payment succeeded. Log
      // and move on; Stripe will not retry checkout.session.completed
      // for this case, but the atlas can be repaired by re-running
      // an admin sync script in the future.
    }
  }

  res.json({ received: true });
}
```

`loadVendorFromSession(session)` is wherever the CTHNA code already
maps Stripe sessions to the vendor application record. The shape
above is what the atlas needs.

---

## 2. Env vars

Set on both sides — value must match exactly.

```
# our-civic-atlas-backend (apps/graphql-server)
PORCHFEST_WEBHOOK_SECRET=<random 64-hex-char string>

# CTHNA/porchfest-2026
PORCHFEST_WEBHOOK_SECRET=<same>
ATLAS_WEBHOOK_BASE=https://<sidecar host>     # production
ATLAS_WEBHOOK_BASE=http://127.0.0.1:4010      # local dev
```

Generate the secret once:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store in your secret manager (1Password / Vercel env / Railway env);
NEVER commit it.

---

## 3. Real-device mobile smoke test

Phase 3 ships the `planner_mobile` surface — bottom-sheet palette,
larger touch targets, the existing EditableGeoJsonLayer drag works
via touch. The long-press-to-arm-drag pattern from the spec is
**partially implemented** via the palette toggle (tap "Drag mode" to
arm, then drag). A pure "long-press a selected pin to drag" gesture
detector is not in this branch — the palette gating works equivalent
well in testing on the small Carriage Town pin density.

Test checklist on a real device (browser dev-tools mobile emulation
is not sufficient — touch event timing is different):

1. iOS Safari: `https://porchfest.ourcivicatlas.org` (once DNS is
   live) or `http://<your-laptop-IP>:3000/open-flint-atlas/plan/porchfest-2026`
   over the same WiFi.
2. Verify pinch-zoom and two-finger pan work on the map.
3. Toggle Edit mode. The palette should appear as a bottom sheet.
4. Tap a pin → confirm selection halo.
5. Tap "Drag mode" in the palette → drag the selected pin → confirm
   it commits and broadcasts to other browsers on SSE.
6. Tap a category swatch → drop a new pin → confirm `pending_placement`
   style if dropped via Stripe (gray + dashed) vs. normal otherwise.
7. Switch to 3D — pinch / two-finger-drag should rotate + pitch.
8. Print → "Open in new tab" → "Save as PDF" — confirm the SVG
   pins render and the legend matches.

Repeat on Android Chrome. File any gesture quirks against the same
branch — the touch target + bottom-sheet wiring is concentrated in
`PlannerClient.tsx` and `PlannerPalette.tsx`.

---

## 4. Phase 1 + 2 leftovers (still open)

- **Vercel domain alias** `porchfest.ourcivicatlas.org` → CNAME
  `cname.vercel-dns.com`. See `docs/plans/porchfest-planner-phase-1-hitl.md`.
- **Magic-link planner invites** for Derek, Henna, Robbie, etc. —
  run `python3 scripts/invite_planner.py --email ... --display-name ...`
  on the backend repo for each planner. The script prints a URL you
  paste into Slack/SMS/email.

---

## "What working looks like" — Phase 3 acceptance

1. Travis runs `sqlx migrate run` against the live DB. Migrations
   0015 + 0016 apply cleanly on top of 0014.
2. Travis posts a fake vendor through the CTHNA Stripe handler in
   test mode. Within 2 seconds a gray pin labeled with the business
   name appears at -83.6972, 43.0184 on every planner's map.
3. Henna selects the pin and drags it onto Mason Street. Robbie's
   browser shows the pin move in real time. The status flips from
   `pending_placement` to `placed` automatically because the drag
   commits a Geometry update (the gray-out visual goes away).
4. Henna posts a note: "Steve confirmed he's bringing the small
   trailer this year, fits in spot M3." Derek's browser shows the
   note appear in the right rail.
5. Derek hits "3D" in the chrome. The map tilts; OSM building
   footprints extrude. Pins float at ~60 m above ground so they're
   readable over the buildings.
6. Derek saves the current view as "Mason & First overview" via the
   Bookmarks menu. Henna clicks the bookmark and the camera flies
   to the saved angle.
7. The morning of: Travis opens `/open-flint-atlas/plan/porchfest-2026/print`,
   hits "Save as PDF" in his browser, prints page 3 for each
   volunteer's task list. Robbie gets his three intersections; the
   contact tree is on the bottom of the page.
