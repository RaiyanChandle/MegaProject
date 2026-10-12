import { DataTypes } from 'sequelize';
import { uuidPk } from './constants.js';

export default (sequelize) => {
  const ResultCard = sequelize.define('ResultCard', {
    ...uuidPk,
    studentId: { type: DataTypes.UUID, allowNull: false },
    academicTermId: { type: DataTypes.UUID, allowNull: false },
    resultType: { 
      type: DataTypes.STRING(20), 
      allowNull: false, 
      defaultValue: 'COMBINED' // 'MSE' | 'ESE' | 'COMBINED'
    },
    totalMarks: { type: DataTypes.FLOAT, allowNull: true },
    totalMaxMarks: { type: DataTypes.FLOAT, allowNull: true },
    percentage: { type: DataTypes.FLOAT, allowNull: true },
    sgpa: { type: DataTypes.FLOAT, allowNull: true }, // ONLY generated for 'COMBINED'
    standing: { type: DataTypes.STRING(50), allowNull: true }, // 'PASS' | 'FAIL' | 'ATKT' | 'INCOMPLETE'
    processedById: { type: DataTypes.UUID, allowNull: true }, // -> ExamStaff
    processedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'result_cards',
    timestamps: true,
    indexes: [{ unique: true, fields: ['studentId', 'academicTermId', 'resultType'] }],
  });
  return ResultCard;
};
