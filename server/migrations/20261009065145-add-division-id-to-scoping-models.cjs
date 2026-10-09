'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add divisionId to subject_allocations
    await queryInterface.addColumn('subject_allocations', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // We must drop the old unique index and create a new one
    try {
      await queryInterface.removeIndex('subject_allocations', ['teacherId', 'subjectId', 'classId']);
    } catch (e) {
      console.log('Old index might not exist', e.message);
    }

    // Creating the new index. Some rows might have divisionId as null.
    // In PostgreSQL, nulls are distinct, so multiple nulls won't violate unique constraint.
    await queryInterface.addIndex('subject_allocations', ['teacherId', 'subjectId', 'classId', 'divisionId'], {
      unique: true,
      name: 'subject_allocations_unique_idx'
    });

    // 2. Add divisionId to attendance_sessions
    await queryInterface.addColumn('attendance_sessions', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 3. Add divisionId to notes
    await queryInterface.addColumn('notes', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 4. Add divisionId to assignments
    await queryInterface.addColumn('assignments', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 5. Add divisionId to meetings
    await queryInterface.addColumn('meetings', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 6. Add divisionId to online_tests
    await queryInterface.addColumn('online_tests', 'divisionId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'divisions',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert everything
    await queryInterface.removeColumn('online_tests', 'divisionId');
    await queryInterface.removeColumn('meetings', 'divisionId');
    await queryInterface.removeColumn('assignments', 'divisionId');
    await queryInterface.removeColumn('notes', 'divisionId');
    await queryInterface.removeColumn('attendance_sessions', 'divisionId');

    await queryInterface.removeIndex('subject_allocations', 'subject_allocations_unique_idx');
    await queryInterface.addIndex('subject_allocations', ['teacherId', 'subjectId', 'classId'], {
      unique: true
    });
    
    await queryInterface.removeColumn('subject_allocations', 'divisionId');
  }
};
