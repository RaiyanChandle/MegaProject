'use strict';

const { Sequelize, DataTypes } = require('sequelize');

// =====================================================================
// NEXUS — SEQUELIZE MODELS (converted from the Prisma schema)
// =====================================================================
// Same structure/sections as the Prisma version, same design rules:
//   - Enrollment is the single source of truth for "who is taking what".
//   - Class = one curriculum instance (department, batchYear, semester).
//   - Electives are slots with options, separate from a student's
//     confirmed choice.
//   - A subject's marks = sum of AssessmentComponents, entered freely
//     by the teacher per ComponentMark.
//   - instituteId (STKIT/FCKIT/DAKIT/SAKIT/EXKIT) is generated via
//     IdSequence, atomically, never by counting rows.
// See erp_agent_rules.md and nexus_flows.md — those stay valid
// regardless of ORM; only the model definitions below changed.
//
// Requires: npm i sequelize pg pg-hstore
// =====================================================================

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------
const uuidPk = {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
};

// ---------------------------------------------------------------------
// Enums (as reusable arrays for DataTypes.ENUM)
// ---------------------------------------------------------------------
const SUBJECT_TYPES = ['CORE', 'PROGRAM_ELECTIVE', 'OPEN_ELECTIVE'];
const ENROLLMENT_STATUSES = ['ENROLLED', 'PASSED', 'FAILED', 'WITHDRAWN'];
const ELECTIVE_CHOICE_STATUSES = ['PENDING', 'CONFIRMED', 'LOCKED', 'WITHDRAWN'];
const LEAVE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const FEE_TYPES = ['FULL_SEMESTER', 'PER_SUBJECT'];
const PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'];
const EXAM_TYPES = ['MIDTERM', 'FINAL', 'INTERNAL', 'MAKEUP'];
const QUESTION_PAPER_STATUSES = ['DRAFT', 'SUBMITTED', 'APPROVED'];
const ANNOUNCEMENT_TYPES = ['GLOBAL', 'DEPARTMENT', 'CLASS', 'DIVISION', 'TEACHER', 'PARENT'];
const SUBMISSION_STATUSES = ['UPLOAD', 'SUBMITTED', 'ACCEPTED'];
const COMPONENT_CATEGORIES = ['INTERNAL', 'EXTERNAL'];
const MARK_ENTRY_METHODS = ['MANUAL', 'ONLINE_TEST', 'FORMAL_EXAM'];


// =====================================================================
// SECTION 1: IDENTITY & ORG STRUCTURE
// =====================================================================

const SuperAdmin = sequelize.define('SuperAdmin', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "SAKIT0001"
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'super_admins', timestamps: true });

const Department = sequelize.define('Department', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'departments', timestamps: true });

// Manages one department: creates faculty/students, sets up classes,
// divisions, subjects, subject allocation, sends announcements.
const DepartmentAdmin = sequelize.define('DepartmentAdmin', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "DAKIT0001"
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false }, // -> SuperAdmin
}, { tableName: 'department_admins', timestamps: true });

const Teacher = sequelize.define('Teacher', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "FCKIT0001"
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, { tableName: 'teachers', timestamps: true });

const Student = sequelize.define('Student', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "STKIT0001" — institute-wide, never reused
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  // Class-level roll number (e.g. 1-60 within a division) — unique only
  // within a division, NOT globally. See indexes below.
  rollNumber: { type: DataTypes.STRING, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false }, // e.g. "2024-28" — key for curriculum versioning
  departmentId: { type: DataTypes.UUID, allowNull: false },
  divisionId: { type: DataTypes.UUID, allowNull: true },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'students',
  timestamps: true,
  indexes: [{ unique: true, fields: ['divisionId', 'rollNumber'] }],
});

const Parent = sequelize.define('Parent', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'parents', timestamps: true });

// Join table — a parent can have more than one child, and a student can
// (rarely) have more than one linked guardian.
const ParentStudent = sequelize.define('ParentStudent', {
  ...uuidPk,
  parentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
}, {
  tableName: 'parent_students',
  timestamps: true,
  indexes: [{ unique: true, fields: ['parentId', 'studentId'] }],
});

// Separate from teaching faculty. Handles question papers, exam
// scheduling, hall tickets, result processing.
const ExamStaff = sequelize.define('ExamStaff', {
  ...uuidPk,
  instituteId: { type: DataTypes.STRING, unique: true, allowNull: false }, // "EXKIT0001"
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false }, // -> SuperAdmin
}, { tableName: 'exam_staff', timestamps: true });


// =====================================================================
// SECTION 2: CURRICULUM STRUCTURE
// =====================================================================

// A Class = one curriculum instance: (department, batchYear, semester).
// A new row is created each semester per batch instead of mutating one,
// so a policy change never touches historical data.
const Class = sequelize.define('Class', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false }, // e.g. "CSE Sem 3"
  departmentId: { type: DataTypes.UUID, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false },
  semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'classes',
  timestamps: true,
  indexes: [{ unique: true, fields: ['departmentId', 'batchYear', 'semesterNumber'] }],
});

// A section within a Class (e.g. "A", "B").
const Division = sequelize.define('Division', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'divisions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['classId', 'name'] }],
});

const Subject = sequelize.define('Subject', {
  ...uuidPk,
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  credits: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 3 },
  subjectType: { type: DataTypes.ENUM(...SUBJECT_TYPES), allowNull: false, defaultValue: 'CORE' },
  classId: { type: DataTypes.UUID, allowNull: false },
  departmentId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, { tableName: 'subjects', timestamps: true });

// A slot in a Class that is a CHOICE rather than a fixed subject —
// e.g. "PE-1" or "OE-2".
const ElectiveSlot = sequelize.define('ElectiveSlot', {
  ...uuidPk,
  classId: { type: DataTypes.UUID, allowNull: false },
  slotName: { type: DataTypes.STRING, allowNull: false }, // "PE-1", "OE-2"
  slotType: { type: DataTypes.ENUM(...SUBJECT_TYPES), allowNull: false }, // PROGRAM_ELECTIVE or OPEN_ELECTIVE
  credits: { type: DataTypes.FLOAT, allowNull: false },
}, { tableName: 'elective_slots', timestamps: true });

// Which subjects can fill a slot. offeredByDepartmentId lets an open
// elective be taught by a department other than the student's own.
const ElectiveOption = sequelize.define('ElectiveOption', {
  ...uuidPk,
  slotId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  offeredByDepartmentId: { type: DataTypes.UUID, allowNull: false },
  maxCapacity: { type: DataTypes.INTEGER, allowNull: true }, // null = unlimited
}, {
  tableName: 'elective_options',
  timestamps: true,
  indexes: [{ unique: true, fields: ['slotId', 'subjectId'] }],
});

// A student's actual elective pick. Kept separate from Enrollment so a
// registration window / capacity check / lock step sits between
// choosing and being enrolled. Capacity confirmation must be done
// inside a DB transaction against ElectiveOption.maxCapacity.
const StudentElectiveChoice = sequelize.define('StudentElectiveChoice', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  slotId: { type: DataTypes.UUID, allowNull: false },
  chosenSubjectId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM(...ELECTIVE_CHOICE_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  chosenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'student_elective_choices',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId', 'slotId'] }],
});

// Which faculty teaches which subject for which class.
const SubjectAllocation = sequelize.define('SubjectAllocation', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  allocatedById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'subject_allocations',
  timestamps: true,
  indexes: [{ unique: true, fields: ['teacherId', 'subjectId', 'classId'] }],
});


// =====================================================================
// SECTION 3: ENROLLMENT — source of truth for "who is taking what"
// =====================================================================

const AcademicTerm = sequelize.define('AcademicTerm', {
  ...uuidPk,
  name: { type: DataTypes.STRING, unique: true, allowNull: false }, // "2026-ODD"
  startDate: { type: DataTypes.DATE, allowNull: false },
  endDate: { type: DataTypes.DATE, allowNull: false },
  isCurrent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'academic_terms', timestamps: true });

// Attendance, exams, fees, and submissions all key off THIS table, not
// off Student directly. A backlog student can have multiple concurrent
// rows here across different semesters/terms at once.
const Enrollment = sequelize.define('Enrollment', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, // 1 = first attempt, 2+ = backlog re-attempt
  status: { type: DataTypes.ENUM(...ENROLLMENT_STATUSES), allowNull: false, defaultValue: 'ENROLLED' },
}, {
  tableName: 'enrollments',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId', 'subjectId', 'academicTermId', 'attemptNumber'] }],
});


// =====================================================================
// SECTION 4: ATTENDANCE
// =====================================================================

const AttendanceSession = sequelize.define('AttendanceSession', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.STRING, allowNull: false },
  endTime: { type: DataTypes.STRING, allowNull: false },
  topic: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'attendance_sessions', timestamps: true });

// Keyed by enrollmentId, not studentId directly — lets a backlog
// student attending a junior batch's session get recorded correctly
// against their own (older) enrollment.
const AttendanceRecord = sequelize.define('AttendanceRecord', {
  ...uuidPk,
  sessionId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  present: { type: DataTypes.BOOLEAN, allowNull: false },
  markedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  editedAt: { type: DataTypes.DATE, allowNull: true }, // set only on correction — kept separate from markedAt for audit
}, {
  tableName: 'attendance_records',
  timestamps: true,
  indexes: [{ unique: true, fields: ['sessionId', 'enrollmentId'] }],
});


// =====================================================================
// SECTION 5: NOTES, LIBRARY, ASSIGNMENTS
// =====================================================================

const Note = sequelize.define('Note', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  topic: { type: DataTypes.STRING, allowNull: false },
  pdfUrl: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'notes', timestamps: true });

const Library = sequelize.define('Library', {
  ...uuidPk,
  title: { type: DataTypes.STRING, allowNull: false },
  url: { type: DataTypes.STRING, allowNull: false },
  uploadedById: { type: DataTypes.UUID, allowNull: false }, // -> SuperAdmin
}, { tableName: 'library', timestamps: true });

const Assignment = sequelize.define('Assignment', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.INTEGER, allowNull: false },
  deadline: { type: DataTypes.DATE, allowNull: false },
  pdfUrl: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'assignments', timestamps: true });

const Submission = sequelize.define('Submission', {
  ...uuidPk,
  assignmentId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM(...SUBMISSION_STATUSES), allowNull: false, defaultValue: 'UPLOAD' },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  acceptedAt: { type: DataTypes.DATE, allowNull: true },
  marksAwarded: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'submissions',
  timestamps: true,
  indexes: [{ unique: true, fields: ['assignmentId', 'enrollmentId'] }],
});

const Meeting = sequelize.define('Meeting', {
  ...uuidPk,
  roomName: { type: DataTypes.STRING, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  teacherId: { type: DataTypes.UUID, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'meetings', timestamps: true });


// =====================================================================
// SECTION 6: ANNOUNCEMENTS & LEAVE
// =====================================================================

const Announcement = sequelize.define('Announcement', {
  ...uuidPk,
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM(...ANNOUNCEMENT_TYPES), allowNull: false },
  // Targeting — NULL means "not scoped to this dimension" (wildcard =
  // broader audience), not "broken data." Loose fields, not enforced FKs.
  targetDepartmentId: { type: DataTypes.UUID, allowNull: true },
  targetClassId: { type: DataTypes.UUID, allowNull: true },
  targetDivisionId: { type: DataTypes.UUID, allowNull: true },
  createdBySuperAdminId: { type: DataTypes.UUID, allowNull: true },
  createdByDeptAdminId: { type: DataTypes.UUID, allowNull: true },
  createdByTeacherId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'announcements', timestamps: true });

// requester is either a Student or a Teacher (never both) — approval
// routing in application code must branch on which is set.
const LeaveRequest = sequelize.define('LeaveRequest', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: true },
  teacherId: { type: DataTypes.UUID, allowNull: true },
  fromDate: { type: DataTypes.DATE, allowNull: false },
  toDate: { type: DataTypes.DATE, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM(...LEAVE_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  resolvedByDeptAdminId: { type: DataTypes.UUID, allowNull: true },
  resolvedAt: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'leave_requests', timestamps: true });


// =====================================================================
// SECTION 7: FEES
// =====================================================================

const FeeStructure = sequelize.define('FeeStructure', {
  ...uuidPk,
  departmentId: { type: DataTypes.UUID, allowNull: false },
  batchYear: { type: DataTypes.STRING, allowNull: false },
  semesterNumber: { type: DataTypes.INTEGER, allowNull: false },
  feeType: { type: DataTypes.ENUM(...FEE_TYPES), allowNull: false, defaultValue: 'FULL_SEMESTER' },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: true },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
}, { tableName: 'fee_structures', timestamps: true });

const FeePayment = sequelize.define('FeePayment', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  feeStructureId: { type: DataTypes.UUID, allowNull: false },
  // Set only for PER_SUBJECT fees (backlog students) — null for FULL_SEMESTER.
  enrollmentId: { type: DataTypes.UUID, allowNull: true },
  amountPaid: { type: DataTypes.FLOAT, allowNull: false },
  paymentMethod: { type: DataTypes.STRING, allowNull: false },
  transactionRef: { type: DataTypes.STRING, allowNull: true },
  // Never mark SUCCESS optimistically on redirect — only on gateway webhook/callback.
  status: { type: DataTypes.ENUM(...PAYMENT_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  paidAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  receiptNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
}, { tableName: 'fee_payments', timestamps: true });


// =====================================================================
// SECTION 8: EXAMINATIONS (Exam Department)
// =====================================================================

const Exam = sequelize.define('Exam', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  classId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  examType: { type: DataTypes.ENUM(...EXAM_TYPES), allowNull: false, defaultValue: 'FINAL' }, // MAKEUP covers backlog re-attempts
  examDate: { type: DataTypes.DATE, allowNull: true },
  maxMarks: { type: DataTypes.FLOAT, allowNull: false },
  passingMarks: { type: DataTypes.FLOAT, allowNull: false },
  scheduledById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
}, { tableName: 'exams', timestamps: true });

// Tied to enrollmentId (not studentId) so a backlog subject's result is
// recorded against the correct attempt/curriculum version.
const ExamResult = sequelize.define('ExamResult', {
  ...uuidPk,
  examId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  marksObtained: { type: DataTypes.FLOAT, allowNull: true },
  isPass: { type: DataTypes.BOOLEAN, allowNull: true },
  enteredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'exam_results',
  timestamps: true,
  indexes: [{ unique: true, fields: ['examId', 'enrollmentId'] }],
});

// Generated per enrollment, not per student — a student with both a
// current exam and a backlog exam in the same term needs two tickets.
const HallTicket = sequelize.define('HallTicket', {
  ...uuidPk,
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  examId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  seatNumber: { type: DataTypes.STRING, allowNull: true },
  examCenter: { type: DataTypes.STRING, allowNull: true },
  generatedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
  generatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'hall_tickets', timestamps: true });

const QuestionPaper = sequelize.define('QuestionPaper', {
  ...uuidPk,
  examId: { type: DataTypes.UUID, allowNull: false },
  createdById: { type: DataTypes.UUID, allowNull: false }, // -> ExamStaff
  fileUrl: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM(...QUESTION_PAPER_STATUSES), allowNull: false, defaultValue: 'DRAFT' },
}, { tableName: 'question_papers', timestamps: true });

// Final processed result card per student per term — aggregates each
// subject's SubjectResult into one overall record.
const ResultCard = sequelize.define('ResultCard', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  academicTermId: { type: DataTypes.UUID, allowNull: false },
  totalMarks: { type: DataTypes.FLOAT, allowNull: true },
  percentage: { type: DataTypes.FLOAT, allowNull: true },
  sgpa: { type: DataTypes.FLOAT, allowNull: true },
  processedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
  processedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'result_cards',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId', 'academicTermId'] }],
});


// =====================================================================
// SECTION 9: ONLINE TESTS
// =====================================================================

const OnlineTest = sequelize.define('OnlineTest', {
  ...uuidPk,
  teacherId: { type: DataTypes.UUID, allowNull: false },
  subjectId: { type: DataTypes.UUID, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
  startTime: { type: DataTypes.DATE, allowNull: false },
  endTime: { type: DataTypes.DATE, allowNull: false },
  totalMarks: { type: DataTypes.FLOAT, allowNull: false },
}, { tableName: 'online_tests', timestamps: true });

const TestQuestion = sequelize.define('TestQuestion', {
  ...uuidPk,
  testId: { type: DataTypes.UUID, allowNull: false },
  questionText: { type: DataTypes.TEXT, allowNull: false },
  marks: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
}, { tableName: 'test_questions', timestamps: true });

const TestOption = sequelize.define('TestOption', {
  ...uuidPk,
  questionId: { type: DataTypes.UUID, allowNull: false },
  optionText: { type: DataTypes.STRING, allowNull: false },
  isCorrect: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'test_options', timestamps: true });

const TestAttempt = sequelize.define('TestAttempt', {
  ...uuidPk,
  testId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  submittedAt: { type: DataTypes.DATE, allowNull: true },
  score: { type: DataTypes.FLOAT, allowNull: true },
}, {
  tableName: 'test_attempts',
  timestamps: true,
  indexes: [{ unique: true, fields: ['testId', 'studentId'] }],
});

const TestAnswer = sequelize.define('TestAnswer', {
  ...uuidPk,
  attemptId: { type: DataTypes.UUID, allowNull: false },
  questionId: { type: DataTypes.UUID, allowNull: false },
  selectedOptionId: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'test_answers',
  timestamps: true,
  indexes: [{ unique: true, fields: ['attemptId', 'questionId'] }],
});


// =====================================================================
// SECTION 10: MARKING SCHEME (Internal + External Assessment Components)
// =====================================================================
// A subject's total marks are broken into configurable components
// instead of one flat number — e.g. IA-1(10)+IA-2(10)+MidSem(30)+EndSem(50),
// or LabInternal(25)+LabExternal/Oral(25). The SCHEME is structural
// (set up once per subject by Department Admin); the MARKS are entered
// per student per enrollment by the teacher, however they arrive at
// that number — manually, via an OnlineTest, or from a formal Exam.

const AssessmentComponent = sequelize.define('AssessmentComponent', {
  ...uuidPk,
  subjectId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // "IA-1", "Mid Sem", "Lab Internal", etc.
  maxMarks: { type: DataTypes.FLOAT, allowNull: false },
  category: { type: DataTypes.ENUM(...COMPONENT_CATEGORIES), allowNull: false },
  // Informational default only — teacher isn't locked into this method.
  entryMethod: { type: DataTypes.ENUM(...MARK_ENTRY_METHODS), allowNull: false, defaultValue: 'MANUAL' },
  sequenceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  createdById: { type: DataTypes.UUID, allowNull: true }, // -> DepartmentAdmin
}, {
  tableName: 'assessment_components',
  timestamps: true,
  indexes: [{ unique: true, fields: ['subjectId', 'name'] }],
  // NOTE: validate in application code that a subject's component
  // maxMarks sum to its intended total (100, 50, etc.) — not enforced
  // at the DB level since totals vary by subject/department policy.
});

// The actual marks a student got for one component, for one
// enrollment — so a backlog re-attempt gets a fresh set, never merged
// with the original attempt's marks.
const ComponentMark = sequelize.define('ComponentMark', {
  ...uuidPk,
  componentId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  marksObtained: { type: DataTypes.FLOAT, allowNull: true },
  enteredById: { type: DataTypes.UUID, allowNull: true }, // -> Teacher
  enteredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  // Provenance only — marksObtained above is authoritative regardless
  // of whether either of these is set.
  sourceOnlineTestId: { type: DataTypes.UUID, allowNull: true },
  sourceExamId: { type: DataTypes.UUID, allowNull: true },
}, {
  tableName: 'component_marks',
  timestamps: true,
  indexes: [{ unique: true, fields: ['componentId', 'enrollmentId'] }],
});

// The composed, final subject score for one enrollment — sum of its
// ComponentMark rows. Feeds into ResultCard for the term-level result.
const SubjectResult = sequelize.define('SubjectResult', {
  ...uuidPk,
  enrollmentId: { type: DataTypes.UUID, allowNull: false, unique: true },
  totalMarksObtained: { type: DataTypes.FLOAT, allowNull: true },
  totalMaxMarks: { type: DataTypes.FLOAT, allowNull: true },
  isPass: { type: DataTypes.BOOLEAN, allowNull: true },
  computedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'subject_results', timestamps: true });


// =====================================================================
// SECTION 11: INSTITUTE ID GENERATION
// =====================================================================
// One counter row per role prefix. Generate an ID via an atomic
// increment-and-return, e.g.:
//   const [updated] = await sequelize.query(
//     `UPDATE id_sequences SET "lastUsed" = "lastUsed" + 1
//      WHERE prefix = :prefix RETURNING "lastUsed"`,
//     { replacements: { prefix: 'STKIT' }, type: QueryTypes.SELECT }
//   );
// then format as prefix + zero-padded number.
// For bulk creation (CSV import), increment by N and assign the
// reserved range across rows — never loop one increment per row.
const IdSequence = sequelize.define('IdSequence', {
  ...uuidPk,
  prefix: { type: DataTypes.STRING, unique: true, allowNull: false }, // "STKIT", "FCKIT", "DAKIT", "SAKIT", "EXKIT"
  lastUsed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'id_sequences', timestamps: true });


// =====================================================================
// ASSOCIATIONS
// =====================================================================

// --- Identity & Org ---
SuperAdmin.hasMany(Department, { foreignKey: 'createdById', as: 'createdDepartments' });
Department.belongsTo(SuperAdmin, { foreignKey: 'createdById', as: 'createdBy' });

SuperAdmin.hasMany(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdDeptAdmins' });
DepartmentAdmin.belongsTo(SuperAdmin, { foreignKey: 'createdById', as: 'createdBy' });

SuperAdmin.hasMany(ExamStaff, { foreignKey: 'createdById', as: 'createdExamStaff' });
ExamStaff.belongsTo(SuperAdmin, { foreignKey: 'createdById', as: 'createdBy' });

SuperAdmin.hasMany(Announcement, { foreignKey: 'createdBySuperAdminId', as: 'announcements' });
Announcement.belongsTo(SuperAdmin, { foreignKey: 'createdBySuperAdminId', as: 'createdBySuperAdmin' });

SuperAdmin.hasMany(Library, { foreignKey: 'uploadedById', as: 'library' });
Library.belongsTo(SuperAdmin, { foreignKey: 'uploadedById', as: 'uploadedBy' });

DepartmentAdmin.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(DepartmentAdmin, { foreignKey: 'departmentId', as: 'deptAdmins' });

Department.hasMany(Teacher, { foreignKey: 'departmentId', as: 'teachers' });
Teacher.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
DepartmentAdmin.hasMany(Teacher, { foreignKey: 'createdById', as: 'createdTeachers' });
Teacher.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });

Department.hasMany(Student, { foreignKey: 'departmentId', as: 'students' });
Student.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
DepartmentAdmin.hasMany(Student, { foreignKey: 'createdById', as: 'createdStudents' });
Student.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });

Parent.hasMany(ParentStudent, { foreignKey: 'parentId', as: 'children' });
ParentStudent.belongsTo(Parent, { foreignKey: 'parentId', as: 'parent' });
Student.hasMany(ParentStudent, { foreignKey: 'studentId', as: 'parents' });
ParentStudent.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Department.hasMany(ElectiveOption, { foreignKey: 'offeredByDepartmentId', as: 'electiveOptionsOffered' });
ElectiveOption.belongsTo(Department, { foreignKey: 'offeredByDepartmentId', as: 'offeredByDepartment' });

// --- Curriculum ---
Department.hasMany(Class, { foreignKey: 'departmentId', as: 'classes' });
Class.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
DepartmentAdmin.hasMany(Class, { foreignKey: 'createdById', as: 'createdClasses' });
Class.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });

Class.hasMany(Division, { foreignKey: 'classId', as: 'divisions' });
Division.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
DepartmentAdmin.hasMany(Division, { foreignKey: 'createdById', as: 'createdDivisions' });
Division.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });
Division.hasMany(Student, { foreignKey: 'divisionId', as: 'students' });
Student.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });

Class.hasMany(Subject, { foreignKey: 'classId', as: 'subjects' });
Subject.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
Department.hasMany(Subject, { foreignKey: 'departmentId', as: 'subjects' });
Subject.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
DepartmentAdmin.hasMany(Subject, { foreignKey: 'createdById', as: 'createdSubjects' });
Subject.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });

Class.hasMany(ElectiveSlot, { foreignKey: 'classId', as: 'electiveSlots' });
ElectiveSlot.belongsTo(Class, { foreignKey: 'classId', as: 'class' });

ElectiveSlot.hasMany(ElectiveOption, { foreignKey: 'slotId', as: 'options' });
ElectiveOption.belongsTo(ElectiveSlot, { foreignKey: 'slotId', as: 'slot' });
Subject.hasMany(ElectiveOption, { foreignKey: 'subjectId', as: 'electiveOptions' });
ElectiveOption.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Student.hasMany(StudentElectiveChoice, { foreignKey: 'studentId', as: 'electiveChoices' });
StudentElectiveChoice.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
ElectiveSlot.hasMany(StudentElectiveChoice, { foreignKey: 'slotId', as: 'choices' });
StudentElectiveChoice.belongsTo(ElectiveSlot, { foreignKey: 'slotId', as: 'slot' });
Subject.hasMany(StudentElectiveChoice, { foreignKey: 'chosenSubjectId', as: 'electiveChoices' });
StudentElectiveChoice.belongsTo(Subject, { foreignKey: 'chosenSubjectId', as: 'chosenSubject' });

Teacher.hasMany(SubjectAllocation, { foreignKey: 'teacherId', as: 'subjectAllocations' });
SubjectAllocation.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Subject.hasMany(SubjectAllocation, { foreignKey: 'subjectId', as: 'subjectAllocations' });
SubjectAllocation.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Class.hasMany(SubjectAllocation, { foreignKey: 'classId', as: 'subjectAllocations' });
SubjectAllocation.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
DepartmentAdmin.hasMany(SubjectAllocation, { foreignKey: 'allocatedById', as: 'subjectAllocations' });
SubjectAllocation.belongsTo(DepartmentAdmin, { foreignKey: 'allocatedById', as: 'allocatedBy' });

// --- Enrollment ---
AcademicTerm.hasMany(Enrollment, { foreignKey: 'academicTermId', as: 'enrollments' });
Enrollment.belongsTo(AcademicTerm, { foreignKey: 'academicTermId', as: 'academicTerm' });
Student.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments' });
Enrollment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Subject.hasMany(Enrollment, { foreignKey: 'subjectId', as: 'enrollments' });
Enrollment.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Class.hasMany(Enrollment, { foreignKey: 'classId', as: 'enrollments' });
Enrollment.belongsTo(Class, { foreignKey: 'classId', as: 'class' });

// --- Attendance ---
Subject.hasMany(AttendanceSession, { foreignKey: 'subjectId', as: 'attendanceSessions' });
AttendanceSession.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Class.hasMany(AttendanceSession, { foreignKey: 'classId', as: 'attendanceSessions' });
AttendanceSession.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
Teacher.hasMany(AttendanceSession, { foreignKey: 'teacherId', as: 'attendanceSessions' });
AttendanceSession.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

AttendanceSession.hasMany(AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
AttendanceRecord.belongsTo(AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
Enrollment.hasMany(AttendanceRecord, { foreignKey: 'enrollmentId', as: 'attendanceRecords' });
AttendanceRecord.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });
Student.hasMany(AttendanceRecord, { foreignKey: 'studentId', as: 'attendanceRecords' });
AttendanceRecord.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

// --- Notes, Library, Assignments ---
Teacher.hasMany(Note, { foreignKey: 'teacherId', as: 'notes' });
Note.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Subject.hasMany(Note, { foreignKey: 'subjectId', as: 'notes' });
Note.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Teacher.hasMany(Assignment, { foreignKey: 'teacherId', as: 'assignments' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Subject.hasMany(Assignment, { foreignKey: 'subjectId', as: 'assignments' });
Assignment.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

Assignment.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });
Enrollment.hasMany(Submission, { foreignKey: 'enrollmentId', as: 'submissions' });
Submission.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });
Student.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });
Submission.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Subject.hasMany(Meeting, { foreignKey: 'subjectId', as: 'meetings' });
Meeting.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Class.hasMany(Meeting, { foreignKey: 'classId', as: 'meetings' });
Meeting.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
Teacher.hasMany(Meeting, { foreignKey: 'teacherId', as: 'meetings' });
Meeting.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });

// --- Announcements & Leave ---
DepartmentAdmin.hasMany(Announcement, { foreignKey: 'createdByDeptAdminId', as: 'announcements' });
Announcement.belongsTo(DepartmentAdmin, { foreignKey: 'createdByDeptAdminId', as: 'createdByDeptAdmin' });
Teacher.hasMany(Announcement, { foreignKey: 'createdByTeacherId', as: 'announcements' });
Announcement.belongsTo(Teacher, { foreignKey: 'createdByTeacherId', as: 'createdByTeacher' });

Student.hasMany(LeaveRequest, { foreignKey: 'studentId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
Teacher.hasMany(LeaveRequest, { foreignKey: 'teacherId', as: 'leaveRequests' });
LeaveRequest.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
DepartmentAdmin.hasMany(LeaveRequest, { foreignKey: 'resolvedByDeptAdminId', as: 'resolvedLeaveRequests' });
LeaveRequest.belongsTo(DepartmentAdmin, { foreignKey: 'resolvedByDeptAdminId', as: 'resolvedByDeptAdmin' });

// --- Fees ---
Department.hasMany(FeeStructure, { foreignKey: 'departmentId', as: 'feeStructures' });
FeeStructure.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
AcademicTerm.hasMany(FeeStructure, { foreignKey: 'academicTermId', as: 'feeStructures' });
FeeStructure.belongsTo(AcademicTerm, { foreignKey: 'academicTermId', as: 'academicTerm' });

Student.hasMany(FeePayment, { foreignKey: 'studentId', as: 'feePayments' });
FeePayment.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
FeeStructure.hasMany(FeePayment, { foreignKey: 'feeStructureId', as: 'payments' });
FeePayment.belongsTo(FeeStructure, { foreignKey: 'feeStructureId', as: 'feeStructure' });
Enrollment.hasMany(FeePayment, { foreignKey: 'enrollmentId', as: 'feePayments' });
FeePayment.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

// --- Examinations ---
Subject.hasMany(Exam, { foreignKey: 'subjectId', as: 'exams' });
Exam.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Class.hasMany(Exam, { foreignKey: 'classId', as: 'exams' });
Exam.belongsTo(Class, { foreignKey: 'classId', as: 'class' });
AcademicTerm.hasMany(Exam, { foreignKey: 'academicTermId', as: 'exams' });
Exam.belongsTo(AcademicTerm, { foreignKey: 'academicTermId', as: 'academicTerm' });
ExamStaff.hasMany(Exam, { foreignKey: 'scheduledById', as: 'examSchedules' });
Exam.belongsTo(ExamStaff, { foreignKey: 'scheduledById', as: 'scheduledBy' });

Exam.hasMany(ExamResult, { foreignKey: 'examId', as: 'results' });
ExamResult.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
Enrollment.hasMany(ExamResult, { foreignKey: 'enrollmentId', as: 'examResults' });
ExamResult.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });

Enrollment.hasMany(HallTicket, { foreignKey: 'enrollmentId', as: 'hallTickets' });
HallTicket.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });
Exam.hasMany(HallTicket, { foreignKey: 'examId', as: 'hallTickets' });
HallTicket.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
Student.hasMany(HallTicket, { foreignKey: 'studentId', as: 'hallTickets' });
HallTicket.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
ExamStaff.hasMany(HallTicket, { foreignKey: 'generatedById', as: 'hallTicketsGenerated' });
HallTicket.belongsTo(ExamStaff, { foreignKey: 'generatedById', as: 'generatedBy' });

Exam.hasMany(QuestionPaper, { foreignKey: 'examId', as: 'questionPapers' });
QuestionPaper.belongsTo(Exam, { foreignKey: 'examId', as: 'exam' });
ExamStaff.hasMany(QuestionPaper, { foreignKey: 'createdById', as: 'questionPapers' });
QuestionPaper.belongsTo(ExamStaff, { foreignKey: 'createdById', as: 'createdBy' });

Student.hasMany(ResultCard, { foreignKey: 'studentId', as: 'resultCards' });
ResultCard.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });
AcademicTerm.hasMany(ResultCard, { foreignKey: 'academicTermId', as: 'resultCards' });
ResultCard.belongsTo(AcademicTerm, { foreignKey: 'academicTermId', as: 'academicTerm' });
ExamStaff.hasMany(ResultCard, { foreignKey: 'processedById', as: 'resultCardsProcessed' });
ResultCard.belongsTo(ExamStaff, { foreignKey: 'processedById', as: 'processedBy' });

// --- Online Tests ---
Teacher.hasMany(OnlineTest, { foreignKey: 'teacherId', as: 'onlineTests' });
OnlineTest.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Subject.hasMany(OnlineTest, { foreignKey: 'subjectId', as: 'onlineTests' });
OnlineTest.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });

OnlineTest.hasMany(TestQuestion, { foreignKey: 'testId', as: 'questions' });
TestQuestion.belongsTo(OnlineTest, { foreignKey: 'testId', as: 'test' });

TestQuestion.hasMany(TestOption, { foreignKey: 'questionId', as: 'options' });
TestOption.belongsTo(TestQuestion, { foreignKey: 'questionId', as: 'question' });

OnlineTest.hasMany(TestAttempt, { foreignKey: 'testId', as: 'attempts' });
TestAttempt.belongsTo(OnlineTest, { foreignKey: 'testId', as: 'test' });
Student.hasMany(TestAttempt, { foreignKey: 'studentId', as: 'testAttempts' });
TestAttempt.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

TestAttempt.hasMany(TestAnswer, { foreignKey: 'attemptId', as: 'answers' });
TestAnswer.belongsTo(TestAttempt, { foreignKey: 'attemptId', as: 'attempt' });
TestQuestion.hasMany(TestAnswer, { foreignKey: 'questionId', as: 'answers' });
TestAnswer.belongsTo(TestQuestion, { foreignKey: 'questionId', as: 'question' });
TestOption.hasMany(TestAnswer, { foreignKey: 'selectedOptionId', as: 'selectedInAnswers' });
TestAnswer.belongsTo(TestOption, { foreignKey: 'selectedOptionId', as: 'selectedOption' });

// --- Marking Scheme ---
Subject.hasMany(AssessmentComponent, { foreignKey: 'subjectId', as: 'assessmentComponents' });
AssessmentComponent.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
DepartmentAdmin.hasMany(AssessmentComponent, { foreignKey: 'createdById', as: 'createdAssessmentComponents' });
AssessmentComponent.belongsTo(DepartmentAdmin, { foreignKey: 'createdById', as: 'createdBy' });

AssessmentComponent.hasMany(ComponentMark, { foreignKey: 'componentId', as: 'marks' });
ComponentMark.belongsTo(AssessmentComponent, { foreignKey: 'componentId', as: 'component' });
Enrollment.hasMany(ComponentMark, { foreignKey: 'enrollmentId', as: 'componentMarks' });
ComponentMark.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });
Teacher.hasMany(ComponentMark, { foreignKey: 'enteredById', as: 'enteredComponentMarks' });
ComponentMark.belongsTo(Teacher, { foreignKey: 'enteredById', as: 'enteredBy' });
OnlineTest.hasMany(ComponentMark, { foreignKey: 'sourceOnlineTestId', as: 'sourcedComponentMarks' });
ComponentMark.belongsTo(OnlineTest, { foreignKey: 'sourceOnlineTestId', as: 'sourceOnlineTest' });
Exam.hasMany(ComponentMark, { foreignKey: 'sourceExamId', as: 'sourcedComponentMarks' });
ComponentMark.belongsTo(Exam, { foreignKey: 'sourceExamId', as: 'sourceExam' });

Enrollment.hasOne(SubjectResult, { foreignKey: 'enrollmentId', as: 'subjectResult' });
SubjectResult.belongsTo(Enrollment, { foreignKey: 'enrollmentId', as: 'enrollment' });


// =====================================================================
// EXPORTS
// =====================================================================

module.exports = {
  sequelize,
  Sequelize,
  SuperAdmin,
  Department,
  DepartmentAdmin,
  Teacher,
  Student,
  Parent,
  ParentStudent,
  ExamStaff,
  Class,
  Division,
  Subject,
  ElectiveSlot,
  ElectiveOption,
  StudentElectiveChoice,
  SubjectAllocation,
  AcademicTerm,
  Enrollment,
  AttendanceSession,
  AttendanceRecord,
  Note,
  Library,
  Assignment,
  Submission,
  Meeting,
  Announcement,
  LeaveRequest,
  FeeStructure,
  FeePayment,
  Exam,
  ExamResult,
  HallTicket,
  QuestionPaper,
  ResultCard,
  OnlineTest,
  TestQuestion,
  TestOption,
  TestAttempt,
  TestAnswer,
  AssessmentComponent,
  ComponentMark,
  SubjectResult,
  IdSequence,
};
