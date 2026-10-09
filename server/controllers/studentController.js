import bcrypt from 'bcrypt';
import { Student } from '../models/index.js';
import { generateInstituteIds } from '../utils/idGenerator.js';
import sequelize from '../config/database.js';

export const createStudent = async (req, res) => {
  const { name, email, password, batchYear, divisionId } = req.body;
  const departmentId = req.user.departmentId;
  const createdById = req.user.id;

  if (!name || !email || !password || !batchYear) {
    return res.status(400).json({ error: 'Name, email, password, and batchYear are required' });
  }

  const t = await sequelize.transaction();

  try {
    const existing = await Student.findOne({ where: { email }, transaction: t });
    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: 'Email already exists' });
    }

    const count = await Student.count({ where: { departmentId, batchYear }, transaction: t });
    const rollNumber = String(count + 1).padStart(3, '0');

    if (divisionId) {
      const existingRoll = await Student.findOne({ where: { divisionId, rollNumber }, transaction: t });
      if (existingRoll) {
        await t.rollback();
        return res.status(400).json({ error: `Roll number ${rollNumber} already exists in this division` });
      }
    }

    const [instituteId] = await generateInstituteIds('STKIT', 1, t);
    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      instituteId,
      name,
      email,
      password: hashedPassword,
      batchYear,
      rollNumber,
      divisionId: divisionId || null,
      departmentId,
      createdById
    }, { transaction: t });

    await t.commit();

    const studentObj = student.toJSON();
    delete studentObj.password;

    res.status(201).json(studentObj);
  } catch (error) {
    await t.rollback();
    console.error('Create student error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStudents = async (req, res) => {
  const departmentId = req.user.departmentId;

  const { Division } = await import('../models/index.js');

  try {
    const students = await Student.findAll({
      where: { departmentId },
      attributes: { exclude: ['password'] },
      include: [{ model: Division, as: 'division', attributes: ['name'] }],
      order: [['batchYear', 'DESC'], ['rollNumber', 'ASC']]
    });
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkImportStudents = async (req, res) => {
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
    const emails = records.map(r => r.email).filter(Boolean);
    const existingStudents = await Student.findAll({
      where: { email: emails },
      attributes: ['email'],
      transaction: t
    });
    
    const existingEmails = new Set(existingStudents.map(s => s.email));

    // We also need to check division + rollNumber uniqueness if divisionId is provided.
    // For bulk import, we might just fail on DB constraint if a division/roll clashes,
    // but better to check if possible. For now, we rely on the DB unique constraint and catch it.

    const validRecords = [];
    records.forEach((record, idx) => {
      if (!record.name || !record.email || !record.password || !record.batchYear) {
        errors.push({ row: idx + 1, email: record.email, error: 'Missing required fields (Name, Email, Password, BatchYear)' });
      } else if (existingEmails.has(record.email)) {
        errors.push({ row: idx + 1, email: record.email, error: 'Email already exists' });
      } else {
        validRecords.push(record);
      }
    });

    if (validRecords.length > 0) {
      const ids = await generateInstituteIds('STKIT', validRecords.length, t);
      
      // Group records by batchYear to compute roll numbers correctly
      const batchCounts = {};
      for (const record of validRecords) {
        if (batchCounts[record.batchYear] === undefined) {
          batchCounts[record.batchYear] = await Student.count({ where: { departmentId, batchYear: record.batchYear }, transaction: t });
        }
      }

      const studentPayloads = [];
      for (let i = 0; i < validRecords.length; i++) {
        const hashedPassword = await bcrypt.hash(validRecords[i].password, 10);
        const bYear = validRecords[i].batchYear;
        batchCounts[bYear] += 1;
        const autoRoll = String(batchCounts[bYear]).padStart(3, '0');

        studentPayloads.push({
          instituteId: ids[i],
          name: validRecords[i].name,
          email: validRecords[i].email,
          password: hashedPassword,
          batchYear: bYear,
          rollNumber: autoRoll,
          divisionId: validRecords[i].divisionId || null,
          departmentId,
          createdById
        });
      }

      try {
        await Student.bulkCreate(studentPayloads, { transaction: t });
        successful.push(...studentPayloads.map(p => p.email));
        await t.commit();
      } catch (bulkError) {
        await t.rollback();
        // If it's a unique constraint error (like rollNumber in division)
        if (bulkError.name === 'SequelizeUniqueConstraintError') {
          return res.status(400).json({ error: 'Unique constraint error: check for duplicate roll numbers in the same division.' });
        }
        throw bulkError;
      }
    } else {
      await t.commit();
    }

    res.json({
      message: `Successfully imported ${successful.length} students.`,
      successfulCount: successful.length,
      errors
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    console.error('Bulk import students error:', error);
    res.status(500).json({ error: 'Internal server error during bulk import' });
  }
};

export const getStudentEnrollments = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  const { Enrollment, Subject, AcademicTerm, Student } = await import('../models/index.js');

  try {
    const student = await Student.findByPk(id);
    if (!student || student.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Student not found in your department' });
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
    
    // We fetch all enrollments, focusing on the current term if we just want "currently allocated subjects"
    // To be comprehensive, let's fetch all enrollments and include the term
    const enrollments = await Enrollment.findAll({
      where: { studentId: id },
      include: [
        { model: Subject, as: 'subject', attributes: ['id', 'name', 'code', 'subjectType', 'credits'] },
        { model: AcademicTerm, as: 'academicTerm', attributes: ['id', 'name', 'isCurrent'] }
      ],
      order: [
        [{ model: AcademicTerm, as: 'academicTerm' }, 'startDate', 'DESC'],
        [{ model: Subject, as: 'subject' }, 'name', 'ASC']
      ]
    });

    res.json(enrollments);
  } catch (error) {
    console.error('Get student enrollments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
