import { Parent, ParentStudent, Student } from '../models/index.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

// Create a parent (and optionally link to a student if studentId is provided)
export const createParent = async (req, res) => {
  const { name, email, phoneNumber, password, studentId } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ message: 'Phone number is required.' });
  }

  try {
    // Check if parent already exists by phone number
    let parent = await Parent.findOne({ where: { phoneNumber } });
    
    if (parent) {
      if (!studentId) {
        return res.status(400).json({ message: 'Parent with this phone number already exists.' });
      }
      // If studentId is provided, we just link the existing parent
    } else {
      if (!password || !name) {
        return res.status(400).json({ message: 'Name and password are required for a new parent.' });
      }
      // Check email uniqueness if provided
      if (email) {
        const emailExists = await Parent.findOne({ where: { email } });
        if (emailExists) {
          return res.status(400).json({ message: 'Email is already in use by another parent.' });
        }
      }
      
      // Create new parent
      const hashedPassword = await bcrypt.hash(password, 10);
      parent = await Parent.create({
        name,
        email: email || null,
        phoneNumber,
        password: hashedPassword
      });
    }

    if (studentId) {
      // Check if student exists
      const student = await Student.findByPk(studentId);
      if (!student) {
        return res.status(404).json({ message: 'Student not found.' });
      }

      // Check if link already exists
      const existingLink = await ParentStudent.findOne({
        where: { parentId: parent.id, studentId }
      });

      if (!existingLink) {
        await ParentStudent.create({
          parentId: parent.id,
          studentId
        });
      }
    }

    res.status(201).json({ message: 'Parent processed successfully', parent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get parents for a specific student
export const getStudentParents = async (req, res) => {
  const { studentId } = req.params;
  try {
    const student = await Student.findByPk(studentId, {
      include: [
        {
          model: ParentStudent,
          as: 'parents',
          include: [
            {
              model: Parent,
              as: 'parent',
              attributes: ['id', 'name', 'email', 'phoneNumber', 'createdAt']
            }
          ]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const parents = student.parents.map(ps => ps.parent);
    res.json(parents);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Unlink a parent from a student
export const unlinkParent = async (req, res) => {
  const { studentId, parentId } = req.params;
  try {
    const deleted = await ParentStudent.destroy({
      where: { studentId, parentId }
    });
    
    if (!deleted) {
      return res.status(404).json({ message: 'Link not found' });
    }
    
    res.json({ message: 'Parent unlinked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

// Get linked children for authenticated parent
export const getMyChildren = async (req, res) => {
  const parentId = req.user.id;
  const { Division, Department } = await import('../models/index.js');

  try {
    const parentLinks = await ParentStudent.findAll({
      where: { parentId },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'instituteId', 'name', 'email', 'rollNumber', 'batchYear', 'departmentId', 'divisionId'],
          include: [
            { model: Division, as: 'division', attributes: ['id', 'name'] },
            { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
          ]
        }
      ]
    });

    const children = parentLinks.map(link => link.student).filter(Boolean);
    res.json(children);
  } catch (error) {
    console.error('Get my children error:', error);
    res.status(500).json({ message: error.message });
  }
};
