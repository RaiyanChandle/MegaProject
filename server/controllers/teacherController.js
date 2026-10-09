import bcrypt from 'bcrypt';
import { Teacher, SubjectAllocation, Subject, Class, Division } from '../models/index.js';
import { generateInstituteIds } from '../utils/idGenerator.js';
import sequelize from '../config/database.js';

export const createTeacher = async (req, res) => {
  const { name, email, password } = req.body;
  const departmentId = req.user.departmentId;
  const createdById = req.user.id;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const t = await sequelize.transaction();

  try {
    const existing = await Teacher.findOne({ where: { email }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: 'Email already exists' });
    }

    const [instituteId] = await generateInstituteIds('FCKIT', 1, t);
    const hashedPassword = await bcrypt.hash(password, 10);

    const teacher = await Teacher.create({
      instituteId,
      name,
      email,
      password: hashedPassword,
      departmentId,
      createdById
    }, { transaction: t });

    await t.commit();

    const teacherObj = teacher.toJSON();
    delete teacherObj.password;

    res.status(201).json(teacherObj);
  } catch (error) {
    await t.rollback();
    console.error('Create teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTeachers = async (req, res) => {
  const departmentId = req.user.departmentId;

  try {
    const teachers = await Teacher.findAll({
      where: { departmentId },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(teachers);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkImportTeachers = async (req, res) => {
  const { records } = req.body;
  const departmentId = req.user.departmentId;
  const createdById = req.user.id;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'Records array is required' });
  }

  const t = await sequelize.transaction();
  const errors = [];
  const successful = [];

  try {
    // Check emails exist
    const emails = records.map(r => r.email);
    const existingTeachers = await Teacher.findAll({
      where: { email: emails },
      attributes: ['email'],
      transaction: t
    });
    
    const existingEmails = new Set(existingTeachers.map(t => t.email));

    const validRecords = [];
    records.forEach((record, idx) => {
      if (!record.name || !record.email || !record.password) {
        errors.push({ row: idx + 1, email: record.email, error: 'Missing name, email, or password' });
      } else if (existingEmails.has(record.email)) {
        errors.push({ row: idx + 1, email: record.email, error: 'Email already exists' });
      } else {
        validRecords.push(record);
      }
    });

    if (validRecords.length > 0) {
      // Rule 5: Reserve block ID for all valid records ATOMICALLY
      const ids = await generateInstituteIds('FCKIT', validRecords.length, t);
      
      const teacherPayloads = [];
      for (let i = 0; i < validRecords.length; i++) {
        const hashedPassword = await bcrypt.hash(validRecords[i].password, 10);
        teacherPayloads.push({
          instituteId: ids[i],
          name: validRecords[i].name,
          email: validRecords[i].email,
          password: hashedPassword,
          departmentId,
          createdById
        });
      }

      await Teacher.bulkCreate(teacherPayloads, { transaction: t });
      successful.push(...teacherPayloads.map(p => p.email));
    }

    await t.commit();
    res.json({
      message: `Successfully imported ${successful.length} teachers.`,
      successfulCount: successful.length,
      errors
    });
  } catch (error) {
    await t.rollback();
    console.error('Bulk import teachers error:', error);
    res.status(500).json({ error: 'Internal server error during bulk import' });
  }
};

export const getMyAllocations = async (req, res) => {
  const teacherId = req.user.id;

  try {
    const allocations = await SubjectAllocation.findAll({
      where: { teacherId },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] },
        { model: Class, as: 'class', attributes: ['id', 'name', 'batchYear', 'semesterNumber'] },
        { model: Division, as: 'division', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(allocations);
  } catch (error) {
    console.error('Get my allocations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
