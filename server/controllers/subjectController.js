import { Subject, Class } from '../models/index.js';

export const createSubject = async (req, res) => {
  const { classId, name, code, subjectType, credits } = req.body;
  const createdById = req.user.id;
  const departmentId = req.user.departmentId;

  if (!classId || !name || !code) {
    return res.status(400).json({ error: 'Class ID, Name, and Code are required' });
  }

  try {
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found in your department' });
    }

    const existingCode = await Subject.findOne({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ error: `Subject code '${code}' is already in use globally.` });
    }

    const subject = await Subject.create({
      classId,
      departmentId,
      name,
      code,
      subjectType: subjectType || 'CORE',
      credits: credits || 4,
      createdById
    });

    res.status(201).json(subject);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubjects = async (req, res) => {
  const { classId } = req.query;
  const departmentId = req.user.departmentId;

  try {
    let whereClause = {};

    if (classId) {
      const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
      if (!targetClass) {
        return res.status(404).json({ error: 'Class not found' });
      }
      whereClause.classId = classId;
    } else {
      // Need to find all classes in the department to filter subjects
      const departmentClasses = await Class.findAll({
        where: { departmentId },
        attributes: ['id']
      });
      const classIds = departmentClasses.map(c => c.id);
      whereClause.classId = classIds;
    }

    const subjects = await Subject.findAll({
      where: whereClause,
      include: [{ model: Class, as: 'class', attributes: ['name', 'batchYear', 'semesterNumber'] }],
      order: [['code', 'ASC']]
    });
    
    res.json(subjects);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, code, subjectType, credits } = req.body;
  const departmentId = req.user.departmentId;

  try {
    const targetSubject = await Subject.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!targetSubject || targetSubject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Subject not found in your department' });
    }

    if (code && code !== targetSubject.code) {
      const existing = await Subject.findOne({ where: { code } });
      if (existing) {
        return res.status(400).json({ error: `Subject code '${code}' is already in use.` });
      }
    }

    await targetSubject.update({ name, code, subjectType, credits });
    res.json(targetSubject);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSubject = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const targetSubject = await Subject.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!targetSubject || targetSubject.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Subject not found in your department' });
    }

    await targetSubject.destroy();
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
