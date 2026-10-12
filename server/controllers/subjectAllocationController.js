import { SubjectAllocation, Subject, Class, Teacher, Department, Division } from '../models/index.js';

export const allocateTeacher = async (req, res) => {
  const { teacherId, subjectId, classId, divisionId } = req.body;
  const allocatedById = req.user.id;
  const departmentId = req.user.departmentId;

  if (!teacherId || !subjectId || !classId) {
    return res.status(400).json({ error: 'Teacher ID, Subject ID, and Class ID are required' });
  }

  try {
    const targetClass = await Class.findOne({ where: { id: classId, departmentId } });
    if (!targetClass) {
      return res.status(404).json({ error: 'Class not found in your department' });
    }

    const targetTeacher = await Teacher.findOne({ where: { id: teacherId, departmentId } });
    if (!targetTeacher) {
      return res.status(404).json({ error: 'Teacher not found in your department' });
    }

    const targetSubject = await Subject.findOne({ where: { id: subjectId, classId } });
    if (!targetSubject) {
      return res.status(404).json({ error: 'Subject not found in the specified class' });
    }

    const allocation = await SubjectAllocation.create({
      teacherId,
      subjectId,
      classId,
      divisionId: divisionId || null,
      allocatedById
    });

    res.status(201).json(allocation);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Teacher is already allocated to this subject for this class.' });
    }
    console.error('Allocate teacher error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubjectAllocations = async (req, res) => {
  const { subjectId, classId } = req.query;
  const departmentId = req.user.departmentId;

  try {
    let whereClause = {};
    if (subjectId) whereClause.subjectId = subjectId;
    if (classId) whereClause.classId = classId;

    const allocations = await SubjectAllocation.findAll({
      where: whereClause,
      include: [
        { 
          model: Class, 
          as: 'class', 
          where: { departmentId },
          attributes: ['id', 'name', 'batchYear', 'semesterNumber']
        },
        {
          model: Teacher,
          as: 'teacher',
          attributes: ['id', 'instituteId', 'name', 'email']
        },
        {
          model: Subject,
          as: 'subject',
          attributes: ['id', 'name', 'code', 'subjectType']
        },
        {
          model: Division,
          as: 'division',
          attributes: ['id', 'name']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(allocations);
  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAllocation = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  try {
    const allocation = await SubjectAllocation.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!allocation || allocation.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Allocation not found in your department' });
    }

    await allocation.destroy();
    res.json({ message: 'Allocation removed successfully' });
  } catch (error) {
    console.error('Delete allocation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
