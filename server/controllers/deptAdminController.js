import { DepartmentAdmin, Department, sequelize } from '../models/index.js';
import { generateInstituteIds } from '../utils/idGenerator.js';
import bcrypt from 'bcrypt';

export const createDeptAdmin = async (req, res) => {
  const { name, email, departmentId, password } = req.body;

  if (!name || !email || !departmentId || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const transaction = await sequelize.transaction();

  try {
    const existingEmail = await DepartmentAdmin.findOne({ where: { email }, transaction });
    if (existingEmail) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Email already in use' });
    }

    const dept = await Department.findByPk(departmentId, { transaction });
    if (!dept) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Department not found' });
    }

    const [instituteId] = await generateInstituteIds('DAKIT', 1, transaction);
    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await DepartmentAdmin.create({
      instituteId,
      name,
      email,
      password: hashedPassword,
      departmentId,
      createdById: req.user.id
    }, { transaction });

    await transaction.commit();

    // Do not return password
    const { password: _, ...adminData } = admin.toJSON();
    res.status(201).json(adminData);
  } catch (error) {
    await transaction.rollback();
    console.error('Create DeptAdmin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDeptAdmins = async (req, res) => {
  try {
    const admins = await DepartmentAdmin.findAll({
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(admins);
  } catch (error) {
    console.error('Get DeptAdmins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deactivateDeptAdmin = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    const admin = await DepartmentAdmin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ error: 'Department Admin not found' });
    }

    await admin.update({ isActive });
    
    const { password: _, ...adminData } = admin.toJSON();
    res.json(adminData);
  } catch (error) {
    console.error('Deactivate DeptAdmin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
