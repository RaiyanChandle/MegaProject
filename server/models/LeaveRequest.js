import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
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
}, { 
    tableName: 'leave_requests', 
    timestamps: true,
    hooks: {
      beforeValidate: (instance) => {
        const hasStudent = Boolean(instance.studentId);
        const hasTeacher = Boolean(instance.teacherId);

        // Exactly one requester hook (Rule 33 / Flow 14)
        if ((hasStudent && hasTeacher) || (!hasStudent && !hasTeacher)) {
          throw new Error('LeaveRequest must have exactly one requester: either studentId or teacherId.');
        }

        if (instance.fromDate && instance.toDate) {
          const from = new Date(instance.fromDate);
          const to = new Date(instance.toDate);
          if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            throw new Error('Invalid leave dates: fromDate and toDate must be valid dates.');
          }
          if (from > to) {
            throw new Error('fromDate must be on or before toDate.');
          }
        }
      }
    }
  });
  return LeaveRequest;
};
