'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // T11.1 PRD Decision 3: Add componentId to exams table
    // Links each exam to the specific AssessmentComponent it maps to.
    // e.g. a FINAL exam → "End Sem" component, a MIDTERM → "Mid Sem" component.
    // When ExamResult marks are entered, they can auto-sync into ComponentMark
    // for this component. Nullable because legacy/existing exams may not have
    // a mapping yet, and not all exam types need one.
    const tableDescription = await queryInterface.describeTable('exams');
    if (!tableDescription.componentId) {
      await queryInterface.addColumn('exams', 'componentId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'assessment_components',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('exams', 'componentId');
  }
};
