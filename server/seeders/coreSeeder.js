import bcrypt from 'bcrypt';
import db from '../models/index.js';

const seedDatabase = async () => {
  try {
    console.log('Starting seed process...');
    await db.sequelize.authenticate();

    // 1. Seed IdSequences
    const prefixes = ['STKIT', 'FCKIT', 'DAKIT', 'SAKIT', 'EXKIT'];
    for (const prefix of prefixes) {
      await db.IdSequence.findOrCreate({
        where: { prefix },
        defaults: { lastUsed: 0 }
      });
    }
    console.log('✅ IdSequences seeded.');

    // 2. Seed Super Admin
    const superAdminEmail = 'admin@nexus.edu';
    const existingAdmin = await db.SuperAdmin.findOne({ where: { email: superAdminEmail } });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // We must atomic increment SAKIT to get an ID for the superadmin
      const query = `
        UPDATE id_sequences
        SET "lastUsed" = "lastUsed" + 1, "updatedAt" = NOW()
        WHERE prefix = 'SAKIT'
        RETURNING "lastUsed"
      `;
      const [results] = await db.sequelize.query(query);
      const idNum = results[0].lastUsed;
      const instituteId = `SAKIT${String(idNum).padStart(4, '0')}`;

      await db.SuperAdmin.create({
        instituteId,
        email: superAdminEmail,
        password: hashedPassword,
        name: 'System Administrator'
      });
      console.log(`✅ Super Admin created (Email: ${superAdminEmail}, ID: ${instituteId})`);
    } else {
      console.log('✅ Super Admin already exists.');
    }

    // 3. Seed Current Academic Term
    const termName = '2026-ODD';
    const existingTerm = await db.AcademicTerm.findOne({ where: { name: termName } });
    if (!existingTerm) {
      // Set previous terms to isCurrent: false
      await db.AcademicTerm.update({ isCurrent: false }, { where: {} });
      
      await db.AcademicTerm.create({
        name: termName,
        startDate: new Date('2026-08-01'),
        endDate: new Date('2026-12-15'),
        isCurrent: true
      });
      console.log(`✅ Academic Term ${termName} created.`);
    } else {
      console.log('✅ Academic Term already exists.');
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();
