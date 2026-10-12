import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const StudentElectiveChoice = sequelize.define('StudentElectiveChoice', {
  ...uuidPk,
  studentId: { type: DataTypes.UUID, allowNull: false },
  slotId: { type: DataTypes.UUID, allowNull: false },
  chosenSubjectId: { type: DataTypes.UUID, allowNull: false },
  status: { type: DataTypes.ENUM(...ELECTIVE_CHOICE_STATUSES), allowNull: false, defaultValue: 'PENDING' },
  chosenAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'student_elective_choices',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId', 'slotId'] }],
});
  return StudentElectiveChoice;
};
