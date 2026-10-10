# Clearpath teacher workspace

Interactive prototype for IEP planning, student progress, assignments, lesson comparisons, and stakeholder notes. All seeded students, notes, and results are fictional. AI drafting and automatic guidance use editable templates and deterministic demo rules, not a connected model.

## Current experience

- **Create & Track Goals** replaces the IEP plans roster with a student-first workspace: **IEP Goal**, **Service Time**, and **Notes**. Select a student, goal, then objective to record progress; expand goal details to edit the goal, nested objectives, or measurement plan.
- **Service Time** logs the service, provider, date, minutes, and optional linked goal. Optional session notes appear with their provider in Notes and refresh instructional guidance. Logs persist in this browser; no service-minute compliance calculation is implied.
- **Notes** now lives in Create & Track Goals. Class alerts, citations, and lesson-update reviews open the matching student there.

- **Generate assignments** opens with two simple cards: **Create assignments** and **Create lesson variants**. Saved materials and teaching plans are secondary links; there are no creation-page tabs.
- Assignments: select students alphabetically, then their goals and objectives, and generate an assignment or assessment. Each student gets an independently editable rich-text draft and appears in the assignment overview.
- Lesson variants: select at least two students in the same grade, choose from one list of shared goals, then one list of shared established objectives under that goal, and generate two versions, review them, assign students randomly, and set a teaching schedule. An explicit start activates the plan; class evidence and dated reviews show what happens next.
- Shared goals match normalized goal content within the same area; objectives match normalized skill text under that goal. Dates, accuracy targets, and individual accommodations remain student-specific. Changing the selected group clears any target that is no longer shared. Custom paraphrases are not matched semantically in this prototype.
- Each student has an **Assignments & assessments** tab for their own materials, assigned lessons, and teaching plans. Saving a document opened from a student profile returns to that student's materials. The dated assignment audit remains at the end of Progress.
- IEP goals include name, content, standard, narrative baseline, goal deadline, and numbered nested objectives. SMART drafts are editable before approval. Achievement is recorded per student and goal. Existing objective IDs and progress links survive edits and migration.
- Notes have illustrated stakeholder portraits, weekly/source filtering, and a paragraph summary with clickable citations. New notes update guidance proposals; unread indicators remain until reviewed. **Create revised draft** opens an editable revision directly.
- **Record progress** is a popup: device upload, mobile QR upload, or manual entry. Teachers still score the evidence; no OCR is performed.

## Mobile photo transfer

Choose **Scan using mobile device** in the progress popup. Scan the QR with a phone camera, sign into the **same ChatGPT account** if requested, and choose or take a JPG/PNG photo. Photos arrive automatically in the desktop popup, with thumbnails. Select Next and enter the score, then Save progress.

This is a real cross-device transfer, backed by a Worker, D1 metadata, and private R2 objects. It does not synchronize the rest of the classroom workspace.

- Sessions are bound to the authenticated Site visitor (`oai-authenticated-user-id`) plus a random QR key; the server stores only the key hash. Every session, upload, download, acknowledgement, and deletion checks ownership.
- Codes expire after 15 minutes. Up to five attachments are allowed, with a 10 MB limit per photo; existing desktop attachments reduce available slots. PNG/JPEG signatures and MIME types are checked. Concurrent uploads cannot exceed the session limit.
- Received images are removed from R2 after desktop acknowledgement. Moving to scoring, switching methods, or closing the popup closes the transfer. Expired sessions and abandoned objects are removed in bounded batches when a later transfer is created; this is **not a scheduled deletion guarantee**.
- Saved evidence is held in IndexedDB on the recording computer. Classroom records remain in browser localStorage using the existing `clearpath-prototype-v1` key. Keep the same Site origin to retain the current demo data. Clearing browser storage removes local records and attachments.
- The phone page and API use the existing Site sign-in and audience. No external QR service, image-hosting service, or separate account system is used.

## Code map

| Location | Purpose |
| --- | --- |
| `public/clearpath/` | Existing imperative frontend, styles, and desktop/mobile transfer clients |
| `app/workspace.html`, `app/route.ts` | Main workspace document served at `/` |
| `app/phone/` | Phone upload page |
| `app/api/transfers/[[...path]]/route.ts` | Authenticated transfer API |
| `lib/photo-transfer.ts` | Ownership checks, QR generation, uploads, polling, and cleanup |
| `db/schema.ts`, `drizzle/` | D1 schema and checked-in SQL migrations |
| `.openai/hosting.json` | Existing Site identity and logical DB/R2 bindings |
| `build/`, `scripts/`, `vite.config.ts` | Supported Vinext/Sites build and deployment integration |
| `tests/` | Functional UI, migration, and cross-device transfer regression checks |

The previous buildless `dist/` source has moved to `public/clearpath/`. `dist/` is now generated build output. It must not be committed.

## Run and validate

Use Node 24 (Node 22.13+ for the app) and pnpm. Install with `pnpm install --frozen-lockfile`. Run `pnpm dev` for development, `pnpm build` for a production build, and `pnpm test` plus `pnpm typecheck` to validate. The transfer tests use Node's built-in SQLite, actual migration SQL, an in-memory R2 adapter, and the frontend client against the API handler.

For a local production preview with storage, build first and apply the generated schema to the local D1 database:

```sh
pnpm exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_bent_kitty_pryde.sql
pnpm start
```

Apply that initial schema only once per local database. For future schema changes, edit `db/schema.ts`, run `pnpm db:generate`, and review/commit the generated SQL and metadata. Hosted deployment provisions the logical D1/R2 bindings and applies migrations; no runtime DDL is used.

The hosted Site uses its platform identity header. Do not deploy to a separate host without an authentication boundary that supplies and protects that header. The transfer API intentionally rejects anonymous requests.

Validation covers the two creation paths, per-student materials and audit dates, goals and migration, guidance and lesson comparisons, authorization and expiry, upload limits, actual photo delivery into the scoring popup, and late/cancelled requests. Browser visual QA and a physical phone scan were not available in the execution environment.
