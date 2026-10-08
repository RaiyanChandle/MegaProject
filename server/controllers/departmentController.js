import { Department } from '../models/index.js';

export const createDepartment = async (req, res) => {
  const { name, code } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Name and code are required' });
  }

  try {
    const existing = await Department.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Department code already exists' });
    }

    const dept = await Department.create({
      name,
      code,
      createdById: req.user.id
    });

    res.status(201).json(dept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;

  try {
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if code is taken by another department
    if (code && code !== dept.code) {
      const existing = await Department.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: 'Department code already exists' });
      }
    }

    await dept.update({ name, code });
    res.json(dept);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const dept = await Department.findByPk(id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await dept.destroy();
    res.json({ message: 'Department deleted' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
