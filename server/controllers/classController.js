import { Class } from '../models/index.js';

export const createClass = async (req, res) => {
  const { name, batchYear, semesterNumber } = req.body;
  const departmentId = req.user.departmentId;
  const createdById = req.user.id;

  if (!name || !batchYear || !semesterNumber) {
    return res.status(400).json({ error: 'Name, batchYear, and semesterNumber are required' });
  }

  try {
    const existing = await Class.findOne({
      where: { departmentId, batchYear, semesterNumber }
    });

    if (existing) {
      return res.status(400).json({ 
        error: `A class already exists for Batch ${batchYear} and Semester ${semesterNumber} in this department.` 
      });
    }

    const newClass = await Class.create({
      name,
      departmentId,
      batchYear,
      semesterNumber,
      createdById
    });

    res.status(201).json(newClass);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClasses = async (req, res) => {
  const departmentId = req.user.departmentId;

  try {
    const classes = await Class.findAll({
      where: { departmentId },
      order: [['batchYear', 'DESC'], ['semesterNumber', 'ASC']]
    });
    res.json(classes);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClassById = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const targetClass = await Class.findOne({ where: { id, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(targetClass);
  } catch (error) {
    console.error('Get class by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateClass = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;
  const { name, batchYear, semesterNumber } = req.body;

  try {
    const targetClass = await Class.findOne({ where: { id, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (batchYear || semesterNumber) {
      const checkBatch = batchYear || targetClass.batchYear;
      const checkSem = semesterNumber || targetClass.semesterNumber;
      const existing = await Class.findOne({
        where: { departmentId, batchYear: checkBatch, semesterNumber: checkSem }
      });
      if (existing && existing.id !== targetClass.id) {
        return res.status(400).json({ 
          error: `A class already exists for Batch ${checkBatch} and Semester ${checkSem}.` 
        });
      }
    }

    await targetClass.update({ name, batchYear, semesterNumber });
    res.json(targetClass);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteClass = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const targetClass = await Class.findOne({ where: { id, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found' });
    }
    
    // Optional: Could check if there are divisions or subjects before deleting.
    await targetClass.destroy();
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
