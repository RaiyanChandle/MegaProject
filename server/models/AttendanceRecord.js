import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const AttendanceRecord = sequelize.define('AttendanceRecord', {
  ...uuidPk,
  sessionId: { type: DataTypes.UUID, allowNull: false },
  enrollmentId: { type: DataTypes.UUID, allowNull: false },
  studentId: { type: DataTypes.UUID, allowNull: false },
  present: { type: DataTypes.BOOLEAN, allowNull: false },
  markedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  editedAt: { type: DataTypes.DATE, allowNull: true }, // set only on correction — kept separate from markedAt for audit
}, {
  tableName: 'attendance_records',
  timestamps: true,
  indexes: [{ unique: true, fields: ['sessionId', 'enrollmentId'] }],
});
  return AttendanceRecord;
};
