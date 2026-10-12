'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('elective_slots');
    if (!tableDescription.registrationOpensAt) {
      await queryInterface.addColumn('elective_slots', 'registrationOpensAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!tableDescription.registrationClosesAt) {
      await queryInterface.addColumn('elective_slots', 'registrationClosesAt', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('elective_slots', 'registrationClosesAt');
    await queryInterface.removeColumn('elective_slots', 'registrationOpensAt');
  }
};
