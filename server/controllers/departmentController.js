import { Department, DepartmentAdmin, Teacher, Student, Class } from '../models/index.js';

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
      code: code.toUpperCase().trim(),
      createdById: req.user.id
    });

    const fullDept = await Department.findByPk(dept.id, {
      include: [
        { model: DepartmentAdmin, as: 'deptAdmins', attributes: ['id', 'name', 'instituteId', 'isActive'] },
        { model: Teacher, as: 'teachers', attributes: ['id'] },
        { model: Student, as: 'students', attributes: ['id'] },
        { model: Class, as: 'classes', attributes: ['id'] }
      ]
    });

    res.status(201).json(fullDept);
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [
        { model: DepartmentAdmin, as: 'deptAdmins', attributes: ['id', 'name', 'instituteId', 'isActive'] },
        { model: Teacher, as: 'teachers', attributes: ['id'] },
        { model: Student, as: 'students', attributes: ['id'] },
        { model: Class, as: 'classes', attributes: ['id'] }
      ],
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
    if (code && code.toUpperCase().trim() !== dept.code) {
      const existing = await Department.findOne({ where: { code: code.toUpperCase().trim() } });
      if (existing) {
        return res.status(400).json({ error: 'Department code already exists' });
      }
    }

    await dept.update({ 
      name: name || dept.name, 
      code: code ? code.toUpperCase().trim() : dept.code 
    });

    const updatedDept = await Department.findByPk(dept.id, {
      include: [
        { model: DepartmentAdmin, as: 'deptAdmins', attributes: ['id', 'name', 'instituteId', 'isActive'] },
        { model: Teacher, as: 'teachers', attributes: ['id'] },
        { model: Student, as: 'students', attributes: ['id'] },
        { model: Class, as: 'classes', attributes: ['id'] }
      ]
    });

    res.json(updatedDept);
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

    // Check for blocking associations
    const [teacherCount, studentCount, classCount] = await Promise.all([
      Teacher.count({ where: { departmentId: id } }),
      Student.count({ where: { departmentId: id } }),
      Class.count({ where: { departmentId: id } })
    ]);

    if (teacherCount > 0 || studentCount > 0 || classCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department: It currently contains ${studentCount} students, ${teacherCount} faculty members, and ${classCount} classes.` 
      });
    }

    await dept.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
