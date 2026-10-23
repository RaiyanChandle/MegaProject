import { Op } from 'sequelize';
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
  Enrollment,
  LeaveRequest,
  Announcement,
  SubjectAllocation
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

/**
 * =====================================================================
 * DEPARTMENT ADMIN DASHBOARD ANALYTICS
 * Scoped strictly to the Department Admin's department
 * =====================================================================
 */
export const getDeptAdminStats = async (req, res) => {
  try {
    let departmentId = req.user.departmentId;
    let deptAdmin = null;

    if (!departmentId) {
      deptAdmin = await DepartmentAdmin.findByPk(req.user.id, {
        include: [{ model: Department, as: 'department' }]
      });
      if (deptAdmin) {
        departmentId = deptAdmin.departmentId;
      }
    } else {
      deptAdmin = await DepartmentAdmin.findByPk(req.user.id, {
        include: [{ model: Department, as: 'department' }]
      });
    }

    if (!departmentId) {
      return res.status(404).json({ error: 'Department Admin not assigned to any department' });
    }

    const department = deptAdmin?.department || await Department.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Parallel fetch for departmental metrics
    const [
      studentsCount,
      teachersCount,
      classes,
      subjects,
      currentTerm,
      pendingStudentLeaves,
      pendingTeacherLeaves,
      recentAnnouncements,
      batchesData,
      subjectAllocations
    ] = await Promise.all([
      Student.count({ where: { departmentId } }),
      Teacher.count({ where: { departmentId } }),
      Class.findAll({
        where: { departmentId },
        include: [
          { model: Division, as: 'divisions', attributes: ['id', 'name'] },
          { model: Subject, as: 'subjects', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] }
        ],
        order: [['semesterNumber', 'ASC'], ['batchYear', 'DESC']]
      }),
      Subject.findAll({
        where: { departmentId },
        attributes: ['id', 'name', 'code', 'subjectType', 'credits', 'classId']
      }),
      AcademicTerm.findOne({ where: { isCurrent: true } }),
      LeaveRequest.findAll({
        where: { status: 'PENDING' },
        include: [
          {
            model: Student,
            as: 'student',
            where: { departmentId },
            attributes: ['id', 'name', 'rollNumber', 'batchYear', 'instituteId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      LeaveRequest.findAll({
        where: { status: 'PENDING' },
        include: [
          {
            model: Teacher,
            as: 'teacher',
            where: { departmentId },
            attributes: ['id', 'name', 'instituteId']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Announcement.findAll({
        where: {
          [Op.or]: [
            { targetDepartmentId: departmentId },
            { targetDepartmentId: null }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5
      }),
      Student.findAll({
        where: { departmentId },
        attributes: [
          'batchYear',
          [sequelize.fn('COUNT', sequelize.col('id')), 'studentCount']
        ],
        group: ['batchYear'],
        order: [['batchYear', 'ASC']]
      }),
      SubjectAllocation.findAll({
        include: [
          {
            model: Subject,
            as: 'subject',
            where: { departmentId },
            attributes: ['id', 'name', 'code']
          },
          {
            model: Teacher,
            as: 'teacher',
            attributes: ['id', 'name', 'instituteId']
          },
          {
            model: Class,
            as: 'class',
            attributes: ['id', 'name', 'batchYear', 'semesterNumber']
          },
          {
            model: Division,
            as: 'division',
            attributes: ['id', 'name']
          }
        ]
      })
    ]);

    // Subject allocation status
    const allocatedSubjectIds = new Set(subjectAllocations.map(sa => sa.subjectId));
    const totalSubjectsCount = subjects.length;
    const allocatedSubjectsCount = subjects.filter(s => allocatedSubjectIds.has(s.id)).length;
    const unallocatedSubjects = subjects
      .filter(s => !allocatedSubjectIds.has(s.id))
      .map(s => {
        const cls = classes.find(c => c.id === s.classId);
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          subjectType: s.subjectType,
          className: cls ? cls.name : 'Unknown Class',
          classId: s.classId
        };
      });

    // Classes summary with divisions
    let totalDivisionsCount = 0;
    const classesSummary = classes.map(c => {
      const divCount = c.divisions ? c.divisions.length : 0;
      totalDivisionsCount += divCount;
      return {
        id: c.id,
        name: c.name,
        batchYear: c.batchYear,
        semesterNumber: c.semesterNumber,
        divisionsCount: divCount,
        divisions: c.divisions ? c.divisions.map(d => d.name) : [],
        subjectsCount: c.subjects ? c.subjects.length : 0
      };
    });

    // Subject type breakdown
    const subjectTypesBreakdown = {
      core: subjects.filter(s => s.subjectType === 'CORE').length,
      programElective: subjects.filter(s => s.subjectType === 'PROGRAM_ELECTIVE').length,
      openElective: subjects.filter(s => s.subjectType === 'OPEN_ELECTIVE').length
    };

    // Pending leaves list
    const combinedPendingLeaves = [
      ...pendingStudentLeaves.map(l => ({
        id: l.id,
        type: 'Student',
        name: l.student?.name || 'Unknown Student',
        instituteId: l.student?.instituteId,
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason: l.reason,
        createdAt: l.createdAt
      })),
      ...pendingTeacherLeaves.map(l => ({
        id: l.id,
        type: 'Teacher',
        name: l.teacher?.name || 'Unknown Faculty',
        instituteId: l.teacher?.instituteId,
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason: l.reason,
        createdAt: l.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Department Attendance Calculation
    const classIds = classes.map(c => c.id);
    let totalDeptSessions = 0;
    let totalAttendanceRecords = 0;
    let presentAttendanceRecords = 0;
    let overallAttendanceRate = null;

    if (classIds.length > 0) {
      totalDeptSessions = await AttendanceSession.count({
        where: { classId: { [Op.in]: classIds } }
      }).catch(() => 0);

      const sessions = await AttendanceSession.findAll({
        where: { classId: { [Op.in]: classIds } },
        attributes: ['id']
      }).catch(() => []);

      const sessionIds = sessions.map(s => s.id);
      if (sessionIds.length > 0) {
        totalAttendanceRecords = await AttendanceRecord.count({
          where: { sessionId: { [Op.in]: sessionIds } }
        }).catch(() => 0);

        presentAttendanceRecords = await AttendanceRecord.count({
          where: { 
            sessionId: { [Op.in]: sessionIds },
            present: true 
          }
        }).catch(() => 0);

        if (totalAttendanceRecords > 0) {
          overallAttendanceRate = Math.round((presentAttendanceRecords / totalAttendanceRecords) * 100);
        }
      }
    }

    const batchDistribution = batchesData.map(b => ({
      batchYear: b.get('batchYear') || 'Unassigned',
      count: parseInt(b.get('studentCount'), 10) || 0
    }));

    const studentTeacherRatio = teachersCount > 0 ? (studentsCount / teachersCount).toFixed(1) : 'N/A';

    res.json({
      department: {
        id: department.id,
        name: department.name,
        code: department.code
      },
      admin: {
        id: deptAdmin?.id || req.user.id,
        name: deptAdmin?.name || 'Department Administrator',
        email: deptAdmin?.email || '',
        instituteId: deptAdmin?.instituteId || req.user.instituteId || 'DAKIT0001'
      },
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
        isCurrent: currentTerm.isCurrent
      } : null,
      stats: {
        studentsCount,
        teachersCount,
        classesCount: classes.length,
        divisionsCount: totalDivisionsCount,
        subjectsCount: totalSubjectsCount,
        allocatedSubjectsCount,
        unallocatedSubjectsCount: unallocatedSubjects.length,
        allocationRate: totalSubjectsCount > 0 ? Math.round((allocatedSubjectsCount / totalSubjectsCount) * 100) : 100,
        pendingLeavesCount: combinedPendingLeaves.length,
        studentTeacherRatio,
        overallAttendanceRate,
        totalDeptSessions
      },
      subjectTypesBreakdown,
      unallocatedSubjects: unallocatedSubjects.slice(0, 5),
      classesSummary,
      batchDistribution,
      pendingLeaves: combinedPendingLeaves.slice(0, 5),
      recentAnnouncements: recentAnnouncements.map(a => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        createdAt: a.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching department admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch department analytics' });
  }
};
