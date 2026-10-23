import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { 
  SuperAdmin, 
  DepartmentAdmin, 
  Teacher, 
  Student, 
  ExamStaff, 
  Parent,
  Department,
  Class,
  Division,
  ParentStudent
} from '../models/index.js';

export const login = async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  try {
    let user = null;
    let role = null;
    let userId = null;

    const cleanIdentifier = String(identifier).trim();

    // 1. Check if identifier is an email
    if (cleanIdentifier.includes('@')) {
      user = await Parent.findOne({ where: { email: { [Op.iLike]: cleanIdentifier } } });
      if (user) role = 'PARENT';
    } 

    // 2. Check if identifier is a phone number (strip spaces, dashes, +91, leading 0)
    if (!user) {
      const digitsOnly = cleanIdentifier.replace(/[\s\-\(\)\+]/g, '');
      if (/^\d+$/.test(digitsOnly)) {
        const phoneVariations = [digitsOnly];
        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
          phoneVariations.push(digitsOnly.substring(2));
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
          phoneVariations.push(digitsOnly.substring(1));
        } else if (digitsOnly.length === 10) {
          phoneVariations.push('91' + digitsOnly);
          phoneVariations.push('+91' + digitsOnly);
        }

        user = await Parent.findOne({
          where: {
            phoneNumber: { [Op.in]: phoneVariations }
          }
        });
        if (user) role = 'PARENT';
      }
    }

    // 3. Check if it's an instituteId by prefix (STKIT, FCKIT, DAKIT, SAKIT, EXKIT)
    if (!user) {
      const prefix = cleanIdentifier.substring(0, 5).toUpperCase();
      const whereClause = { instituteId: { [Op.iLike]: cleanIdentifier } };

      switch (prefix) {
        case 'STKIT':
          user = await Student.findOne({ where: whereClause });
          if (user) role = 'STUDENT';
          break;
        case 'FCKIT':
          user = await Teacher.findOne({ where: whereClause });
          if (user) role = 'TEACHER';
          break;
        case 'DAKIT':
          user = await DepartmentAdmin.findOne({ where: whereClause });
          if (user) role = 'DEPARTMENT_ADMIN';
          break;
        case 'SAKIT':
          user = await SuperAdmin.findOne({ where: whereClause });
          if (user) role = 'SUPER_ADMIN';
          break;
        case 'EXKIT':
          user = await ExamStaff.findOne({ where: whereClause });
          if (user) role = 'EXAM_STAFF';
          break;
      }
    }

    // 4. Check Parent by Name or username if still not found
    if (!user) {
      user = await Parent.findOne({
        where: {
          name: { [Op.iLike]: cleanIdentifier }
        }
      });
      if (user) role = 'PARENT';
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const payload = {
      id: user.id,
      role: role,
      instituteId: user.instituteId || null,
      departmentId: user.departmentId || null
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: role,
        instituteId: user.instituteId || null,
        departmentId: user.departmentId || null,
        email: user.email,
        phoneNumber: user.phoneNumber
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  const oldPassword = req.body.oldPassword || req.body.currentPassword;
  const newPassword = req.body.newPassword;
  const { id, role } = req.user;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  try {
    let userModel;
    switch (role) {
      case 'STUDENT': userModel = Student; break;
      case 'TEACHER': userModel = Teacher; break;
      case 'DEPARTMENT_ADMIN': userModel = DepartmentAdmin; break;
      case 'SUPER_ADMIN': userModel = SuperAdmin; break;
      case 'EXAM_STAFF': userModel = ExamStaff; break;
      case 'PARENT': userModel = Parent; break;
      default: return res.status(401).json({ error: 'Invalid user role' });
    }

    const user = await userModel.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.update({ password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req, res) => {
  const { id, role } = req.user;

  try {
    let userModel;
    let include = [];

    switch (role) {
      case 'STUDENT': 
        userModel = Student; 
        include = [
          { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
          { 
            model: Division, 
            as: 'division', 
            attributes: ['id', 'name'], 
            include: [{ model: Class, as: 'class', attributes: ['id', 'name'] }] 
          }
        ];
        break;
      case 'TEACHER': 
        userModel = Teacher; 
        include = [
          { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
        ];
        break;
      case 'DEPARTMENT_ADMIN': 
        userModel = DepartmentAdmin; 
        include = [
          { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
        ];
        break;
      case 'SUPER_ADMIN': 
        userModel = SuperAdmin; 
        break;
      case 'EXAM_STAFF': 
        userModel = ExamStaff; 
        break;
      case 'PARENT': 
        userModel = Parent; 
        include = [
          { 
            model: ParentStudent, 
            as: 'children', 
            include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'rollNumber', 'prn'] }] 
          }
        ];
        break;
      default: return res.status(401).json({ error: 'Invalid user role' });
    }

    const user = await userModel.findByPk(id, {
      attributes: { exclude: ['password'] },
      include
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = user.toJSON();
    userData.role = role;
    res.json(userData);
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
