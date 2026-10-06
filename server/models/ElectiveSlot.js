import { DataTypes } from 'sequelize';
import { uuidPk, SUBJECT_TYPES, ENROLLMENT_STATUSES, ELECTIVE_CHOICE_STATUSES, LEAVE_STATUSES, FEE_TYPES, PAYMENT_STATUSES, EXAM_TYPES, QUESTION_PAPER_STATUSES, ANNOUNCEMENT_TYPES, SUBMISSION_STATUSES, COMPONENT_CATEGORIES, MARK_ENTRY_METHODS } from './constants.js';

export default (sequelize) => {
  const ElectiveSlot = sequelize.define('ElectiveSlot', {
  ...uuidPk,
  classId: { type: DataTypes.UUID, allowNull: false },
  slotName: { type: DataTypes.STRING, allowNull: false }, // "PE-1", "OE-2"
  slotType: { type: DataTypes.ENUM(...SUBJECT_TYPES), allowNull: false }, // PROGRAM_ELECTIVE or OPEN_ELECTIVE
  credits: { type: DataTypes.FLOAT, allowNull: false },
}, { tableName: 'elective_slots', timestamps: true });
  return ElectiveSlot;
};
