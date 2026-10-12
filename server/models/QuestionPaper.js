import { DataTypes } from 'sequelize';
import { uuidPk, QUESTION_PAPER_STATUSES } from './constants.js';

export default (sequelize) => {
  const QuestionPaper = sequelize.define('QuestionPaper', {
    ...uuidPk,
    examId: { type: DataTypes.UUID, allowNull: false },
    createdById: { type: DataTypes.UUID, allowNull: false }, // -> Teacher or ExamStaff
    fileUrl: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM(...QUESTION_PAPER_STATUSES), allowNull: false, defaultValue: 'DRAFT' },
    verificationRemarks: { type: DataTypes.TEXT, allowNull: true },
    verifiedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
    verifiedAt: { type: DataTypes.DATE, allowNull: true },
  }, { tableName: 'question_papers', timestamps: true });
  return QuestionPaper;
};
