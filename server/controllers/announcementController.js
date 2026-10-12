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
  Enrollment
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

      // Validate class if provided
      if (finalTargetClassId) {
        const cls = await Class.findOne({
          where: { id: finalTargetClassId, departmentId: user.departmentId }
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

      // Validate class
      if (finalTargetClassId) {
        // Verify class belongs to teacher's dept or teacher is allocated to it
        const cls = await Class.findByPk(finalTargetClassId);
        if (!cls || cls.departmentId !== user.departmentId) {
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
 * Supports role-based filtering and query params.
 */
export const getAnnouncements = async (req, res) => {
  try {
    const { type, search, targetDepartmentId, targetClassId } = req.query;
    const user = req.user;

    const whereConditions = {};

    // Filter by announcement type if requested
    if (type && ANNOUNCEMENT_TYPES.includes(type)) {
      whereConditions.type = type;
    }

    // Text search on title or message
    if (search && search.trim()) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { message: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    // Role-based visibility scoping
    if (user.role === 'SUPER_ADMIN' || user.role === 'EXAM_STAFF') {
      if (targetDepartmentId) {
        whereConditions.targetDepartmentId = targetDepartmentId;
      }
    } else if (user.role === 'DEPARTMENT_ADMIN') {
      // Dept Admin sees college-wide announcements (null) OR their department announcements
      whereConditions[Op.or] = [
        { targetDepartmentId: null },
        { targetDepartmentId: user.departmentId },
        { createdByDeptAdminId: user.id }
      ];
      if (targetClassId) {
        whereConditions.targetClassId = targetClassId;
      }
    } else if (user.role === 'TEACHER') {
      // Teacher sees college-wide announcements OR their department announcements OR created by them
      whereConditions[Op.or] = [
        { targetDepartmentId: null },
        { targetDepartmentId: user.departmentId },
        { createdByTeacherId: user.id }
      ];
    } else if (user.role === 'STUDENT') {
      // Student notice feed: matches wildcard rules (Rules 28/29, Flow 13.3)
      const student = await Student.findByPk(user.id, {
        include: [{ model: Division, as: 'division', attributes: ['id', 'classId'] }]
      });

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found.' });
      }

      // Enrolled classes
      const enrollments = await Enrollment.findAll({
        where: { studentId: user.id },
        attributes: ['classId']
      });

      const enrolledClassIds = [...new Set([
        ...(student.division?.classId ? [student.division.classId] : []),
        ...enrollments.map(e => e.classId).filter(Boolean)
      ])];

      // Exclude staff-only announcements
      whereConditions.type = { [Op.ne]: 'TEACHER' };

      const studentScopeClauses = [
        // 1. Department match: college-wide wildcard (null) or student's department
        {
          [Op.or]: [
            { targetDepartmentId: null },
            { targetDepartmentId: student.departmentId }
          ]
        },
        // 2. Class match: all-classes wildcard (null) or student's enrolled classes
        {
          [Op.or]: [
            { targetClassId: null },
            ...(enrolledClassIds.length > 0 ? [{ targetClassId: { [Op.in]: enrolledClassIds } }] : [])
          ]
        },
        // 3. Division match: all-divisions wildcard (null) or student's division
        {
          [Op.or]: [
            { targetDivisionId: null },
            ...(student.divisionId ? [{ targetDivisionId: student.divisionId }] : [])
          ]
        }
      ];

      whereConditions[Op.and] = studentScopeClauses;
    }

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
      const isOwner = announcement.createdByDeptAdminId === user.id;
      const isSameDept = announcement.targetDepartmentId === user.departmentId;
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
