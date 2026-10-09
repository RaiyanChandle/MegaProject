import { Sequelize } from 'sequelize';
const sequelize = new Sequelize(process.env.DATABASE_URL, { dialect: 'postgres' });

async function checkData() {
  const [subjects] = await sequelize.query('SELECT id, name, code, "subjectType", credits, "classId" FROM subjects WHERE "subjectType" IN (\'PROGRAM_ELECTIVE\', \'OPEN_ELECTIVE\')');
  console.log('Subjects:', subjects);

  const [slots] = await sequelize.query('SELECT id, "slotName", "slotType", credits, "classId" FROM elective_slots');
  console.log('Slots:', slots);
  
  process.exit(0);
}

checkData();
