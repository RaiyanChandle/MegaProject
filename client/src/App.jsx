import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminDashboard from './pages/superadmin/Dashboard';
import Departments from './pages/superadmin/Departments';
import DeptAdmins from './pages/superadmin/DeptAdmins';
import ExamStaff from './pages/superadmin/ExamStaff';
import AcademicTerms from './pages/superadmin/AcademicTerms';
import Settings from './pages/superadmin/Settings';
import DeptAdminDashboard from './pages/deptadmin/Dashboard';
import Classes from './pages/deptadmin/Classes';
import ClassDetails from './pages/deptadmin/ClassDetails';
import Subjects from './pages/deptadmin/Subjects';
import SubjectDetails from './pages/deptadmin/SubjectDetails';
import Teachers from './pages/deptadmin/Teachers';
import Students from './pages/deptadmin/Students';
import AttendanceReport from './pages/deptadmin/AttendanceReport';
import DeptAdminLeaveManagement from './pages/deptadmin/LeaveManagement';
import DeptAdminTimetable from './pages/deptadmin/Timetable';
import StudentFees from './pages/student/StudentFees';
import ParentFees from './pages/parent/ParentFees';
import ParentChildren from './pages/parent/ParentChildren';

import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherClasses from './pages/teacher/TeacherClasses';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherNotes from './pages/teacher/TeacherNotes';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherQuestionPapers from './pages/teacher/TeacherQuestionPapers';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentSubjects from './pages/student/StudentSubjects';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentNotes from './pages/student/StudentNotes';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentElectives from './pages/student/StudentElectives';
import ParentDashboard from './pages/parent/ParentDashboard';
import ParentAttendance from './pages/parent/ParentAttendance';
import SuperAdminLibrary from './pages/superadmin/Library';
import DigitalLibrary from './pages/common/Library';
import TeacherMarks from './pages/teacher/TeacherMarks';
import StudentMarks from './pages/student/StudentMarks';
import ParentMarks from './pages/parent/ParentMarks';
import ParentAssignments from './pages/parent/ParentAssignments';
import ParentAnnouncements from './pages/parent/ParentAnnouncements';
import ExamStaffDashboard from './pages/examstaff/ExamStaffDashboard';
import ExamManagement from './pages/examstaff/ExamManagement';
import HallTicketManagement from './pages/examstaff/HallTicketManagement';
import ExamResultsVerification from './pages/examstaff/ExamResultsVerification';
import StudentHallTicket from './pages/student/StudentHallTicket';
import SuperAdminAnnouncements from './pages/superadmin/Announcements';
import DeptAdminAnnouncements from './pages/deptadmin/Announcements';
import TeacherAnnouncements from './pages/teacher/TeacherAnnouncements';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import ExamStaffAnnouncements from './pages/examstaff/ExamStaffAnnouncements';
import TeacherLeave from './pages/teacher/TeacherLeave';
import StudentLeave from './pages/student/StudentLeave';

import { SearchProvider } from './context/SearchContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <SearchProvider>
          <LanguageProvider>
            <NotificationProvider>
              <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes: Super Admin */}
            <Route
              path="/superadmin"
              element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} title="Super Admin Dashboard" />}
            >
              <Route index element={<SuperAdminDashboard />} />
              <Route path="departments" element={<Departments />} />
              <Route path="admins" element={<DeptAdmins />} />
              <Route path="exam-staff" element={<ExamStaff />} />
              <Route path="academic-terms" element={<AcademicTerms />} />
              <Route path="announcements" element={<SuperAdminAnnouncements />} />
              <Route path="library" element={<SuperAdminLibrary />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Protected Routes: Department Admin */}
            <Route
              path="/deptadmin"
              element={<ProtectedRoute allowedRoles={['DEPARTMENT_ADMIN']} title="Department Dashboard" />}
            >
              <Route index element={<DeptAdminDashboard />} />
              <Route path="classes" element={<Classes />} />
              <Route path="classes/:id" element={<ClassDetails />} />
              <Route path="subjects" element={<Subjects />} />
              <Route path="subjects/:id" element={<SubjectDetails />} />
              <Route path="teachers" element={<Teachers />} />
              <Route path="students" element={<Students />} />
              <Route path="attendance" element={<AttendanceReport />} />
              <Route path="announcements" element={<DeptAdminAnnouncements />} />
              <Route path="leaves" element={<DeptAdminLeaveManagement />} />
              <Route path="timetable" element={<DeptAdminTimetable />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Protected Routes: Teacher */}
            <Route
              path="/teacher"
              element={<ProtectedRoute allowedRoles={['TEACHER']} title="Teacher Dashboard" />}
            >
              <Route index element={<TeacherDashboard />} />
              <Route path="classes" element={<TeacherClasses />} />
              <Route path="attendance" element={<TeacherAttendance />} />
              <Route path="notes" element={<TeacherNotes />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="announcements" element={<TeacherAnnouncements />} />
              <Route path="leaves" element={<TeacherLeave />} />
              <Route path="library" element={<DigitalLibrary />} />
              <Route path="marks" element={<TeacherMarks />} />
              <Route path="question-papers" element={<TeacherQuestionPapers />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Protected Routes: Student */}
            <Route
              path="/student"
              element={<ProtectedRoute allowedRoles={['STUDENT']} title="Student Dashboard" />}
            >
              <Route index element={<StudentDashboard />} />
              <Route path="subjects" element={<StudentSubjects />} />
              <Route path="electives" element={<StudentElectives />} />
              <Route path="attendance" element={<StudentAttendance />} />
              <Route path="notes" element={<StudentNotes />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="announcements" element={<StudentAnnouncements />} />
              <Route path="leaves" element={<StudentLeave />} />
              <Route path="library" element={<DigitalLibrary />} />
              <Route path="marks" element={<StudentMarks />} />
              <Route path="halltickets" element={<StudentHallTicket />} />
              <Route path="fees" element={<StudentFees />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Protected Routes: Parent */}
            <Route
              path="/parent"
              element={<ProtectedRoute allowedRoles={['PARENT']} title="Parent Dashboard" />}
            >
              <Route index element={<ParentDashboard />} />
              <Route path="attendance" element={<ParentAttendance />} />
              <Route path="marks" element={<ParentMarks />} />
              <Route path="assignments" element={<ParentAssignments />} />
              <Route path="announcements" element={<ParentAnnouncements />} />
              <Route path="children" element={<ParentChildren />} />
              <Route path="fees" element={<ParentFees />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Protected Routes: Exam Staff */}
            <Route
              path="/examstaff"
              element={<ProtectedRoute allowedRoles={['EXAM_STAFF']} title="Examination Controller" />}
            >
              <Route index element={<ExamStaffDashboard />} />
              <Route path="exams" element={<ExamManagement />} />
              <Route path="halltickets" element={<HallTicketManagement />} />
              <Route path="results" element={<ExamResultsVerification />} />
              <Route path="announcements" element={<ExamStaffAnnouncements />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
            </NotificationProvider>
          </LanguageProvider>
        </SearchProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;