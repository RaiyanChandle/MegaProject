import React from 'react';
import LeaveManagementView from '../../components/leave/LeaveManagementView';

export default function StudentLeave() {
  return (
    <LeaveManagementView
      role="STUDENT"
      title="Student Leave Applications"
      subtitle="Submit academic leave requests and monitor approvals from your Department Administrator"
    />
  );
}
