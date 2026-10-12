import { 
  LeaveRequest, 
  Student, 
  Teacher, 
  DepartmentAdmin, 
  Department 
} from '../models/index.js';
import { LEAVE_STATUSES } from '../models/constants.js';
import { Op } from 'sequelize';

/**
 * =====================================================================
 * T14.3: LEAVE REQUESTS (STUDENT OR TEACHER) WITH EXACTLY-ONE-REQUESTER HOOK
 * FLOW 14 (RULES 30/33)
 * =====================================================================
 * 
 * Flow 14:
 * 1. Either a Student or a Teacher creates a LeaveRequest — exactly one of
 *    studentId/teacherId is set, never both.
 * 2. Department Admin reviews and sets status to APPROVED or REJECTED,
 *    recording resolvedByDeptAdminId and resolvedAt.
 * 3. The approval routing branches in application code based on which
 *    requester field is populated.
 * =====================================================================
 */

/**
 * Submit a leave request (Student or Teacher)
 * POST /api/leaves
 */
export const createLeaveRequest = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;
    const user = req.user;

    // 1. Role validation
    if (!['STUDENT', 'TEACHER'].includes(user.role)) {
      return res.status(403).json({
        error: 'Only students and teachers are permitted to submit leave requests.'
      });
    }

    // 2. Input validation
    if (!fromDate) {
      return res.status(400).json({ error: 'From Date is required.' });
    }
    if (!toDate) {
      return res.status(400).json({ error: 'To Date is required.' });
    }
    if (!reason || !reason.trim() || reason.trim().length < 3) {
      return res.status(400).json({ error: 'A valid reason (minimum 3 characters) is required.' });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return res.status(400).json({ error: 'Invalid date format provided for leave period.' });
    }
    if (from > to) {
      return res.status(400).json({ error: 'From Date must be on or before To Date.' });
    }

    // 3. Exactly-one-requester determination (Flow 14)
    let studentId = null;
    let teacherId = null;

    if (user.role === 'STUDENT') {
      studentId = user.id;
      teacherId = null;
    } else if (user.role === 'TEACHER') {
      teacherId = user.id;
      studentId = null;
    }

    // 4. Create record — beforeValidate hook on LeaveRequest enforces exactly-one-requester
    const leaveRequest = await LeaveRequest.create({
      studentId,
      teacherId,
      fromDate: from,
      toDate: to,
      reason: reason.trim(),
      status: 'PENDING'
    });

    // 5. Fetch with relations for rich client response
    const populated = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'instituteId', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        {
          model: DepartmentAdmin,
          as: 'resolvedByDeptAdmin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      message: 'Leave request submitted successfully.',
      leaveRequest: populated
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(400).json({ error: error.message || 'Failed to submit leave request.' });
  }
};

/**
 * Get the authenticated user's leave requests
 * GET /api/leaves/my-requests
 */
export const getMyLeaveRequests = async (req, res) => {
  try {
    const user = req.user;
    const { status } = req.query;

    if (!['STUDENT', 'TEACHER'].includes(user.role)) {
      return res.status(403).json({
        error: 'Only students and teachers can view their own leave requests.'
      });
    }

    const where = {};
    if (user.role === 'STUDENT') {
      where.studentId = user.id;
    } else if (user.role === 'TEACHER') {
      where.teacherId = user.id;
    }

    if (status && status !== 'ALL') {
      if (LEAVE_STATUSES.includes(status)) {
        where.status = status;
      }
    }

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: DepartmentAdmin,
          as: 'resolvedByDeptAdmin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching my leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests.' });
  }
};

/**
 * Cancel/withdraw a pending leave request
 * DELETE /api/leaves/:id
 */
export const cancelLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    // Verify ownership
    const isOwner = (user.role === 'STUDENT' && leaveRequest.studentId === user.id) ||
                    (user.role === 'TEACHER' && leaveRequest.teacherId === user.id);

    if (!isOwner) {
      return res.status(403).json({ error: 'You are not authorized to cancel this leave request.' });
    }

    // Only pending requests can be cancelled
    if (leaveRequest.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot cancel a leave request that has already been ${leaveRequest.status.toLowerCase()}.`
      });
    }

    await leaveRequest.destroy();

    res.json({ message: 'Leave request cancelled successfully.' });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({ error: 'Failed to cancel leave request.' });
  }
};

/**
 * Get department leave requests for Department Admin / Super Admin
 * GET /api/leaves/department
 */
export const getDepartmentLeaveRequests = async (req, res) => {
  try {
    const user = req.user;
    const { status, role } = req.query;

    const where = {};
    if (status && status !== 'ALL' && LEAVE_STATUSES.includes(status)) {
      where.status = status;
    }

    if (role === 'STUDENT') {
      where.studentId = { [Op.ne]: null };
    } else if (role === 'TEACHER') {
      where.teacherId = { [Op.ne]: null };
    }

    // Scoping by department for Department Admin
    if (user.role === 'DEPARTMENT_ADMIN') {
      const deptStudents = await Student.findAll({
        where: { departmentId: user.departmentId },
        attributes: ['id']
      });
      const deptTeachers = await Teacher.findAll({
        where: { departmentId: user.departmentId },
        attributes: ['id']
      });

      const studentIds = deptStudents.map((s) => s.id);
      const teacherIds = deptTeachers.map((t) => t.id);

      const orConditions = [];
      if (studentIds.length > 0) {
        orConditions.push({ studentId: { [Op.in]: studentIds } });
      }
      if (teacherIds.length > 0) {
        orConditions.push({ teacherId: { [Op.in]: teacherIds } });
      }

      if (orConditions.length > 0) {
        where[Op.or] = orConditions;
      } else {
        return res.json([]);
      }
    }

    const requests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'instituteId', 'departmentId'],
          include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
        },
        {
          model: DepartmentAdmin,
          as: 'resolvedByDeptAdmin',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(requests);
  } catch (error) {
    console.error('Error fetching department leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch department leave requests.' });
  }
};

/**
 * Resolve (Approve / Reject) a leave request (Department Admin / Super Admin)
 * PATCH /api/leaves/:id/status
 */
export const resolveLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either APPROVED or REJECTED.' });
    }

    const leaveRequest = await LeaveRequest.findByPk(id, {
      include: [
        { model: Student, as: 'student', attributes: ['id', 'departmentId'] },
        { model: Teacher, as: 'teacher', attributes: ['id', 'departmentId'] }
      ]
    });

    if (!leaveRequest) {
      return res.status(404).json({ error: 'Leave request not found.' });
    }

    // If Department Admin, check department alignment
    if (user.role === 'DEPARTMENT_ADMIN') {
      const requesterDeptId = leaveRequest.student?.departmentId || leaveRequest.teacher?.departmentId;
      if (requesterDeptId && requesterDeptId !== user.departmentId) {
        return res.status(403).json({
          error: 'You can only review leave requests from your own department.'
        });
      }
    }

    leaveRequest.status = status;
    leaveRequest.resolvedByDeptAdminId = user.id;
    leaveRequest.resolvedAt = new Date();
    await leaveRequest.save();

    const updated = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'instituteId', 'rollNumber', 'batchYear', 'departmentId']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'name', 'instituteId', 'departmentId']
        },
        {
          model: DepartmentAdmin,
          as: 'resolvedByDeptAdmin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: `Leave request has been ${status.toLowerCase()} successfully.`,
      leaveRequest: updated
    });
  } catch (error) {
    console.error('Error resolving leave request:', error);
    res.status(500).json({ error: 'Failed to resolve leave request.' });
  }
};

/**
 * Get count of leave notifications for the user's role
 * - Department Admin / Super Admin: pending leave requests awaiting approval
 * - Student / Teacher: resolved (APPROVED / REJECTED) leave requests so they know decision was made
 * GET /api/leaves/pending-count
 */
export const getPendingLeaveCount = async (req, res) => {
  try {
    const user = req.user;
    let pendingCount = 0;
    let resolvedIds = [];

    if (user.role === 'DEPARTMENT_ADMIN') {
      const deptStudents = await Student.findAll({
        where: { departmentId: user.departmentId },
        attributes: ['id']
      });
      const deptTeachers = await Teacher.findAll({
        where: { departmentId: user.departmentId },
        attributes: ['id']
      });

      const studentIds = deptStudents.map((s) => s.id);
      const teacherIds = deptTeachers.map((t) => t.id);

      const orConditions = [];
      if (studentIds.length > 0) {
        orConditions.push({ studentId: { [Op.in]: studentIds } });
      }
      if (teacherIds.length > 0) {
        orConditions.push({ teacherId: { [Op.in]: teacherIds } });
      }

      if (orConditions.length > 0) {
        pendingCount = await LeaveRequest.count({
          where: {
            status: 'PENDING',
            [Op.or]: orConditions
          }
        });
      }
    } else if (user.role === 'SUPER_ADMIN') {
      pendingCount = await LeaveRequest.count({
        where: { status: 'PENDING' }
      });
    } else if (user.role === 'STUDENT') {
      // Requesters don't get pending notifications; they get notified when request is APPROVED or REJECTED
      const resolved = await LeaveRequest.findAll({
        where: {
          studentId: user.id,
          status: { [Op.in]: ['APPROVED', 'REJECTED'] }
        },
        attributes: ['id', 'status', 'resolvedAt'],
        order: [['resolvedAt', 'DESC']]
      });
      resolvedIds = resolved.map((r) => r.id);
    } else if (user.role === 'TEACHER') {
      // Requesters don't get pending notifications; they get notified when request is APPROVED or REJECTED
      const resolved = await LeaveRequest.findAll({
        where: {
          teacherId: user.id,
          status: { [Op.in]: ['APPROVED', 'REJECTED'] }
        },
        attributes: ['id', 'status', 'resolvedAt'],
        order: [['resolvedAt', 'DESC']]
      });
      resolvedIds = resolved.map((r) => r.id);
    }

    res.json({
      pendingCount,
      resolvedIds,
      count: user.role === 'DEPARTMENT_ADMIN' || user.role === 'SUPER_ADMIN' ? pendingCount : resolvedIds.length
    });
  } catch (error) {
    console.error('Error fetching pending leave count:', error);
    res.status(500).json({ error: 'Failed to fetch pending leave count.' });
  }
};

