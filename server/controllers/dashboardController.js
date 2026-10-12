import sequelize from '../config/database.js';
import { 
  Department, 
  DepartmentAdmin, 
  ExamStaff, 
  AcademicTerm,
  Teacher,
  Student,
  Division,
  SuperAdmin,
  Class,
  Subject,
  Library,
  IdSequence,
  AttendanceSession,
  AttendanceRecord,
  Enrollment
} from '../models/index.js';

export const getSuperAdminStats = async (req, res) => {
  try {
    const [
      departmentsCount,
      deptAdminsCount,
      examStaffCount,
      academicTermsCount,
      studentsCount,
      teachersCount,
      classesCount,
      subjectsCount,
      libraryCount,
      currentTerm,
      idSequences,
      departmentsData,
      batchesData,
      totalSessionsCount,
      totalAttendanceRecords,
      presentAttendanceRecords
    ] = await Promise.all([
      Department.count(),
      DepartmentAdmin.count(),
      ExamStaff.count(),
      AcademicTerm.count(),
      Student.count(),
      Teacher.count(),
      Class.count(),
      Subject.count(),
      Library.count(),
      AcademicTerm.findOne({ where: { isCurrent: true }, attributes: ['id', 'name', 'startDate', 'endDate', 'isCurrent'] }),
      IdSequence.findAll({ 
        where: { prefix: ['STKIT', 'FCKIT', 'DAKIT', 'SAKIT', 'EXKIT'] },
        attributes: ['prefix', 'lastUsed'], 
        order: [['prefix', 'ASC']] 
      }),
      Department.findAll({
        attributes: ['id', 'name', 'code', 'createdAt'],
        include: [
          { model: Student, as: 'students', attributes: ['id'] },
          { model: Teacher, as: 'teachers', attributes: ['id'] },
          { model: Class, as: 'classes', attributes: ['id'] }
        ],
        order: [['createdAt', 'DESC']]
      }),
      Student.findAll({
        attributes: [
          'batchYear',
          [sequelize.fn('COUNT', sequelize.col('id')), 'studentCount']
        ],
        group: ['batchYear'],
        order: [['batchYear', 'ASC']]
      }),
      AttendanceSession.count().catch(() => 0),
      AttendanceRecord.count().catch(() => 0),
      AttendanceRecord.count({ where: { present: true } }).catch(() => 0)
    ]);

    // Format department breakdown
    const departmentBreakdown = departmentsData.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      studentsCount: dept.students ? dept.students.length : 0,
      teachersCount: dept.teachers ? dept.teachers.length : 0,
      classesCount: dept.classes ? dept.classes.length : 0
    }));

    // Format batch distribution
    const batchDistribution = batchesData.map(b => ({
      batchYear: b.get('batchYear') || 'Unassigned',
      count: parseInt(b.get('studentCount'), 10) || 0
    }));

    // Attendance rate
    const overallAttendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100)
      : null;

    res.json({
      departmentsCount,
      deptAdminsCount,
      examStaffCount,
      academicTermsCount,
      studentsCount,
      teachersCount,
      classesCount,
      subjectsCount,
      libraryCount,
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate
      } : null,
      idSequences: idSequences.map(seq => ({
        prefix: seq.prefix,
        lastUsed: seq.lastUsed
      })),
      departmentBreakdown,
      batchDistribution,
      attendanceStats: {
        totalSessions: totalSessionsCount,
        totalRecords: totalAttendanceRecords,
        presentRecords: presentAttendanceRecords,
        overallRate: overallAttendanceRate
      }
    });
  } catch (error) {
    console.error('Error fetching Super Admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * Super Admin ID Registry detail fetcher
 * Returns full person list under a given IdSequence prefix (STKIT, FCKIT, DAKIT, EXKIT, SAKIT)
 */
export const getIdRegistryUsers = async (req, res) => {
  try {
    const { prefix } = req.params;
    const normalizedPrefix = prefix ? prefix.toUpperCase() : '';

    let users = [];
    let title = '';
    let description = '';

    switch (normalizedPrefix) {
      case 'STKIT': {
        title = 'Enrolled Students (STKIT)';
        description = 'All active and registered students provisioned under the STKIT ID sequence with enrolled subject details.';
        const records = await Student.findAll({
          attributes: ['id', 'instituteId', 'name', 'email', 'rollNumber', 'batchYear', 'departmentId', 'divisionId', 'createdAt'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
            { model: Division, as: 'division', attributes: ['id', 'name'] },
            { 
              model: Enrollment, 
              as: 'enrollments', 
              attributes: ['id', 'status', 'attemptNumber'],
              include: [
                { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] }
              ]
            }
          ],
          order: [['instituteId', 'ASC']]
        });
        users = records.map(r => ({
          id: r.id,
          instituteId: r.instituteId,
          name: r.name,
          email: r.email,
          rollNumber: r.rollNumber,
          batch: r.batchYear,
          departmentId: r.departmentId,
          departmentName: r.department ? r.department.name : 'Unassigned',
          departmentCode: r.department ? r.department.code : '',
          department: r.department ? `${r.department.name} (${r.department.code})` : 'Unassigned',
          divisionName: r.division ? r.division.name : '',
          division: r.division ? `Div ${r.division.name}` : 'Unassigned',
          hasDivision: !!r.divisionId,
          totalEnrollments: r.enrollments ? r.enrollments.length : 0,
          enrollments: (r.enrollments || []).map(e => ({
            id: e.id,
            status: e.status,
            attemptNumber: e.attemptNumber,
            name: e.subject ? e.subject.name : 'Unknown Subject',
            code: e.subject ? e.subject.code : '',
            type: e.subject ? e.subject.subjectType : 'CORE',
            credits: e.subject ? e.subject.credits : 0
          })),
          createdAt: r.createdAt
        }));
        break;
      }
      case 'FCKIT': {
        title = 'Teaching Faculty (FCKIT)';
        description = 'All faculty and teaching staff provisioned under the FCKIT ID sequence.';
        const records = await Teacher.findAll({
          attributes: ['id', 'instituteId', 'name', 'email', 'departmentId', 'createdAt'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ],
          order: [['instituteId', 'ASC']]
        });
        users = records.map(r => ({
          id: r.id,
          instituteId: r.instituteId,
          name: r.name,
          email: r.email,
          departmentId: r.departmentId,
          departmentName: r.department ? r.department.name : 'Unassigned',
          departmentCode: r.department ? r.department.code : '',
          department: r.department ? `${r.department.name} (${r.department.code})` : 'Unassigned',
          secondaryField: 'Faculty Member',
          createdAt: r.createdAt
        }));
        break;
      }
      case 'DAKIT': {
        title = 'Department Administrators (DAKIT)';
        description = 'Department-level administrators with academic setup authority.';
        const records = await DepartmentAdmin.findAll({
          attributes: ['id', 'instituteId', 'name', 'email', 'isActive', 'departmentId', 'createdAt'],
          include: [
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ],
          order: [['instituteId', 'ASC']]
        });
        users = records.map(r => ({
          id: r.id,
          instituteId: r.instituteId,
          name: r.name,
          email: r.email,
          departmentId: r.departmentId,
          departmentName: r.department ? r.department.name : 'Unassigned',
          departmentCode: r.department ? r.department.code : '',
          department: r.department ? `${r.department.name} (${r.department.code})` : 'Unassigned',
          isActive: r.isActive,
          secondaryField: r.isActive ? 'Active' : 'Inactive',
          createdAt: r.createdAt
        }));
        break;
      }
      case 'EXKIT': {
        title = 'Examination Staff (EXKIT)';
        description = 'College-wide examination officers and hall ticket administrators.';
        const records = await ExamStaff.findAll({
          attributes: ['id', 'instituteId', 'name', 'email', 'createdAt'],
          order: [['instituteId', 'ASC']]
        });
        users = records.map(r => ({
          id: r.id,
          instituteId: r.instituteId,
          name: r.name,
          email: r.email,
          secondaryField: 'Exam Controller',
          department: 'College-Wide Exam Division',
          createdAt: r.createdAt
        }));
        break;
      }
      case 'SAKIT': {
        title = 'Super Administrators (SAKIT)';
        description = 'Root institutional administrators with master configuration authority.';
        const records = await SuperAdmin.findAll({
          attributes: ['id', 'instituteId', 'name', 'email', 'createdAt'],
          order: [['instituteId', 'ASC']]
        });
        users = records.map(r => ({
          id: r.id,
          instituteId: r.instituteId,
          name: r.name,
          email: r.email,
          secondaryField: 'Root Authority',
          department: 'Institutional Governance',
          createdAt: r.createdAt
        }));
        break;
      }
      default:
        return res.status(400).json({ error: `Unknown ID prefix: ${prefix}` });
    }

    res.json({
      prefix: normalizedPrefix,
      title,
      description,
      totalCount: users.length,
      users
    });
  } catch (error) {
    console.error('Error fetching ID registry users:', error);
    res.status(500).json({ error: 'Failed to fetch ID registry details' });
  }
};
