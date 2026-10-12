import { SubjectAllocation, ParentStudent } from '../models/index.js';

/**
 * Ensures queries are scoped to the user's department unless they are a Super Admin.
 * Usage: Model.findAll({ where: { ...getDepartmentScope(req.user) } })
 */
export const getDepartmentScope = (user) => {
  if (user.role === 'SUPER_ADMIN' || user.role === 'EXAM_STAFF') {
    return {}; // No department restriction
  }
  
  if (!user.departmentId) {
    throw new Error('User has no departmentId assigned for scoping.');
  }

  return { departmentId: user.departmentId };
};

/**
 * Returns a Sequelize "where" or "include" configuration to restrict subjects 
 * to only those allocated to the requesting teacher.
 */
export const getTeacherSubjectScope = (user) => {
  if (user.role !== 'TEACHER') {
    throw new Error('getTeacherSubjectScope can only be used by TEACHER role.');
  }
  
  // Can be used in an include statement for Subject
  return {
    model: SubjectAllocation,
    as: 'subjectAllocations',
    where: { teacherId: user.id },
    attributes: []
  };
};

/**
 * Verifies if a given student ID is linked to the requesting parent.
 * Throws an error if unauthorized. 
 * Can also return the list of allowed student IDs.
 */
export const getParentStudentScope = async (user) => {
  if (user.role !== 'PARENT') {
    throw new Error('getParentStudentScope can only be used by PARENT role.');
  }
  
  const linkages = await ParentStudent.findAll({
    where: { parentId: user.id },
    attributes: ['studentId']
  });

  const studentIds = linkages.map(link => link.studentId);
  return { studentId: studentIds }; // { studentId: [id1, id2] } (Sequelize translates this to IN (...))
};

/**
 * Restricts queries to the student's own ID.
 */
export const getStudentSelfScope = (user) => {
  if (user.role !== 'STUDENT') {
    throw new Error('getStudentSelfScope can only be used by STUDENT role.');
  }
  
  return { studentId: user.id };
};
