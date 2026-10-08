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

import sequelize from '../config/database.js';
import { Division, Subject, AssessmentComponent, ElectiveSlot, ElectiveOption } from '../models/index.js';

export const cloneClass = async (req, res) => {
  const { id } = req.params;
  const { newBatchYear } = req.body;
  const departmentId = req.user.departmentId;
  const createdById = req.user.id;

  if (!newBatchYear) {
    return res.status(400).json({ error: 'newBatchYear is required' });
  }

  const t = await sequelize.transaction();

  try {
    // 1. Get old class
    const oldClass = await Class.findOne({ where: { id, departmentId }, transaction: t });
    if (!oldClass) {
      await t.rollback();
      return res.status(404).json({ error: 'Class not found' });
    }

    if (oldClass.batchYear === newBatchYear) {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot clone to the same batch year.' });
    }

    // 2. Check if destination class already exists
    const existing = await Class.findOne({
      where: { departmentId, batchYear: newBatchYear, semesterNumber: oldClass.semesterNumber },
      transaction: t
    });

    if (existing) {
      await t.rollback();
      return res.status(400).json({ error: `A class already exists for Batch ${newBatchYear} and Semester ${oldClass.semesterNumber}.` });
    }

    // 3. Create new Class
    const newClass = await Class.create({
      name: oldClass.name,
      departmentId,
      batchYear: newBatchYear,
      semesterNumber: oldClass.semesterNumber,
      createdById
    }, { transaction: t });

    // 4. Clone Divisions
    const oldDivisions = await Division.findAll({ where: { classId: id }, transaction: t });
    for (const div of oldDivisions) {
      await Division.create({ classId: newClass.id, name: div.name }, { transaction: t });
    }

    // 5. Clone Subjects and Assessment Components
    const oldSubjects = await Subject.findAll({ where: { classId: id }, transaction: t });
    const subjectMap = {}; // oldSubjectId -> newSubjectId

    for (const oldSub of oldSubjects) {
      // Suffix code with batch year to maintain uniqueness
      const newCode = `${oldSub.code}-${newBatchYear}`;
      
      const newSub = await Subject.create({
        classId: newClass.id,
        departmentId: oldSub.departmentId,
        name: oldSub.name,
        code: newCode,
        subjectType: oldSub.subjectType,
        credits: oldSub.credits,
        createdById
      }, { transaction: t });

      subjectMap[oldSub.id] = newSub.id;

      // Clone Assessment Components
      const oldComps = await AssessmentComponent.findAll({ where: { subjectId: oldSub.id }, transaction: t });
      for (const comp of oldComps) {
        await AssessmentComponent.create({
          subjectId: newSub.id,
          name: comp.name,
          maxMarks: comp.maxMarks,
          category: comp.category
        }, { transaction: t });
      }
    }

    // 6. Clone Elective Slots and Options
    const oldSlots = await ElectiveSlot.findAll({ where: { classId: id }, transaction: t });
    for (const oldSlot of oldSlots) {
      const newSlot = await ElectiveSlot.create({
        classId: newClass.id,
        slotName: oldSlot.slotName,
        slotType: oldSlot.slotType,
        credits: oldSlot.credits
      }, { transaction: t });

      const oldOptions = await ElectiveOption.findAll({ where: { slotId: oldSlot.id }, transaction: t });
      for (const opt of oldOptions) {
        // If the option was a subject from this very same class, use the newly cloned subject.
        // If it was an open elective from another department/class, keep the original subjectId.
        const mappedSubjectId = subjectMap[opt.subjectId] || opt.subjectId;

        await ElectiveOption.create({
          slotId: newSlot.id,
          subjectId: mappedSubjectId,
          offeredByDepartmentId: opt.offeredByDepartmentId,
          maxCapacity: opt.maxCapacity
        }, { transaction: t });
      }
    }

    await t.commit();
    res.status(201).json({ message: 'Class cloned successfully', newClassId: newClass.id });
  } catch (error) {
    await t.rollback();
    console.error('Clone class error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      res.status(400).json({ error: 'Unique constraint error during clone (likely subject code collision).' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
