# Agent Rules — College ERP Development

These are binding rules for any agent (AI or human) building features on this
codebase. They exist because the domain has non-obvious edge cases that are
easy to get wrong on a first pass. Read this before writing code for any
module below.

---

## 1. Source-of-truth rules (never violate these)

1. **Never key attendance, exams, fees, or submissions off `student.current_semester`.**
   Always key off `student_enrollments`. `current_semester` is a *display*
   field only — it tells you what to show on a profile page, not what a
   student is actually enrolled in.
2. **Never hardcode a semester's subject list in code or config.** Subjects
   per semester come from `curricula` + `curriculum_slots`, scoped by
   `(department, batch_year, semester_number)`. If you find yourself writing
   `if semester == 3: subjects = [...]`, stop — query the curriculum table.
3. **Never edit an existing `curricula` row when policy changes.** Create a
   new row with a new `effective_from` date. Old batches must keep pointing
   at their original curriculum forever, even after graduation.
4. **Never hard-delete a user, subject, or enrollment record.** Use
   `is_active = false` or a `status` field. Historical marks/attendance must
   remain queryable for a student who has left or a faculty who resigned.
5. **Never generate an `instituteId` (STKIT/FCKIT/DAKIT/SAKIT/EXKIT) by
   counting existing rows (`COUNT(*) + 1`) or by looping one-at-a-time
   inserts into `IdSequence`.** Always go through an atomic increment on
   the matching `IdSequence.lastUsed` row, and for bulk imports reserve a
   whole block in one increment — this is what prevents two concurrent
   creates (or a mid-import crash) from producing a duplicate or
   skipped ID. Once assigned, an `instituteId` is never reused, even for
   a deactivated account.

---

## 2. Enrollment & backlog rules

6. A student can have **multiple concurrent enrollments across different
   semesters simultaneously** (current subjects + backlog subjects). Any
   query that assumes "a student is in exactly one semester's subjects" is
   wrong. Always fetch enrollments by `(student_id, academic_term_id)`, not
   by semester.
7. `attempt_number` on `student_enrollments` distinguishes first attempts
   from re-attempts. When generating a hall ticket, marksheet, or fee
   invoice for a backlog subject, always resolve which curriculum/attempt
   you're dealing with — don't assume attempt 1.
8. When a student fails a subject, do **not** mutate their existing
   enrollment row. Insert the failed status on the original row, then
   create a **new** `student_enrollments` row for the re-attempt term with
   an incremented `attempt_number`. This preserves history of every attempt.
9. Backlog students may attend sessions alongside a junior batch. Session
   and attendance logic must never filter by "students in this batch" —
   filter by "enrollments for this subject in this term," full stop.

---

## 3. Elective registration rules

10. Elective choice and elective enrollment are **two different actions**,
   not one. A student "choosing" an elective (`student_elective_choices`)
   must not immediately create a `student_enrollments` row — enrollment is
   only created after the choice is `confirmed`, so an admin can enforce
   registration windows and capacity before it's locked in.
11. **Capacity checks must be transactional.** When confirming an elective
    choice against a `slot_options.max_capacity`, wrap the seat-count check
    and the insert in a single DB transaction (or use a row lock / atomic
    counter). Two students confirming the same last seat at the same
    millisecond is a real scenario at registration-deadline time — design
    for it now, don't patch it after a bug report.
12. Open electives may be `offered_by_department_id` different from the
    student's own department. Any UI/query that filters electives by "my
    department" is wrong — filter by what's in `slot_options` for the slot,
    regardless of department.
13. Once a `student_elective_choices` row is `locked`, treat it as
    immutable in normal flow. Changes after lock require an explicit
    admin-approved swap action, not a silent update.

---

## 4. Attendance rules

14. Attendance is recorded per `(session_id, enrollment_id)`, never per
    `(student_id, subject_id)` directly — this is what makes backlog
    attendance and multi-attempt subjects work without special-casing.
15. Attendance correction after the fact must set `edited_at` separately
    from `marked_at`. Never silently overwrite the original timestamp —
    faculty disputes over attendance are common and you need an audit
    trail of what was marked when, and what was changed when.
16. Attendance percentage calculations must scope to
    `(student_id, subject_id, academic_term_id)`, and must be computed
    fresh from `attendance_records`, not cached/stored redundantly, unless
    you also build a cache-invalidation path for corrections.

---

## 5. Exams & results rules

17. Re-exams/makeups for backlog students are just another row in `exams`
    with `exam_type = 'makeup'`, tied to the correct `enrollment_id`
    (correct `attempt_number`). Do not build a separate "backlog exam"
    table — it duplicates logic that `exams` + `exam_results` already
    handle.
18. Hall tickets are generated per enrollment, not per student. A student
    with a current-semester exam and a backlog exam in the same term needs
    **two** hall tickets, potentially at different centers/times — never
    assume one hall ticket per student per term.
19. `is_pass` on `exam_results` must be derived from `passing_marks` on the
    `exams` row at write time, not recomputed ad hoc elsewhere — if passing
    criteria differ by exam type, this keeps the logic in one place.

---

## 6. Marking scheme & internal assessment rules

20. A subject's total marks are never a single flat number in the
    schema — they're composed of `AssessmentComponent`s (IA-1, IA-2,
    Mid Sem, End Sem, Lab Internal, Lab External, etc.), each with its
    own `maxMarks`. Never hardcode "subject total = 100" anywhere;
    always derive it by summing the subject's components.
21. The component **scheme** (structure, max marks) is set up once per
    subject by Department Admin — treat it like curriculum data, not
    per-student data. The component **marks** (`ComponentMark`) are
    entered per student per enrollment, by the teacher, however they
    choose to arrive at that number.
22. Never force a single "correct" method for entering internal marks.
    A teacher may enter marks manually, base them on an `OnlineTest`
    they ran, or (for exam-linked components) pull them from a formal
    `Exam`/`ExamResult`. The `entryMethod` field on `AssessmentComponent`
    is informational only — don't build validation that rejects a
    teacher's chosen method.
23. `ComponentMark` is keyed by `enrollmentId`, not `studentId` —
    exactly like attendance and exam results. A backlog student's
    re-attempt at a subject must get a fresh, empty set of component
    marks under the new `attemptNumber`, never carrying over or
    merging with the original attempt's marks.
24. When computing a subject's final score for a student
    (`SubjectResult`), sum `ComponentMark.marksObtained` across that
    enrollment's components — do not pull from `ExamResult` directly
    for the subject total, since `ExamResult` may represent only one
    component (e.g. just the End Sem paper) of several.

---

## 7. Fees rules

25. Determine `fee_type` before generating an invoice: `full_semester` for
    regular students, `per_subject` for backlog students taking only 1-2
    subjects. Never charge a backlog student full-semester fees by default.
26. `fee_payments.enrollment_id` is only set for `per_subject` fees; it's
    `NULL` for full-semester payments. Any reporting query must handle both
    cases, not assume `enrollment_id` is always present.
27. Payment status must have an explicit `pending`/`failed` state, not just
    `success`. Never mark a payment `success` until the payment gateway
    webhook/callback confirms it — do not optimistically mark success on
    redirect.

---

## 8. Notices, leave, check-ins

28. Notices with `target_department_id = NULL` mean **college-wide**, not
    "no department." Same logic for `target_batch_year = NULL` meaning "all
    batches." Never treat NULL as "broken data" and filter it out — it's a
    wildcard by design.
29. The same wildcard logic applies to `division_id`. Models like `subject_allocations`, `attendance_sessions`, `notes`, `assignments`, `meetings`, and `online_tests` use an optional `division_id` to target a specific division, or leave it NULL to target the entire class.
30. `leave_requests.requester_id` is shared between students and faculty.
    Approval routing logic must check the requester's role to decide who
    approves (faculty leave → HOD/admin; student leave → their faculty or
    admin) — don't assume a single approver chain for both.
31. `check_ins` is a generic table for gate/hostel/exam-hall check-ins. Add
    new `check_in_type` values instead of creating new tables when a new
    check-in context appears.
32. Parent accounts are authenticated primarily by **Phone Number**, not email. Email is optional and should not be relied upon as the primary unique identifier for parents.

---

## 9. General engineering discipline

31. Every new table needs `created_at`/`updated_at` at minimum. Prefer
    soft-delete flags over hard deletes across the whole schema, not just
    where explicitly called out above.
32. Any feature that touches money (fees) or academic record (marks,
    attendance) must be built with an audit trail from day one — who
    entered/changed it, and when. Do not add this "later," it's much
    harder to retrofit.
33. Role-based access checks belong in backend middleware, not just hidden
    UI elements. A student must not be able to hit a faculty-only endpoint
    even if the button is hidden client-side.
34. Before building a new module, check whether it can be modeled as
    "admin/faculty creates → student views/acts" (the pattern used by
    notes, assignments, notices). Most modules fit this shape — don't
    invent a new pattern unnecessarily.

---

## 10. Agentic AI layer rules (once core modules are stable)

35. Any agent tool that reads student data (attendance, notes, grades) must
    resolve through `student_enrollments`, exactly like the rest of the
    app — an agent tool that queries "subjects for this semester" naively
    will give wrong answers to backlog students. Reuse the same queries
    the REST API uses; don't write parallel query logic for the agent.
36. Agents that act autonomously (e.g. attendance-risk alerts, auto-drafted
    notices) must produce a **draft** for a human to review/send, not send
    directly, unless explicitly scoped and approved otherwise. Keep a
    human-in-the-loop step for anything that reaches a student's inbox or
    affects their record.
37. RAG over notes must scope retrieval to the subjects the querying
    student is actually enrolled in (via `student_enrollments`) — a
    student should not be able to retrieve another department's or another
    term's restricted material through the chat interface.

---

## How to use this file

Treat rules 1–9 as **non-negotiable data-modeling constraints** — violating
them will surface as real bugs during backlog/elective season, not in dev.
Rules 10 onward are workflow/process discipline. When in doubt about a new
feature, check if it fits an existing table shape before creating a new one.
