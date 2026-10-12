import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const Announcement = sequelize.define('Announcement', {
  ...uuidPk,
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM(...ANNOUNCEMENT_TYPES), allowNull: false },
  // Targeting — NULL means "not scoped to this dimension" (wildcard =
  // broader audience), not "broken data." Loose fields, not enforced FKs.
  targetDepartmentId: { type: DataTypes.UUID, allowNull: true },
  targetClassId: { type: DataTypes.UUID, allowNull: true },
  targetDivisionId: { type: DataTypes.UUID, allowNull: true },
  createdBySuperAdminId: { type: DataTypes.UUID, allowNull: true },
  createdByDeptAdminId: { type: DataTypes.UUID, allowNull: true },
  createdByTeacherId: { type: DataTypes.UUID, allowNull: true },
}, { tableName: 'announcements', timestamps: true });
  return Announcement;
};
