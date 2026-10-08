import { AcademicTerm, sequelize } from '../models/index.js';

export const createTerm = async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'Name, startDate, and endDate are required' });
  }

  const transaction = await sequelize.transaction();

  try {
    const existing = await AcademicTerm.findOne({ where: { name }, transaction });
    if (existing) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Term name already exists' });
    }

    if (isCurrent) {
      await AcademicTerm.update({ isCurrent: false }, { where: { isCurrent: true }, transaction });
    }

    const term = await AcademicTerm.create({
      name,
      startDate,
      endDate,
      isCurrent: isCurrent || false
    }, { transaction });

    await transaction.commit();
    res.status(201).json(term);
  } catch (error) {
    await transaction.rollback();
    console.error('Create AcademicTerm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTerms = async (req, res) => {
  try {
    const terms = await AcademicTerm.findAll({
      order: [['startDate', 'DESC']]
    });
    res.json(terms);
  } catch (error) {
    console.error('Get AcademicTerms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const setCurrentTerm = async (req, res) => {
  const { id } = req.params;

  const transaction = await sequelize.transaction();
  try {
    const term = await AcademicTerm.findByPk(id, { transaction });
    if (!term) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Term not found' });
    }

    // Unset all currently active terms
    await AcademicTerm.update(
      { isCurrent: false }, 
      { where: { isCurrent: true }, transaction }
    );

    // Set this one as current
    await term.update({ isCurrent: true }, { transaction });

    await transaction.commit();
    res.json(term);
  } catch (error) {
    await transaction.rollback();
    console.error('Set Current Term error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTerm = async (req, res) => {
  const { id } = req.params;
  const { name, startDate, endDate } = req.body;

  try {
    const term = await AcademicTerm.findByPk(id);
    if (!term) {
      return res.status(404).json({ error: 'Term not found' });
    }

    if (name && name !== term.name) {
      const existing = await AcademicTerm.findOne({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: 'Term name already exists' });
      }
    }

    await term.update({ name, startDate, endDate });
    res.json(term);
  } catch (error) {
    console.error('Update AcademicTerm error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
