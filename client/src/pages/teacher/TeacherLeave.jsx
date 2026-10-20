import React from 'react';
import LeaveManagementView from '../../components/leave/LeaveManagementView';

export default function TeacherLeave() {
  return (
    <LeaveManagementView
      role="TEACHER"
      title="Faculty Leave Applications"
      subtitle="Submit faculty leave requests and track approval status from your Department Head"
    />
  );
}
