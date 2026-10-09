'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add phoneNumber column
    await queryInterface.addColumn('parents', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: true, // Allow null temporarily to add the column
    });

    // 2. We need to assign a unique string to existing records if any, but let's assume it's mostly empty or we can just set it to random string if needed.
    // For now, let's just make it required after adding, but if there are existing rows, this might fail unless we provide a default value.
    // Since this is likely dev/staging, we can just allow null for existing, or set a default.
    // Actually, making it allowNull: false requires all existing rows to have a value.
    // We will set a default value '0000000000' for existing rows.
    await queryInterface.sequelize.query(
      `UPDATE "parents" SET "phoneNumber" = "id"::text WHERE "phoneNumber" IS NULL`
    );

    await queryInterface.changeColumn('parents', 'phoneNumber', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    // 3. Make email optional
    await queryInterface.changeColumn('parents', 'email', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert email to not null
    // Note: If there are parents with null email, this will fail.
    await queryInterface.sequelize.query(
      `UPDATE "parents" SET "email" = "id"::text WHERE "email" IS NULL`
    );

    await queryInterface.changeColumn('parents', 'email', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true
    });

    // Remove phoneNumber column
    await queryInterface.removeColumn('parents', 'phoneNumber');
  }
};
