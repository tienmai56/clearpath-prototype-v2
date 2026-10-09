# Clearpath — source code handoff

Clearpath is an interactive teacher workspace prototype for IEP planning, progress monitoring, stakeholder notes, and individualized assignments.
It is a self-contained HTML, CSS and vanilla JavaScript app. No build step, package installation, API key or backend is required.

## Run locally

Clone the repository, then start the local server:

```sh
git clone https://github.com/elenchlabs/clearpath-prototype-v2.git
cd clearpath-prototype-v2
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open http://localhost:8000 in a browser.

On Windows, use `py` in place of `python3` if needed. Stop the server with Ctrl+C.
Use a local HTTP server for reliable browser storage and file attachment behavior.

## Code files

- `dist/index.html` — entry page and script loading order.
- `dist/styles.css` — application layout, responsive styles and print layouts.
- `dist/app.js` — fictional student data, IEP plans, class roster, progress, notes and comparisons.
- `dist/progress.js` — progress popup, uploads, mobile camera capture and evidence storage.
- `dist/assignments.js` — assignment/assessment generation, optional variations and rich text editing.
- `dist/selection.js` — student picker and progressive goal/objective selection, shared by the page and popup.
- `dist/guidance.js` — note-driven guidance updates, unread state, source-linked review and revised drafts.
- `dist/trials.js` — dated teaching plans, lesson assignments, class progress recording and review choices.

Keep all eight files together. There are no external image, font or package dependencies.

## Included flows

- Add students and manage IEP goals with nested SMART objectives.
- Review student progress and record results in a popup.
- Attach PDF, JPG or PNG evidence, use a compatible phone camera, or enter manually.
- Read weekly stakeholder notes, illustrated author profiles and a cited paragraph summary.
- Create guided materials from Notes without leaving the student page.
- Select students first, then choose each student’s goal, then an objective under that goal. Goals and objectives appear as earlier selections are completed.
- Generate an assignment or assessment and edit it in the rich text popup. Draft options, prompt-count, grade and goal-area controls are omitted; defaults and student guidance are applied automatically.
- Students with different goal areas receive separate sections in the generated document; their target mappings are retained.
- Optionally enable **Try two lesson versions**, explained as a small classroom experiment. Select at least two students in the same grade with goals in the same area, generate the lessons, then assign students randomly and set teaching/review dates.
- Start a plan to make assigned lessons current for the selected objectives; open and print each lesson.
- Record progress for the whole class: choose a student for evidence entry or enter several scores together.
- Review results and choose which lesson each student will use going forward.
- See new stakeholder inputs in My class and Notes, review updated guidance and its citations, then create a revised draft.
- Save and reopen drafts; print assignments.

## Prototype behavior

All seeded classroom records are fictional. AI drafting, automatic guidance and note summaries use editable demo templates/rules, not a live model. Review generated content before use.

Guidance refreshes locally whenever a note is saved and when the app opens. There is no live background AI or stakeholder ingestion service. New-input markers remain until the teacher explicitly reviews the update or creates a revised draft. Ava and Milo have fictional unread updates to demonstrate the flow. Existing browser data migrates without a reset.

Edits are saved in the current browser using localStorage (`clearpath-prototype-v1`). Uploaded evidence uses IndexedDB (`clearpath-evidence`). This repository contains the code and fictional seed data, not the records or uploads entered in a particular browser. There is no shared database, login system, OCR, or transfer of files between devices. Camera capture depends on the phone/browser.

The rich text toolbar uses the browser's native editing commands. 36 functional code checks passed; live visual, hardware camera and browser formatting checks were unavailable.

Use **About this prototype → Reset demo changes** to clear local demo edits.

## Hosting elsewhere

Upload the contents of `dist` to a static web host. The app uses hash-based navigation, so a server-side route handler is not needed. Deploy `dist` as the static site root. Hosting credentials are not part of this repository.

## Version

Source commit: `e2ab5a56c3e8ab64a1e4535c9018fab52465eb43`
