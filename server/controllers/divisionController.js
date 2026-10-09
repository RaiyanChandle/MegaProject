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

export const assignStudentsToDivision = async (req, res) => {
  const { id } = req.params; // divisionId
  const { studentIds } = req.body;
  const departmentId = req.user.departmentId;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds array is required' });
  }

  const { Student, Enrollment, Subject, AcademicTerm } = await import('../models/index.js');
  const sequelize = (await import('../config/database.js')).default;

  try {
    const targetDivision = await Division.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId', 'id'] }]
    });

    if (!targetDivision || targetDivision.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Division not found in your department' });
    }

    const currentTerm = await AcademicTerm.findOne({ where: { isCurrent: true } });
    if (!currentTerm) {
      return res.status(400).json({ error: 'No active academic term found. Please set a current term first.' });
    }

    const coreSubjects = await Subject.findAll({
      where: { classId: targetDivision.classId, subjectType: 'CORE' }
    });

    const t = await sequelize.transaction();

    try {
      // 1. Assign division to students
      await Student.update(
        { divisionId: id },
        { where: { id: studentIds, departmentId }, transaction: t }
      );

      // 2. Transactional bulk enrollment in CORE subjects
      if (coreSubjects.length > 0) {
        // Fetch existing enrollments for these students, subjects, and term
        const existingEnrollments = await Enrollment.findAll({
          where: {
            studentId: studentIds,
            subjectId: coreSubjects.map(s => s.id),
            academicTermId: currentTerm.id,
            attemptNumber: 1
          },
          attributes: ['studentId', 'subjectId'],
          transaction: t
        });

        const existingSet = new Set(
          existingEnrollments.map(e => `${e.studentId}_${e.subjectId}`)
        );

        const newEnrollments = [];
        for (const studentId of studentIds) {
          for (const subject of coreSubjects) {
            if (!existingSet.has(`${studentId}_${subject.id}`)) {
              newEnrollments.push({
                studentId,
                subjectId: subject.id,
                classId: targetDivision.classId,
                academicTermId: currentTerm.id,
                attemptNumber: 1,
                status: 'ENROLLED'
              });
            }
          }
        }

        if (newEnrollments.length > 0) {
          await Enrollment.bulkCreate(newEnrollments, { transaction: t });
        }
      }

      await t.commit();
      res.json({ message: 'Students assigned to division and enrolled in core subjects successfully' });
    } catch (txError) {
      await t.rollback();
      throw txError;
    }
  } catch (error) {
    console.error('Assign students error:', error);
    res.status(500).json({ error: 'Internal server error during assignment' });
  }
};

export const getDivisionStudents = async (req, res) => {
  const { id } = req.params;
  const departmentId = req.user.departmentId;

  const { Student } = await import('../models/index.js');

  try {
    const targetDivision = await Division.findByPk(id, {
      include: [{ model: Class, as: 'class', attributes: ['departmentId'] }]
    });

    if (!targetDivision || targetDivision.class.departmentId !== departmentId) {
      return res.status(404).json({ error: 'Division not found in your department' });
    }

    const students = await Student.findAll({
      where: { divisionId: id },
      attributes: ['id', 'instituteId', 'name', 'email', 'rollNumber'],
      order: [['rollNumber', 'ASC']]
    });

    res.json(students);
  } catch (error) {
    console.error('Get division students error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
