# NEXUS — Application Flows

This document describes every operational flow in the system, step by step,
in the order data actually gets created. Use this alongside the Prisma
schema and `erp_agent_rules.md` when building any feature — it tells you
*what triggers what* so new code follows the same sequence instead of
inventing a different one.

---

## 1. Org Setup Flow (one-time / infrequent)

1. Super Admin logs in (seeded directly in DB on first setup, no public signup).
2. Super Admin creates a `Department` (name, code).
3. Super Admin creates a `DepartmentAdmin` account, linked to that department.
4. Super Admin creates `ExamStaff` accounts (college-wide, not tied to a single department).
5. Super Admin optionally creates `AcademicTerm` entries (e.g. "2026-ODD"), marking one as `isCurrent`.

---

## 1a. Institute ID Generation (applies whenever any role account is created)

Every account — Super Admin, Department Admin, Teacher, Student, Exam Staff — gets a human-readable `instituteId` in addition to its internal `cuid`, used for login/display (e.g. roll call, ID cards, search):

- Student → `STKIT` + zero-padded number
- Teacher/Faculty → `FCKIT` + zero-padded number
- Department Admin → `DAKIT` + zero-padded number
- Super Admin → `SAKIT` + zero-padded number
- Exam Staff → `EXKIT` + zero-padded number

1. On single account creation: atomically increment the matching `IdSequence.lastUsed` row for that prefix and use the returned number, formatted as `prefix + paddedNumber` (e.g. `STKIT0001`).
2. On bulk creation (CSV import of an entire batch of students, or bulk faculty onboarding): reserve a **block** of numbers in one atomic increment (increment `lastUsed` by the row count, not one at a time in a loop), then assign the reserved range across the rows being inserted. This avoids hundreds of sequential DB round-trips and avoids two concurrent imports racing for the same number.
3. `instituteId` is permanent once assigned — never reused, even if the account is later deactivated (soft-deleted).
4. This is separate from `Student.rollNumber`, which is only unique *within a division* (e.g. "Roll No. 7 in CSE-A") and can repeat across different divisions — `instituteId` is unique across the whole institute and never repeats.

---

## 2. Class & Curriculum Setup Flow (per department, per semester/batch)

1. Department Admin logs in — scoped to their own department only.
2. Department Admin creates a `Class`: (department, batchYear, semesterNumber). This is one curriculum instance — e.g. "CSE, batch 2024-28, Semester 3."
3. Department Admin creates `Division`s under that class (e.g. "A", "B") if the batch is large enough to split.
4. Department Admin creates `Subject`s and attaches each to the `Class` via `classId`. Default `subjectType = CORE`.
5. For elective slots, Department Admin creates an `ElectiveSlot` on the class (e.g. "PE-1", type PROGRAM_ELECTIVE) and adds `ElectiveOption` rows — each pointing to a subject, optionally offered by a different department (open electives), optionally capped with `maxCapacity`.
6. **Policy change handling**: the following year, Department Admin does NOT edit last year's `Class`/`Subject`/`ElectiveSlot` rows. They create a brand-new `Class` row for the new `batchYear`, with its own subjects and slots. Old batches keep working off their original rows untouched.

---

## 3. Faculty Onboarding & Subject Allocation Flow

1. Department Admin creates `Teacher` accounts (single add or bulk CSV import), scoped to their department.
2. Department Admin creates a `SubjectAllocation`: (teacher, subject, class) — this is "assigning subjects to faculty."
3. Teacher logs in and sees only the subjects/classes they've been allocated — queried via `SubjectAllocation.teacherId`, never a manual list.
4. If a teacher needs to be reassigned mid-term, a new `SubjectAllocation` row can be added/removed — old attendance/notes/assignments already created stay linked to whichever teacher originally created them (don't reassign historical `Note`/`Assignment`/`AttendanceSession` records).

---

## 4. Student Onboarding & Class Assignment Flow

1. Department Admin creates `Student` accounts (single add or bulk CSV import), setting `departmentId` and `batchYear`.
2. Department Admin assigns the student to a `Division` (which belongs to a specific `Class`). This is the "add student to class" action from the student's/admin's point of view.
3. **This single assignment action triggers a batch job**: for every CORE subject under that `Class`, create one `Enrollment` row for this student, this subject, this `academicTermId`, `attemptNumber = 1`. The admin does not manually enroll a student subject-by-subject.
4. Electives are NOT auto-enrolled in this step — they wait for the registration flow below.

---

## 5. Elective Registration Flow

1. Once a registration window opens (admin-controlled), the student's dashboard shows the `ElectiveSlot`s available for their `Class`, each with its `ElectiveOption`s.
2. Student picks a subject for each slot, creating a `StudentElectiveChoice` row with `status = PENDING`.
3. On confirm, the system checks `ElectiveOption.maxCapacity` against the current confirmed-choice count for that option, **inside a DB transaction** (or with a row lock), to avoid two students grabbing the last seat at the same time.
4. If capacity allows: choice status → `CONFIRMED`, and an `Enrollment` row is created for that student + chosen subject + current term.
5. If capacity is full: choice is rejected or placed on a waitlist (if you're building waitlisting) — the student is prompted to pick a different option.
6. After the registration window closes, all `CONFIRMED` choices move to `LOCKED`. Changes after lock require an explicit admin-approved swap, which itself creates a new choice + adjusts the corresponding `Enrollment`, rather than silently editing the locked row.

---

## 6. Attendance Flow

1. Teacher (via their `SubjectAllocation`) creates a `ClassSession`/`AttendanceSession` for a subject+class on a given date.
2. Teacher marks each present student's status by creating `AttendanceRecord` rows — one per `enrollmentId`, not per `studentId` directly. This is what allows a backlog student attending a junior class's session to be marked correctly against their own (older) enrollment.
3. If a correction is needed after the fact, update the record but set `editedAt` separately from `markedAt` — never silently overwrite the original timestamp.
4. Student views their attendance % — computed live from `AttendanceRecord`, grouped by `(studentId, subjectId, academicTermId)`, never a manually maintained running total.
5. Parent views the same attendance data for their linked child via `ParentStudent`.

---

## 7. Notes & Study Material Flow

1. Teacher uploads a `Note` (topic + pdfUrl), tied to their subject.
2. Students enrolled in that subject (via `Enrollment`) can view/download it.
3. Department Admin/Super Admin can additionally upload general resources via `Library`, which is not subject-scoped and visible more broadly.

---

## 8. Assignment & Submission Flow

1. Teacher creates an `Assignment` for a subject: title, description, marks, deadline.
2. Student submits work by creating a `Submission`, tied to their `enrollmentId` (not just `studentId`), with `status = UPLOAD` initially.
3. On actual submission (vs draft save, if you support that), status moves to `SUBMITTED`, `submittedAt` is set, and `isLate` is computed against the assignment's deadline.
4. Teacher grades: sets `marksAwarded`, optional feedback, `status = ACCEPTED`, `acceptedAt` set.
5. Student views grade/feedback on their submission.

---

## 9. Online Test Flow

1. Teacher creates an `OnlineTest` for a subject: title, duration, start/end time, total marks.
2. Teacher adds `TestQuestion`s, each with `TestOption`s (one or more marked `isCorrect`).
3. Student starts a `TestAttempt` (only within the test's start/end window) — one attempt per student per test, enforced by a unique constraint.
4. Student answers by creating `TestAnswer` rows, each referencing a `selectedOptionId`.
5. On submission, `submittedAt` is set and `score` is computed by comparing each `TestAnswer.selectedOptionId` against the question's correct option, summing `TestQuestion.marks` for correct answers.

---

## 10. Marking Scheme Setup & Internal Assessment Flow

This flow governs how a subject's total marks break into components
(IA-1, IA-2, Mid Sem, End Sem, Lab Internal, Lab External/Oral, etc.),
and how the teacher enters marks for each — freely, however they choose
to arrive at that number.

1. When a subject is created (or set up shortly after), Department Admin defines its `AssessmentComponent`s — e.g. a theory subject might get IA-1 (10), IA-2 (10), Mid Sem (30), End Sem (50); a lab subject might get Lab Internal (25), Lab External/Oral (25). This is structural, same as the subject's credits — set once, not per student.
2. The app layer should validate that the components' `maxMarks` sum to the subject's intended total (100, 50, whatever the department uses) — this isn't a DB constraint, check it when components are created/edited.
3. For each component, the teacher decides **how** to arrive at a student's mark — the schema does not force a method:
   - **Manual**: teacher directly enters a `ComponentMark.marksObtained` for each student based on their own assessment (assignments, classroom performance, viva, whatever they used).
   - **Online test**: teacher creates an `OnlineTest` (see Section 9), students attempt it, and the resulting `TestAttempt.score` is copied into `ComponentMark.marksObtained` with `sourceOnlineTestId` set for traceability.
   - **Formal exam**: for components tied to a Exam Department-run exam (typically End Sem, sometimes Lab External), the mark comes from `ExamResult` once Exam Staff enters it — copy that value into `ComponentMark.marksObtained` with `sourceExamId` set.
4. Each `ComponentMark` is tied to an `enrollmentId`, not just a `studentId` — so a backlog student's re-attempt at a subject gets an entirely fresh set of component marks under their new `attemptNumber`, never mixed with the original attempt's marks.
5. Once all of a subject's components have marks entered for a given enrollment, compute/update `SubjectResult`: sum `ComponentMark.marksObtained` against the subject's total `maxMarks`, derive `isPass` (compare against the subject's/department's passing threshold), and store it as one row per enrollment.
6. `SubjectResult` rows across all of a student's subjects for a term are what feed into the term-level `ResultCard` (Section 11 below) — not raw `ExamResult` directly, since a subject's final score is a composition of multiple components, not just one exam.

---

## 11. Examination Flow (Exam Department)

1. Exam Staff schedules an `Exam` for a subject+class+term: exam type (MIDTERM/FINAL/INTERNAL/MAKEUP), date, max marks, passing marks.
2. Exam Staff creates/uploads a `QuestionPaper` for that exam, moving it through `DRAFT` → `SUBMITTED` → `APPROVED` status as it goes through review.
3. Exam Staff generates `HallTicket`s — one per `enrollmentId` (not per student), so a student with both a current-term exam and a backlog exam gets two separate hall tickets, potentially different centers/times.
4. After the exam, Exam Staff (or faculty, depending on your process) enters `ExamResult` rows per `enrollmentId`: marks obtained, `isPass` derived from the exam's `passingMarks`.
5. **Backlog handling**: a re-attempt is just another `Exam` row with `examType = MAKEUP`, tied to the enrollment with the matching `attemptNumber`. No separate backlog-exam table is needed.
6. Once all of a student's exam results for a term are in, Exam Staff triggers result processing, generating a `ResultCard`: aggregated total marks, percentage, SGPA for that `(student, academicTerm)` pair.

---

## 12. Fees Flow

1. Department Admin (or Super Admin) defines a `FeeStructure`: department, batchYear, semesterNumber, `feeType` (FULL_SEMESTER or PER_SUBJECT), amount, due date, term.
2. **Regular students** are billed under `FULL_SEMESTER` fee structures — `enrollmentId` stays null on the resulting `FeePayment`.
3. **Backlog students** are billed under `PER_SUBJECT` fee structures instead — one `FeePayment` per backlog `enrollmentId`, not the full-semester amount.
4. Student initiates payment (Razorpay/Stripe or similar). A `FeePayment` row is created with `status = PENDING` immediately.
5. Only when the payment gateway's webhook/callback confirms the transaction does the row update to `status = SUCCESS`, with `transactionRef` and `receiptNumber` set. Never mark success optimistically on redirect alone.
6. Parent can view/pay fees on behalf of their linked child through the same flow.

---

## 13. Notices / Announcements Flow

1. Super Admin, Department Admin, or Teacher creates an `Announcement`, setting exactly one creator field (`createdBySuperAdminId` / `createdByDeptAdminId` / `createdByTeacherId`) depending on who posted it.
2. Targeting fields (`targetDepartmentId`, `targetClassId`, `targetDivisionId`) are set based on intended audience — leaving a field `NULL` means "not scoped to this dimension," i.e. a wider audience, not "broken data."
3. Students/Teachers/Parents see announcements filtered by matching their own department/class/division against the (possibly null/wildcard) target fields.

---

## 14. Leave Request Flow

1. Either a `Student` or a `Teacher` creates a `LeaveRequest` — exactly one of `studentId`/`teacherId` is set, never both.
2. Department Admin reviews and sets `status` to `APPROVED` or `REJECTED`, recording `resolvedByDeptAdminId` and `resolvedAt`.
3. The approval routing branches in application code based on which requester field is populated — don't assume a single universal approval chain for both roles.

---

## 15. Parent Access Flow

1. Parent account is linked to one or more `Student` records via `ParentStudent`.
2. On login, Parent selects (or is shown, if only one) which child's data to view.
3. All parent-facing screens (attendance, results, fees, notices) reuse the exact same queries as the student-facing screens, just executed with the child's `studentId` instead of a self-referencing session — do not build separate parent-only query logic that could drift from the student-side logic.

---

## 16. Agentic AI Layer Flows (built after core modules are stable)

1. **Student Assistant**: resolves any subject/attendance/schedule question through `Enrollment`, exactly like the REST API does — reuses the same queries, doesn't write parallel logic that might miss backlog subjects.
2. **RAG Notes Search**: retrieval is scoped to subjects the querying student is actually enrolled in (via `Enrollment`) — never returns material from a subject/term the student isn't enrolled in.
3. **Faculty Grading Assistant**: reads a `Submission`, drafts marks/feedback, but always leaves `status = UPLOAD`/`SUBMITTED` (not `ACCEPTED`) until the teacher reviews and confirms — human-in-the-loop, never auto-finalizes a grade.
4. **Attendance Risk Agent**: runs on a schedule, queries `AttendanceRecord` aggregates per `(student, subject, term)`, and creates a **draft** `Announcement` or notification for a human to review/send — does not send directly to students.
5. **Admin Report Agent**: answers natural-language questions by querying across `FeePayment`, `ExamResult`, `AttendanceRecord` etc., scoped to the department admin's own department unless they're a Super Admin.

---

## How to use this document

Each numbered flow describes the exact sequence of table writes/reads for
that feature. When implementing a new endpoint, find the matching flow
here first — if the step order doesn't match what's described, that's a
signal you're about to introduce a bug (e.g. skipping the elective
capacity-transaction step, or enrolling a student subject-by-subject
instead of via the class-assignment batch trigger).
