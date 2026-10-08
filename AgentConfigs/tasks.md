# NEXUS — Build Tasks

Do these in order. Each task is sized for one branch/PR. Tick a box only
when its **Done when** is true. Before starting a task, read the doc it
points to (`flows` = `nexus_flows.md`, `rules` = `erp_agent_rules.md`).
Don't start a phase until the previous milestone passes.

Rule of thumb: finish one thin vertical slice end to end (Phase 7) before
widening to more modules.

---

## Phase 0 — Project setup

- [x] **T0.1** Create the repo with `/server` (Express) and `/client` (Vite + React).
  Done when: each starts with one command; `.env.example` is committed.--done
- [x] **T0.2** Install server deps: `express sequelize pg pg-hstore bcrypt jsonwebtoken zod cors helmet dotenv`, dev: `sequelize-cli nodemon jest supertest`.
  Done when: server boots and returns 200 on `/health`.--done
- [x] **T0.3** Add `/docs` with prd, rules, flows, design, models, tasks, plus a short `CLAUDE.md` pointing the agent to them.
  Done when: an agent opening the repo is told to read `prd.md` first.--done
- [x] **T0.4** ESLint + Prettier, local Postgres database, git branch convention (one branch per task).--done

---

## Phase 1 — Database foundation

- [] **T1.1** Put `nexus_models.js` at `server/src/models/index.js`; connect via `DATABASE_URL`.
  Done when: `sequelize.authenticate()` succeeds.--done
- [] **T1.2** Set up sequelize-cli and write the initial migration for every table, enum and unique index (dependency order).
  Done when: `db:migrate` on an empty DB creates all tables and `db:migrate:undo:all` leaves it clean. (rules 34)--done
- [] **T1.3** Seeders: one Super Admin (hashed password), `IdSequence` rows for `STKIT FCKIT DAKIT SAKIT EXKIT`, one current `AcademicTerm`.
  Done when: seeding twice doesn't duplicate anything.--done
- [x] **T1.4** `generateInstituteIds(prefix, count, transaction)` util (flows 1a, rules 5).
  Done when: a test running 50 concurrent calls yields zero duplicates, and a bulk call of 500 reserves one contiguous block.--done
- [x] **T1.5** Export enum value arrays from one shared constants file.--done

---

## Phase 2 — Auth & access control

- [x] **T2.1** Login: resolve the account type from the `instituteId` prefix (STKIT → Student, etc.); parents log in by email.
  Done when: all six roles can log in; wrong password returns a generic error.--done
- [x] **T2.2** JWT issue/verify with payload `{ id, role, departmentId }`; hashed passwords; `password` never in responses (rules 6).--done
- [x] **T2.3** Middleware: `requireAuth`, `requireRole(...roles)`.--done
- [x] **T2.4** Scoping helpers: department scope, teacher → `SubjectAllocation`, parent → `ParentStudent`, student → self (rules 38, 39).--done
- [x] **T2.5** Change-password endpoint.--done
- [x] **T2.6** Auth tests: a student cannot call a teacher endpoint; Department Admin A cannot read department B.--done

---

## Phase 3 — Frontend foundation

- [x] **T3.1** Tailwind config from `design.md` §9; load IBM Plex Sans/Serif/Mono.--done
- [x] **T3.2** App shell: sidebar + top bar, role-aware nav config.--done
- [x] **T3.3** Auth context, login page, protected routes per role.--done
- [x] **T3.4** Shared components: Button variants, Field with error state, `StatusBadge` mapped to every enum, DataTable, EmptyState, Modal, ConfirmDialog, Toast.--done
- [x] **T3.5** API client with token handling and error mapping.--done

**Milestone M0:** log in as the seeded Super Admin and see the empty shell, styled per `design.md`.

---

## Phase 4 — Org setup (Super Admin) · flows 1

- [ ] **T4.1** Departments CRUD.
- [ ] **T4.2** Create/list/deactivate Department Admins (gets `DAKIT` id).
- [ ] **T4.3** Create/list Exam Staff (gets `EXKIT` id).
- [ ] **T4.4** Academic terms CRUD; exactly one `isCurrent`.
  Done when: setting a term current unsets the previous one in the same transaction.

---

## Phase 5 — Curriculum (Department Admin) · flows 2, 10

- [ ] **T5.1** Create `Class` (department, batchYear, semester); friendly error on the unique clash.
- [ ] **T5.2** Create `Division`s under a class.
- [ ] **T5.3** Create `Subject`s attached to a class (unique code).
- [ ] **T5.4** Marking-scheme editor: add `AssessmentComponent`s per subject; validate the sum equals the intended total; block edits once marks exist (rules 19, 24).
- [ ] **T5.5** Elective slots + options: type PE/OE, cross-department offering, optional `maxCapacity`.
- [ ] **T5.6** "Clone class to next batch": copies subjects, components and slots into a new `batchYear`, never touching the old class (rules 3).

---

## Phase 6 — People & allocation · flows 3, 4

- [ ] **T6.1** Create teachers (single) with `FCKIT` id; list/search.
- [ ] **T6.2** Teacher CSV bulk import with block ID reservation and a row-level error report.
- [ ] **T6.3** Create students (single) with `STKIT` id, `batchYear`, `rollNumber`.
- [ ] **T6.4** Student CSV bulk import (same behavior as T6.2).
- [ ] **T6.5** Assign student(s) to a division → transactional bulk enrollment in core subjects (rules 11).
  Done when: re-running creates no duplicates; electives are not enrolled.
- [ ] **T6.6** Subject allocation UI (teacher + subject + class).
- [ ] **T6.7** Create parents and link to students via `ParentStudent`.
- [ ] **T6.8** Teacher "my subjects/classes" page.

---

## Phase 7 — Attendance (first vertical slice) · flows 6

- [ ] **T7.1** Create an `AttendanceSession` (only for subjects the teacher is allocated).
- [ ] **T7.2** Roster endpoint: enrollments for subject + term, including backlog students.
- [ ] **T7.3** Bulk mark attendance; `studentId` derived from the enrollment (rules 16).
- [ ] **T7.4** Edit with `editedAt` (rules 17).
- [ ] **T7.5** Student view: attendance % per subject, low-attendance highlight (computed live, rules 18).
- [ ] **T7.6** Parent view for the selected child.
- [ ] **T7.7** Department/teacher attendance report.

**Milestone M1 (demo):** admin sets up class → imports students → allocates teacher → teacher marks attendance → student and parent see the %.

---

## Phase 8 — Files, notes, assignments · flows 7, 8

- [ ] **T8.1** File storage (Cloudinary/S3) + upload middleware with type/size limits.
- [ ] **T8.2** Notes: teacher upload; students see notes only for enrolled subjects.
- [ ] **T8.3** Library (admin upload, everyone views).
- [ ] **T8.4** Assignments: teacher creates; student submits before the deadline, one per enrollment.
- [ ] **T8.5** Grading: marks + feedback, status to `ACCEPTED`; student sees the result.

---

## Phase 9 — Elective registration · flows 5

- [ ] **T9.1** Migration: add `registrationOpensAt` / `registrationClosesAt` to `ElectiveSlot` (PRD open decision 4).
- [ ] **T9.2** Student view of slots/options with seats remaining, within the window.
- [ ] **T9.3** Choose + confirm in a transaction with a row lock; create the `Enrollment` on confirm (rules 12, 13).
- [ ] **T9.4** Job that moves `CONFIRMED` → `LOCKED` when the window closes.
- [ ] **T9.5** Admin-approved swap after lock (rules 15).
- [ ] **T9.6** Concurrency test: N students racing for the last seat → exactly one succeeds.

---

## Phase 10 — Marks & subject results · flows 10

- [ ] **T10.1** Resolve PRD open decision 1 (pass criteria).
- [ ] **T10.2** Teacher marks-entry grid per component (partial save, keyboard friendly).
- [ ] **T10.3** `SubjectResult` computation service (sum of components, `isPass`).
- [ ] **T10.4** Student/parent view of component marks and subject results.

---

## Phase 11 — Examinations · flows 11

- [ ] **T11.1** Resolve PRD decisions 3 and 5 (exam → component mapping, who enters End Sem).
- [ ] **T11.2** Exam scheduling by Exam Staff.
- [ ] **T11.3** Question paper upload with draft → submitted → approved workflow.
- [ ] **T11.4** Hall tickets per enrollment + printable PDF (Plex Serif, grayscale-safe) (rules 26).
- [ ] **T11.5** Exam result entry (bulk); `isPass` from `Exam.passingMarks` (rules 27); sync into the mapped `ComponentMark`.
- [ ] **T11.6** Result processing: `ResultCard` from `SubjectResult`s, SGPA per PRD decision 2 (rules 28).
- [ ] **T11.7** Student/parent result view + printable marksheet.

---

## Phase 12 — Backlogs · flows 11a

- [ ] **T12.1** After processing, set `Enrollment.status` to `PASSED`/`FAILED` (rules 9).
- [ ] **T12.2** Create re-attempt enrollments for the next term (`attemptNumber + 1`, original class/subject).
- [ ] **T12.3** Allocation check: warn when a re-attempt subject has no teacher allocated in the new term.
- [ ] **T12.4** Makeup exams and hall tickets for re-attempts.
- [ ] **T12.5** Student dashboard shows current and backlog subjects together.

---

## Phase 13 — Fees · flows 12

- [ ] **T13.1** Fee structures CRUD (full-semester and per-subject).
- [ ] **T13.2** Student/parent fee view: dues, history.
- [ ] **T13.3** Payment initiation → `PENDING` `FeePayment`.
- [ ] **T13.4** Gateway webhook: verify signature, idempotent on `transactionRef`, set `SUCCESS`, issue `receiptNumber` (rules 31).
- [ ] **T13.5** Receipt PDF and admin defaulters list.

---

## Phase 14 — Announcements & leave · flows 13, 14

- [ ] **T14.1** Create announcements with targeting; wildcard nulls handled (rules 32).
- [ ] **T14.2** Role-filtered notice feed for students, teachers, parents.
- [ ] **T14.3** Leave requests (student or teacher) with the exactly-one-requester hook (rules 33).
- [ ] **T14.4** Department Admin approve/reject screen.

---

## Phase 15 — Online tests · flows 9

- [ ] **T15.1** Teacher test builder: questions, options, window, duration.
- [ ] **T15.2** Student attempt screen with timer; one attempt per test.
- [ ] **T15.3** Auto-scoring on submit.
- [ ] **T15.4** "Use as component marks": copy scores into `ComponentMark` with `sourceOnlineTestId`.

---

## Phase 16 — Live classes (optional)

- [ ] **T16.1** `Meeting` creation per subject/class and join link for enrolled students.

---

## Phase 17 — Agentic AI layer · flows 16

- [ ] **T17.1** Tool layer: wrap existing services (attendance, notes, exams, fees) as agent tools (rules 43).
- [ ] **T17.2** Student assistant (tool-calling) with a visible reasoning trace.
- [ ] **T17.3** Notes RAG: chunk, embed, retrieve scoped to enrolled subjects (rules 45).
- [ ] **T17.4** Grading assistant: draft marks/feedback only (rules 44).
- [ ] **T17.5** Attendance-risk agent on a schedule, producing draft notices.
- [ ] **T17.6** Admin report agent scoped to the admin's department.

---

## Phase 18 — Hardening & release

- [ ] **T18.1** Test coverage for the edge cases in `rules`: backlog flow, elective race, ID generation, scoping, payment webhook.
- [ ] **T18.2** Security pass: rate limiting on auth, helmet, validation on every route, no secrets in git.
- [ ] **T18.3** Audit pass: every marks/attendance/money write records actor and time (rules 37).
- [ ] **T18.4** Demo seed script: a department, two batches, a backlog student, electives, sample marks.
- [ ] **T18.5** README, setup guide, deployment, database backups.

**Milestone M-final:** the success criteria in `prd.md` §11 all pass on the demo data.
