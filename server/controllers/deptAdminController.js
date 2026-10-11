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

    const createdWithDept = await DepartmentAdmin.findByPk(admin.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    res.status(201).json(createdWithDept);
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

export const getDeptAdminById = async (req, res) => {
  const { id } = req.params;
  try {
    const admin = await DepartmentAdmin.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });
    if (!admin) {
      return res.status(404).json({ error: 'Department Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    console.error('Get DeptAdmin by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDeptAdmin = async (req, res) => {
  const { id } = req.params;
  const { name, email, departmentId, password } = req.body;

  try {
    const admin = await DepartmentAdmin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ error: 'Department Admin not found' });
    }

    // Email collision check
    if (email && email !== admin.email) {
      const existingEmail = await DepartmentAdmin.findOne({ where: { email } });
      if (existingEmail && existingEmail.id !== id) {
        return res.status(400).json({ error: 'Email already in use by another administrator' });
      }
    }

    // Department existence check
    if (departmentId && departmentId !== admin.departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (!dept) {
        return res.status(404).json({ error: 'Department not found' });
      }
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (departmentId) updates.departmentId = departmentId;
    if (password && password.trim() !== '') {
      updates.password = await bcrypt.hash(password, 10);
    }

    await admin.update(updates);

    const updatedWithDept = await DepartmentAdmin.findByPk(admin.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['id', 'name', 'code'] }]
    });

    res.json(updatedWithDept);
  } catch (error) {
    console.error('Update DeptAdmin error:', error);
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

export const deleteDeptAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await DepartmentAdmin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ error: 'Department Admin not found' });
    }

    await admin.destroy();
    res.json({ message: 'Department Admin deleted successfully' });
  } catch (error) {
    console.error('Delete DeptAdmin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
