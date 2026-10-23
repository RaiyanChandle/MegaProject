import {
  Announcement,
  SuperAdmin,
  DepartmentAdmin,
  Teacher,
  Department,
  Class,
  Division,
  SubjectAllocation,
  Student,
  Enrollment,
  ParentStudent
} from '../models/index.js';
import { ANNOUNCEMENT_TYPES } from '../models/constants.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T14.1: CREATE ANNOUNCEMENTS WITH TARGETING (FLOW 13, RULES 28/29/32)
 * =====================================================================
 * 
 * Flow 13:
 * 1. Super Admin, Department Admin, or Teacher creates an Announcement,
 *    setting exactly one creator field (createdBySuperAdminId / 
 *    createdByDeptAdminId / createdByTeacherId).
 * 2. Targeting fields (targetDepartmentId, targetClassId, targetDivisionId)
 *    are set based on audience.
 *    - targetDepartmentId = null -> College-wide (all departments)
 *    - targetClassId = null -> All classes in department
 *    - targetDivisionId = null -> Entire class (all divisions)
 * =====================================================================
 */

export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      message,
      type,
      targetDepartmentId,
      targetClassId,
      targetDivisionId
    } = req.body;
    const user = req.user;

    // 1. Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }
    if (!type || !ANNOUNCEMENT_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid announcement type. Allowed types: ${ANNOUNCEMENT_TYPES.join(', ')}`
      });
    }

    // 2. Creator resolution (Flow 13: exactly one creator field set)
    let createdBySuperAdminId = null;
    let createdByDeptAdminId = null;
    let createdByTeacherId = null;

    let finalTargetDeptId = targetDepartmentId || null;
    let finalTargetClassId = targetClassId || null;
    let finalTargetDivId = targetDivisionId || null;

    if (user.role === 'SUPER_ADMIN') {
      createdBySuperAdminId = user.id;

      // If type is GLOBAL, wildcard all targets
      if (type === 'GLOBAL') {
        finalTargetDeptId = null;
        finalTargetClassId = null;
        finalTargetDivId = null;
      } else {
        if (finalTargetClassId && !finalTargetDeptId) {
          const cls = await Class.findByPk(finalTargetClassId);
          if (cls) finalTargetDeptId = cls.departmentId;
        }
        if (finalTargetDivId) {
          if (!finalTargetClassId) {
            return res.status(400).json({ error: 'Target class must be specified when specifying a division.' });
          }
          const div = await Division.findOne({
            where: { id: finalTargetDivId, classId: finalTargetClassId }
          });
          if (!div) {
            return res.status(400).json({ error: 'Target division does not belong to the selected class.' });
          }
        }
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      createdByDeptAdminId = user.id;

      // Dept Admin can only broadcast within their own department
      if (type === 'GLOBAL') {
        return res.status(403).json({
          error: 'Department Admins cannot create college-wide (GLOBAL) announcements. Only Super Admin can post global notices.'
        });
      }

      finalTargetDeptId = user.departmentId;
      if (!finalTargetDeptId) {
        const adminRec = await DepartmentAdmin.findByPk(user.id);
        if (adminRec?.departmentId) {
          finalTargetDeptId = adminRec.departmentId;
        }
      }

      // Validate class if provided
      if (finalTargetClassId) {
        const cls = await Class.findOne({
          where: { id: finalTargetClassId, departmentId: finalTargetDeptId }
        });
        if (!cls) {
          return res.status(400).json({ error: 'Target class does not belong to your department.' });
        }
      }

      // Validate division if provided
      if (finalTargetDivId) {
        if (!finalTargetClassId) {
          return res.status(400).json({ error: 'Target class must be specified when specifying a division.' });
        }
        const div = await Division.findOne({
          where: { id: finalTargetDivId, classId: finalTargetClassId }
        });
        if (!div) {
          return res.status(400).json({ error: 'Target division does not belong to the selected class.' });
        }
      }
    } else if (user.role === 'TEACHER') {
      createdByTeacherId = user.id;

      // Teacher cannot create GLOBAL or general departmental broadcasts
      if (type === 'GLOBAL') {
        return res.status(403).json({
          error: 'Teachers cannot create college-wide (GLOBAL) announcements.'
        });
      }

      finalTargetDeptId = user.departmentId;
      if (!finalTargetDeptId) {
        const teacherRec = await Teacher.findByPk(user.id);
        if (teacherRec?.departmentId) {
          finalTargetDeptId = teacherRec.departmentId;
        }
      }

      // Validate class
      if (finalTargetClassId) {
        const cls = await Class.findByPk(finalTargetClassId);
        if (!cls || cls.departmentId !== finalTargetDeptId) {
          return res.status(403).json({ error: 'Target class not found or not in your department.' });
        }
      }

      // Validate division if provided
      if (finalTargetDivId) {
        if (!finalTargetClassId) {
          return res.status(400).json({ error: 'Target class must be specified when selecting a division.' });
        }
        const div = await Division.findOne({
          where: { id: finalTargetDivId, classId: finalTargetClassId }
        });
        if (!div) {
          return res.status(400).json({ error: 'Target division does not belong to the selected class.' });
        }
      }
    } else {
      return res.status(403).json({ error: 'Insufficient permissions to create announcements.' });
    }

    // 3. Create Announcement
    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      type,
      targetDepartmentId: finalTargetDeptId,
      targetClassId: finalTargetClassId,
      targetDivisionId: finalTargetDivId,
      createdBySuperAdminId,
      createdByDeptAdminId,
      createdByTeacherId,
    });

    // 4. Fetch populated record with eager-loaded details
    const populated = await Announcement.findByPk(announcement.id, {
      include: [
        { model: SuperAdmin, as: 'createdBySuperAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: DepartmentAdmin, as: 'createdByDeptAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: Teacher, as: 'createdByTeacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Department, as: 'targetDepartment', attributes: ['id', 'name', 'code'] },
        { model: Class, as: 'targetClass', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] },
        { model: Division, as: 'targetDivision', attributes: ['id', 'name'] },
      ]
    });

    return res.status(201).json(populated);
  } catch (error) {
    console.error('Create announcement error:', error);
    return res.status(500).json({ error: 'Failed to create announcement: ' + error.message });
  }
};

/**
 * Get announcements (Management / Desk list)
 * Supports role-based filtering, audience role isolation, and wildcard query handling.
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { type, search, targetDepartmentId, targetClassId, targetDivisionId } = req.query;
    const user = req.user;

    const andConditions = [];

    // Filter by announcement type if explicitly requested
    if (type && ANNOUNCEMENT_TYPES.includes(type)) {
      andConditions.push({ type });
    }

    // Text search on title or message
    if (search && search.trim()) {
      andConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: `%${search.trim()}%` } },
          { message: { [Op.iLike]: `%${search.trim()}%` } },
        ]
      });
    }

    // Strict Role-based audience isolation and scope filtering
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin sees all announcements, can filter via query params
      if (targetDepartmentId) andConditions.push({ targetDepartmentId });
      if (targetClassId) andConditions.push({ targetClassId });
      if (targetDivisionId) andConditions.push({ targetDivisionId });

    } else if (user.role === 'DEPARTMENT_ADMIN') {
      // Dept Admin: ONLY sees college-wide (null) OR their department's announcements OR created by them
      let deptId = user.departmentId;
      if (!deptId) {
        const da = await DepartmentAdmin.findByPk(user.id);
        if (da) deptId = da.departmentId;
      }

      andConditions.push({
        [Op.or]: [
          { targetDepartmentId: null },
          ...(deptId ? [{ targetDepartmentId: deptId }] : []),
          { createdByDeptAdminId: user.id }
        ]
      });

      if (targetClassId) andConditions.push({ targetClassId });
      if (targetDivisionId) andConditions.push({ targetDivisionId });

    } else if (user.role === 'TEACHER') {
      // Teacher:
      // 1. MUST NOT see PARENT notices unless created by this teacher
      // 2. ONLY sees notices for their department (or college-wide null) or created by them
      // 3. Class/Division notices must match allocations or be created by teacher
      let teacherDeptId = user.departmentId;
      if (!teacherDeptId) {
        const t = await Teacher.findByPk(user.id);
        if (t) teacherDeptId = t.departmentId;
      }

      const allocations = await SubjectAllocation.findAll({
        where: { teacherId: user.id },
        attributes: ['classId', 'divisionId']
      });
      const taughtClassIds = [...new Set(allocations.map(a => a.classId).filter(Boolean))];
      const taughtDivisionIds = [...new Set(allocations.map(a => a.divisionId).filter(Boolean))];

      // Exclude PARENT notices not created by this teacher
      andConditions.push({
        [Op.or]: [
          { type: { [Op.ne]: 'PARENT' } },
          { createdByTeacherId: user.id }
        ]
      });

      // Scope match
      andConditions.push({
        [Op.or]: [
          { createdByTeacherId: user.id },
          // College-wide notice
          { targetDepartmentId: null, targetClassId: null, targetDivisionId: null },
          // Department notices in teacher's department:
          {
            targetDepartmentId: teacherDeptId,
            [Op.and]: [
              {
                [Op.or]: [
                  { targetClassId: null },
                  ...(taughtClassIds.length > 0 ? [{ targetClassId: { [Op.in]: taughtClassIds } }] : [])
                ]
              },
              {
                [Op.or]: [
                  { targetDivisionId: null },
                  ...(taughtDivisionIds.length > 0 ? [{ targetDivisionId: { [Op.in]: taughtDivisionIds } }] : [])
                ]
              }
            ]
          }
        ]
      });

    } else if (user.role === 'STUDENT') {
      // Student notice feed:
      // 1. STRICTLY EXCLUDE TEACHER and PARENT notices
      // 2. Must match student's department (or college-wide null)
      // 3. Must match student's class (or class wildcard null)
      // 4. Must match student's division (or division wildcard null)
      const student = await Student.findByPk(user.id, {
        include: [{ model: Division, as: 'division', attributes: ['id', 'classId'] }]
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }

      const enrollments = await Enrollment.findAll({
        where: { studentId: user.id },
        attributes: ['classId']
      });

      const enrolledClassIds = [...new Set([
        ...(student.division?.classId ? [student.division.classId] : []),
        ...enrollments.map(e => e.classId).filter(Boolean)
      ])];

      // Exclude staff-only and parent-only announcements
      andConditions.push({
        type: { [Op.notIn]: ['TEACHER', 'PARENT'] }
      });

      // 1. Department match: college-wide wildcard (null) or student's department
      andConditions.push({
        [Op.or]: [
          { targetDepartmentId: null },
          ...(student.departmentId ? [{ targetDepartmentId: student.departmentId }] : [])
        ]
      });

      // 2. Class match: all-classes wildcard (null) or student's enrolled classes
      andConditions.push({
        [Op.or]: [
          { targetClassId: null },
          ...(enrolledClassIds.length > 0 ? [{ targetClassId: { [Op.in]: enrolledClassIds } }] : [])
        ]
      });

      // 3. Division match: all-divisions wildcard (null) or student's division
      andConditions.push({
        [Op.or]: [
          { targetDivisionId: null },
          ...(student.divisionId ? [{ targetDivisionId: student.divisionId }] : [])
        ]
      });

    } else if (user.role === 'PARENT') {
      // Parent notice feed:
      // 1. Exclude TEACHER memos
      // 2. Scoped to linked children (supports ?studentId=... filter)
      const { studentId: queryStudentId } = req.query;

      const linkages = await ParentStudent.findAll({
        where: { parentId: user.id },
        attributes: ['studentId']
      });
      let studentIds = linkages.map(l => l.studentId);

      if (queryStudentId && queryStudentId !== 'ALL') {
        if (!studentIds.includes(queryStudentId)) {
          return res.status(403).json({ error: 'Selected student is not linked to your parent account.' });
        }
        studentIds = [queryStudentId];
      }

      if (studentIds.length === 0) {
        andConditions.push({
          type: { [Op.ne]: 'TEACHER' },
          targetDepartmentId: null
        });
      } else {
        const linkedStudents = await Student.findAll({
          where: { id: studentIds },
          include: [{ model: Division, as: 'division', attributes: ['id', 'classId'] }]
        });

        const linkedEnrollments = await Enrollment.findAll({
          where: { studentId: studentIds },
          attributes: ['classId']
        });

        const parentDeptIds = [...new Set(linkedStudents.map(s => s.departmentId).filter(Boolean))];
        const parentClassIds = [...new Set([
          ...linkedStudents.map(s => s.division?.classId).filter(Boolean),
          ...linkedEnrollments.map(e => e.classId).filter(Boolean)
        ])];
        const parentDivIds = [...new Set(linkedStudents.map(s => s.divisionId).filter(Boolean))];

        // Exclude staff-internal notices
        andConditions.push({
          type: { [Op.ne]: 'TEACHER' }
        });

        andConditions.push({
          [Op.or]: [
            { targetDepartmentId: null },
            ...(parentDeptIds.length > 0 ? [{
              targetDepartmentId: { [Op.in]: parentDeptIds },
              [Op.and]: [
                {
                  [Op.or]: [
                    { targetClassId: null },
                    ...(parentClassIds.length > 0 ? [{ targetClassId: { [Op.in]: parentClassIds } }] : [])
                  ]
                },
                {
                  [Op.or]: [
                    { targetDivisionId: null },
                    ...(parentDivIds.length > 0 ? [{ targetDivisionId: { [Op.in]: parentDivIds } }] : [])
                  ]
                }
              ]
            }] : [])
          ]
        });
      }

    } else if (user.role === 'EXAM_STAFF') {
      // Exam staff sees institutional and departmental notices, excluding teacher/parent internal memos and division chats
      andConditions.push({
        type: { [Op.in]: ['GLOBAL', 'DEPARTMENT', 'CLASS'] }
      });
      if (targetDepartmentId) andConditions.push({ targetDepartmentId });
      if (targetClassId) andConditions.push({ targetClassId });
    }

    const whereConditions = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const announcements = await Announcement.findAll({
      where: whereConditions,
      include: [
        { model: SuperAdmin, as: 'createdBySuperAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: DepartmentAdmin, as: 'createdByDeptAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: Teacher, as: 'createdByTeacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Department, as: 'targetDepartment', attributes: ['id', 'name', 'code'] },
        { model: Class, as: 'targetClass', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] },
        { model: Division, as: 'targetDivision', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcements: ' + error.message });
  }
};

/**
 * Get announcement by ID
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByPk(id, {
      include: [
        { model: SuperAdmin, as: 'createdBySuperAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: DepartmentAdmin, as: 'createdByDeptAdmin', attributes: ['id', 'name', 'instituteId'] },
        { model: Teacher, as: 'createdByTeacher', attributes: ['id', 'name', 'instituteId'] },
        { model: Department, as: 'targetDepartment', attributes: ['id', 'name', 'code'] },
        { model: Class, as: 'targetClass', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] },
        { model: Division, as: 'targetDivision', attributes: ['id', 'name'] },
      ]
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    return res.json(announcement);
  } catch (error) {
    console.error('Get announcement by ID error:', error);
    return res.status(500).json({ error: 'Failed to fetch announcement details.' });
  }
};

/**
 * Delete an announcement
 * - Super Admin can delete any
 * - Dept Admin can delete announcements they created or within their department
 * - Teacher can delete announcements they created
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    // Permission check
    if (user.role === 'SUPER_ADMIN') {
      // Super Admin can delete any
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      let userDeptId = user.departmentId;
      if (!userDeptId) {
        const da = await DepartmentAdmin.findByPk(user.id);
        if (da) userDeptId = da.departmentId;
      }
      const isOwner = announcement.createdByDeptAdminId === user.id;
      const isSameDept = Boolean(userDeptId && announcement.targetDepartmentId === userDeptId);
      if (!isOwner && !isSameDept) {
        return res.status(403).json({ error: 'You do not have permission to delete this announcement.' });
      }
    } else if (user.role === 'TEACHER') {
      if (announcement.createdByTeacherId !== user.id) {
        return res.status(403).json({ error: 'You can only delete announcements that you created.' });
      }
    } else {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    await announcement.destroy();
    return res.json({ message: 'Announcement deleted successfully.', id });
  } catch (error) {
    console.error('Delete announcement error:', error);
    return res.status(500).json({ error: 'Failed to delete announcement: ' + error.message });
  }
};
