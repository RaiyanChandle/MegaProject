import sequelize from "../config/database.js";
import HealthCheck from "./HealthCheck.js";

import SuperAdminModel from './SuperAdmin.js';
import DepartmentModel from './Department.js';
import DepartmentAdminModel from './DepartmentAdmin.js';
import TeacherModel from './Teacher.js';
import StudentModel from './Student.js';
import ParentModel from './Parent.js';
import ParentStudentModel from './ParentStudent.js';
import ExamStaffModel from './ExamStaff.js';
import ClassModel from './Class.js';
import DivisionModel from './Division.js';
import SubjectModel from './Subject.js';
import ElectiveSlotModel from './ElectiveSlot.js';
import ElectiveOptionModel from './ElectiveOption.js';
import StudentElectiveChoiceModel from './StudentElectiveChoice.js';
import SubjectAllocationModel from './SubjectAllocation.js';
import AcademicTermModel from './AcademicTerm.js';
import EnrollmentModel from './Enrollment.js';
import AttendanceSessionModel from './AttendanceSession.js';
import AttendanceRecordModel from './AttendanceRecord.js';
import NoteModel from './Note.js';
import LibraryModel from './Library.js';
import AssignmentModel from './Assignment.js';
import SubmissionModel from './Submission.js';
import MeetingModel from './Meeting.js';
import AnnouncementModel from './Announcement.js';
import LeaveRequestModel from './LeaveRequest.js';
import FeeStructureModel from './FeeStructure.js';
import FeePaymentModel from './FeePayment.js';
import ExamModel from './Exam.js';
import ExamResultModel from './ExamResult.js';
import HallTicketModel from './HallTicket.js';
import QuestionPaperModel from './QuestionPaper.js';
import ResultCardModel from './ResultCard.js';
import OnlineTestModel from './OnlineTest.js';
import TestQuestionModel from './TestQuestion.js';
import TestOptionModel from './TestOption.js';
import TestAttemptModel from './TestAttempt.js';
import TestAnswerModel from './TestAnswer.js';
import AssessmentComponentModel from './AssessmentComponent.js';
import ComponentMarkModel from './ComponentMark.js';
import SubjectResultModel from './SubjectResult.js';
import IdSequenceModel from './IdSequence.js';

const SuperAdmin = SuperAdminModel(sequelize);
const Department = DepartmentModel(sequelize);
const DepartmentAdmin = DepartmentAdminModel(sequelize);
const Teacher = TeacherModel(sequelize);
const Student = StudentModel(sequelize);
const Parent = ParentModel(sequelize);
const ParentStudent = ParentStudentModel(sequelize);
const ExamStaff = ExamStaffModel(sequelize);
const Class = ClassModel(sequelize);
const Division = DivisionModel(sequelize);
const Subject = SubjectModel(sequelize);
const ElectiveSlot = ElectiveSlotModel(sequelize);
const ElectiveOption = ElectiveOptionModel(sequelize);
const StudentElectiveChoice = StudentElectiveChoiceModel(sequelize);
const SubjectAllocation = SubjectAllocationModel(sequelize);
const AcademicTerm = AcademicTermModel(sequelize);
const Enrollment = EnrollmentModel(sequelize);
const AttendanceSession = AttendanceSessionModel(sequelize);
const AttendanceRecord = AttendanceRecordModel(sequelize);
const Note = NoteModel(sequelize);
const Library = LibraryModel(sequelize);
const Assignment = AssignmentModel(sequelize);
const Submission = SubmissionModel(sequelize);
const Meeting = MeetingModel(sequelize);
const Announcement = AnnouncementModel(sequelize);
const LeaveRequest = LeaveRequestModel(sequelize);
const FeeStructure = FeeStructureModel(sequelize);
const FeePayment = FeePaymentModel(sequelize);
const Exam = ExamModel(sequelize);
const ExamResult = ExamResultModel(sequelize);
const HallTicket = HallTicketModel(sequelize);
const QuestionPaper = QuestionPaperModel(sequelize);
const ResultCard = ResultCardModel(sequelize);
const OnlineTest = OnlineTestModel(sequelize);
const TestQuestion = TestQuestionModel(sequelize);
const TestOption = TestOptionModel(sequelize);
const TestAttempt = TestAttemptModel(sequelize);
const TestAnswer = TestAnswerModel(sequelize);
const AssessmentComponent = AssessmentComponentModel(sequelize);
const ComponentMark = ComponentMarkModel(sequelize);
const SubjectResult = SubjectResultModel(sequelize);
const IdSequence = IdSequenceModel(sequelize);

// Associations


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
Division.hasMany(SubjectAllocation, { foreignKey: 'divisionId', as: 'subjectAllocations' });
SubjectAllocation.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });
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
Division.hasMany(AttendanceSession, { foreignKey: 'divisionId', as: 'attendanceSessions' });
AttendanceSession.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });
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
Division.hasMany(Note, { foreignKey: 'divisionId', as: 'notes' });
Note.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });

Teacher.hasMany(Assignment, { foreignKey: 'teacherId', as: 'assignments' });
Assignment.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Subject.hasMany(Assignment, { foreignKey: 'subjectId', as: 'assignments' });
Assignment.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subject' });
Division.hasMany(Assignment, { foreignKey: 'divisionId', as: 'assignments' });
Assignment.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });

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
Division.hasMany(Meeting, { foreignKey: 'divisionId', as: 'meetings' });
Meeting.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });
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
Division.hasMany(OnlineTest, { foreignKey: 'divisionId', as: 'onlineTests' });
OnlineTest.belongsTo(Division, { foreignKey: 'divisionId', as: 'division' });

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




const db = {
  sequelize,
  HealthCheck,
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
  IdSequence
};

export default db;
export { sequelize, HealthCheck, SuperAdmin, Department, DepartmentAdmin, Teacher, Student, Parent, ParentStudent, ExamStaff, Class, Division, Subject, ElectiveSlot, ElectiveOption, StudentElectiveChoice, SubjectAllocation, AcademicTerm, Enrollment, AttendanceSession, AttendanceRecord, Note, Library, Assignment, Submission, Meeting, Announcement, LeaveRequest, FeeStructure, FeePayment, Exam, ExamResult, HallTicket, QuestionPaper, ResultCard, OnlineTest, TestQuestion, TestOption, TestAttempt, TestAnswer, AssessmentComponent, ComponentMark, SubjectResult, IdSequence };
