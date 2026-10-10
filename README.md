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
- `dist/goals.js` — goal metadata, add/edit form, objective drafting and per-student achievement status.

Keep all nine files together. There are no external image, font or package dependencies.

## Included flows

- Add students and add goals from the student’s Progress or IEP plan. Goal fields include Goal name, Content, Standard, Baseline, Goal deadline and Objectives. Standard and narrative baseline are optional.
- Enter objective skills in the goal form or leave them blank to generate editable SMART drafts. Objectives remain numbered and nested beneath their goal; teachers approve and can edit them.
- Mark a specific student’s goal as **Achieved goal**, with a completion date and **Reopen goal** action. The class and IEP lists reflect when all of that student’s goals are achieved. Changing goal content or objective skills reopens the goal; metadata edits preserve its status.
- Existing goal, objective and progress links are retained. Missing historical standard/baseline details are left blank rather than fabricated.
- Review student progress and record results in a popup.
- Attach PDF, JPG or PNG evidence, use a compatible phone camera, or enter manually.
- Read weekly stakeholder notes, illustrated author profiles and a cited paragraph summary.
- Start guided materials from Notes in a popup, then review the generated drafts in an assignment overview.
- Select students first, then choose each student’s goal, then an objective under that goal. Goals and objectives appear as earlier selections are completed. Full student names are not repeated beneath the selectors; multiple-student rows retain compact initials and accessible labels.
- Generate an assignment or assessment to see an alphabetical overview of the selected students, with a separate editable draft and Open draft action for each student. Draft options, prompt-count, grade and goal-area controls are omitted; defaults and student guidance are applied automatically.
- Each student receives a separate document matched to their chosen goal and objective. Editing one student’s draft does not change another’s. Drafts from the same generation stay grouped in Saved materials.
- Optionally enable **Try two lesson versions**, explained as a small classroom experiment. Select at least two students in the same grade with goals in the same area, generate the lessons, then assign students randomly and set teaching/review dates.
- Start a plan to make assigned lessons current for the selected objectives; open and print each lesson.
- Record progress for the whole class: choose a student for evidence entry or enter several scores together.
- Review results and choose which lesson each student will use going forward.
- See new stakeholder inputs in My class and Notes, review updated guidance and its citations, then select **Create revised draft** to open the rich text editor directly. The suggested-plan preview and redundant AI setup step are removed from this flow. Revised drafts preserve the original assignment and retain teacher-authored content with updated teaching notes.
- See **Assignment history** at the end of each student’s Progress tab, with creation and last-modified dates. Opening or saving unchanged content does not update the modification date. Older creation dates that were never stored display Not recorded.
- The redundant objective heading/current-lesson line and Progress records section are removed. Recorded progress, charts, and underlying evidence logs are preserved.
- Save and reopen drafts; print assignments.

## Prototype behavior

All seeded classroom records are fictional. AI drafting, automatic guidance and note summaries use editable demo templates/rules, not a live model. Review generated content before use.

Guidance refreshes locally whenever a note is saved and when the app opens. There is no live background AI or stakeholder ingestion service. New-input markers remain until the teacher explicitly reviews the update or creates a revised draft. Ava and Milo have fictional unread updates to demonstrate the flow. Existing browser data migrates without a reset.

Edits are saved in the current browser using localStorage (`clearpath-prototype-v1`). Uploaded evidence uses IndexedDB (`clearpath-evidence`). This repository contains the code and fictional seed data, not the records or uploads entered in a particular browser. There is no shared database, login system, OCR, or transfer of files between devices. Camera capture depends on the phone/browser.

The rich text toolbar uses the browser's native editing commands. 49 functional code checks passed for goal creation, editing, achievement and migration, plus assignment overviews, revisions, audit dates, guidance and teaching plans; live visual, hardware camera and browser formatting checks were unavailable.

Use **About this prototype → Reset demo changes** to clear local demo edits.

## Hosting elsewhere

Upload the contents of `dist` to a static web host. The app uses hash-based navigation, so a server-side route handler is not needed. Deploy `dist` as the static site root. Hosting credentials are not part of this repository.

## Version

Source commit: `a6604499e145c44a0cb2f4da56874a7823f8295f`
