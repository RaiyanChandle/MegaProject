import { requireRole } from './middlewares/authMiddleware.js';
import { getDepartmentScope } from './utils/scopes.js';

console.log('Running Auth Security Tests...');

let passed = 0;
let failed = 0;

function assertEqual(actual, expected, testName) {
  if (actual === expected) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} | Expected ${expected}, got ${actual}`);
    failed++;
  }
}

// 1. Test: Student cannot call a teacher endpoint
const mockRes = {
  status: function(code) {
    this.statusCode = code;
    return this;
  },
  json: function(data) {
    this.body = data;
    return this;
  }
};

let nextCalled = false;
const mockNext = () => { nextCalled = true; };

const studentReq = { user: { role: 'STUDENT', id: 'student123' } };

// Teacher endpoint expects TEACHER role
const teacherMiddleware = requireRole('TEACHER');

teacherMiddleware(studentReq, mockRes, mockNext);

assertEqual(mockRes.statusCode, 403, 'Student calling teacher endpoint returns 403 Forbidden');
assertEqual(nextCalled, false, 'Student calling teacher endpoint blocks execution (next not called)');

// 2. Test: Department Admin A cannot read Department B via scopes
const adminAReq = { user: { role: 'DEPARTMENT_ADMIN', departmentId: 'DEP_A' } };

const scope = getDepartmentScope(adminAReq.user);
assertEqual(scope.departmentId, 'DEP_A', 'Department Admin scope returns their own departmentId');

// Ensure they cannot query DEP_B (the where clause generated only has DEP_A)
const canAccessDepB = scope.departmentId === 'DEP_B';
assertEqual(canAccessDepB, false, 'Department Admin A cannot query Department B');

// 3. Test: Super Admin can read any department
const superAdminReq = { user: { role: 'SUPER_ADMIN' } };
const saScope = getDepartmentScope(superAdminReq.user);

assertEqual(Object.keys(saScope).length, 0, 'Super Admin scope is completely empty (no department restrictions)');

console.log(`\\nTests completed. Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) process.exit(1);
process.exit(0);
