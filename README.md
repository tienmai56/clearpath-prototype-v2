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
- `dist/assignments.js` — assignment/assessment drafting, optional variations and rich text editing.

Keep all five files together. There are no external image, font or package dependencies.

## Included flows

- Add students and manage IEP goals with nested SMART objectives.
- Review student progress and record results in a popup.
- Attach PDF, JPG or PNG evidence, use a compatible phone camera, or enter manually.
- Read weekly stakeholder notes, illustrated author profiles and a cited paragraph summary.
- Create guided materials from Notes without leaving the student page.
- Generate assignments or assessments for selected students in a rich text editor.
- Optionally create two variations, randomize same-grade students, and compare observations.
- Save and reopen drafts; print assignments.

## Prototype behavior

All seeded classroom records are fictional. AI drafting and note summaries use editable demo templates/rules, not a live model. Review generated content before use.

Edits are saved in the current browser using localStorage (`clearpath-prototype-v1`). Uploaded evidence uses IndexedDB (`clearpath-evidence`). This repository contains the code and fictional seed data, not the records or uploads entered in a particular browser. There is no shared database, login system, OCR, or transfer of files between devices. Camera capture depends on the phone/browser.

The rich text toolbar uses the browser's native editing commands. Functional code checks passed; live visual, hardware camera and browser formatting checks were unavailable.

Use **About this prototype → Reset demo changes** to clear local demo edits.

## Hosting elsewhere

Upload the contents of `dist` to a static web host. The app uses hash-based navigation, so a server-side route handler is not needed. Deploy `dist` as the static site root. Hosting credentials are not part of this repository.

## Version

Source commit: `e566cfaf162621401b5f93a4d52b88bdf5b36064`
