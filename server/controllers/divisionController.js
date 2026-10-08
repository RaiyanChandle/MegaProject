import { Division, Class } from '../models/index.js';

export const createDivision = async (req, res) => {
  const { classId, name } = req.body;
  const createdById = req.user.id;
  const departmentId = req.user.departmentId;

  if (!classId || !name) {
    return res.status(400).json({ error: 'Class ID and Name are required' });
  }

  try {
    // Security: Ensure the class belongs to the dept admin's department
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found in your department' });
    }

    const existing = await Division.findOne({ where: { classId, name } });
    if (existing) {
      return res.status(400).json({ error: `Division '${name}' already exists in this class.` });
    }

    const division = await Division.create({
      classId,
      name,
      createdById
    });

    res.status(201).json(division);
  } catch (error) {
    console.error('Create division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDivisions = async (req, res) => {
  const { classId } = req.query;
  const departmentId = req.user.departmentId;

  if (!classId) {
    return res.status(400).json({ error: 'classId query parameter is required' });
  }

  try {
    // Security check
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const divisions = await Division.findAll({
      where: { classId },
      order: [['name', 'ASC']]
    });
    
    res.json(divisions);
  } catch (error) {
    console.error('Get divisions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDivision = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const departmentId = req.user.departmentId;

  try {
    const targetDivision = await Division.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!targetDivision || targetDivision.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Division not found in your department' });
    }

    if (name) {
      const existing = await Division.findOne({ 
        where: { classId: targetDivision.classId, name } 
      });
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: `Division '${name}' already exists in this class.` });
      }
      await targetDivision.update({ name });
    }

    res.json(targetDivision);
  } catch (error) {
    console.error('Update division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDivision = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const targetDivision = await Division.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!targetDivision || targetDivision.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Division not found in your department' });
    }

    await targetDivision.destroy();
    res.json({ message: 'Division deleted successfully' });
  } catch (error) {
    console.error('Delete division error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
