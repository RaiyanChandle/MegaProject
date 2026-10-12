import { ExamStaff, sequelize } from '../models/index.js';
import { generateInstituteIds } from '../utils/idGenerator.js';
import bcrypt from 'bcrypt';

export const createExamStaff = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const transaction = await sequelize.transaction();

  try {
    const existingEmail = await ExamStaff.findOne({ where: { email }, transaction });
    if (existingEmail) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Email already in use' });
    }

    const [instituteId] = await generateInstituteIds('EXKIT', 1, transaction);
    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await ExamStaff.create({
      instituteId,
      name,
      email,
      password: hashedPassword,
      createdById: req.user.id
    }, { transaction });

    await transaction.commit();

    const { password: _, ...staffData } = staff.toJSON();
    res.status(201).json(staffData);
  } catch (error) {
    await transaction.rollback();
    console.error('Create ExamStaff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExamStaff = async (req, res) => {
  try {
    const staff = await ExamStaff.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    res.json(staff);
  } catch (error) {
    console.error('Get ExamStaff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExamStaffById = async (req, res) => {
  const { id } = req.params;
  try {
    const staff = await ExamStaff.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    if (!staff) {
      return res.status(404).json({ error: 'Exam staff not found' });
    }
    res.json(staff);
  } catch (error) {
    console.error('Get ExamStaff by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExamStaff = async (req, res) => {
  const { id } = req.params;
  const { name, email, password } = req.body;

  try {
    const staff = await ExamStaff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ error: 'Exam staff not found' });
    }

    if (email && email !== staff.email) {
      const existing = await ExamStaff.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use by another staff member' });
      }
      staff.email = email;
    }

    if (name) staff.name = name;
    if (password && password.trim()) {
      staff.password = await bcrypt.hash(password.trim(), 10);
    }

    await staff.save();

    const { password: _, ...staffData } = staff.toJSON();
    res.json(staffData);
  } catch (error) {
    console.error('Update ExamStaff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExamStaff = async (req, res) => {
  const { id } = req.params;
  try {
    const staff = await ExamStaff.findByPk(id);
    if (!staff) {
      return res.status(404).json({ error: 'Exam staff not found' });
    }

    await staff.destroy();
    res.json({ message: 'Exam staff deleted successfully' });
  } catch (error) {
    console.error('Delete ExamStaff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

