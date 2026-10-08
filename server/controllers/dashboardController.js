import { Department, DepartmentAdmin, ExamStaff, AcademicTerm } from '../models/index.js';

export const getSuperAdminStats = async (req, res) => {
  try {
    const [departmentsCount, deptAdminsCount, examStaffCount, academicTermsCount] = await Promise.all([
      Department.count(),
      DepartmentAdmin.count(),
      ExamStaff.count(),
      AcademicTerm.count()
    ]);

    res.json({
      departmentsCount,
      deptAdminsCount,
      examStaffCount,
      academicTermsCount
    });
  } catch (error) {
    console.error('Error fetching Super Admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};
