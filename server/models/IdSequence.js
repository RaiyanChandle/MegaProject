import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const IdSequence = sequelize.define('IdSequence', {
  ...uuidPk,
  prefix: { type: DataTypes.STRING, unique: true, allowNull: false }, // "STKIT", "FCKIT", "DAKIT", "SAKIT", "EXKIT"
  lastUsed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'id_sequences', timestamps: true });
  return IdSequence;
};
