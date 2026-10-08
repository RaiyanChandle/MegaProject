import { LayoutDashboard, Users, BookOpen, FileText, Settings, Calendar, DollarSign, Clock, FileCheck } from 'lucide-react';

export const navigationConfig = {
  SUPER_ADMIN: [
    { name: 'Dashboard', href: '/superadmin', icon: LayoutDashboard },
    { name: 'Departments', href: '/superadmin/departments', icon: Settings },
    { name: 'Admins', href: '/superadmin/admins', icon: Users },
    { name: 'Academic Terms', href: '/superadmin/terms', icon: Calendar },
  ],
  DEPARTMENT_ADMIN: [
    { name: 'Dashboard', href: '/deptadmin', icon: LayoutDashboard },
    { name: 'Classes', href: '/deptadmin/classes', icon: Users },
    { name: 'Subjects', href: '/deptadmin/subjects', icon: BookOpen },
    { name: 'Teachers', href: '/deptadmin/teachers', icon: Users },
    { name: 'Students', href: '/deptadmin/students', icon: Users },
    { name: 'Timetable', href: '/deptadmin/timetable', icon: Calendar },
  ],
  TEACHER: [
    { name: 'Dashboard', href: '/teacher', icon: LayoutDashboard },
    { name: 'My Classes', href: '/teacher/classes', icon: Users },
    { name: 'Attendance', href: '/teacher/attendance', icon: Clock },
    { name: 'Marks Entry', href: '/teacher/marks', icon: FileCheck },
    { name: 'Assignments', href: '/teacher/assignments', icon: FileText },
  ],
  STUDENT: [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'My Subjects', href: '/student/subjects', icon: BookOpen },
    { name: 'Attendance', href: '/student/attendance', icon: Clock },
    { name: 'Marks', href: '/student/marks', icon: FileCheck },
    { name: 'Fees', href: '/student/fees', icon: DollarSign },
  ],
  PARENT: [
    { name: 'Dashboard', href: '/parent', icon: LayoutDashboard },
    { name: 'Children', href: '/parent/children', icon: Users },
    { name: 'Fees', href: '/parent/fees', icon: DollarSign },
  ],
  EXAM_STAFF: [
    { name: 'Dashboard', href: '/examstaff', icon: LayoutDashboard },
    { name: 'Exams', href: '/examstaff/exams', icon: Calendar },
    { name: 'Hall Tickets', href: '/examstaff/halltickets', icon: FileText },
    { name: 'Results', href: '/examstaff/results', icon: FileCheck },
  ],
};
