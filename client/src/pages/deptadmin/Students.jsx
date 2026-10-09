import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Field from '../../components/ui/Field';
import { toast } from '../../components/ui/Toast';
import { Plus, Eye, EyeOff, Trash2 } from 'lucide-react';

import { useSearch } from '../../context/SearchContext';

export default function Students() {
  const { searchQuery } = useSearch();
  const [students, setStudents] = useState([]);
  const [availableBatchYears, setAvailableBatchYears] = useState([]);
  const [selectedBatchYear, setSelectedBatchYear] = useState('');
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('ALL');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [studentParents, setStudentParents] = useState([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLinkParentModalOpen, setIsLinkParentModalOpen] = useState(false);
  const [parentFormData, setParentFormData] = useState({ name: '', email: '', phoneNumber: '', password: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', batchYear: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [classes, setClasses] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [csvData, setCsvData] = useState('');
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSuccess, setBulkSuccess] = useState(0);

  const fetchStudentsAndClasses = async () => {
    try {
      const [studentsData, classesData] = await Promise.all([
        apiClient.get('/students'),
        apiClient.get('/classes')
      ]);
      setStudents(studentsData);
      setClasses(classesData);
      
      const uniqueYears = Array.from(new Set(classesData.map(c => c.batchYear))).sort().reverse();
      setAvailableBatchYears(uniqueYears);
      
      if (uniqueYears.length > 0 && !selectedBatchYear) {
        setSelectedBatchYear(uniqueYears[0]);
      }
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  useEffect(() => {
    fetchStudentsAndClasses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/students', formData);
      toast.success('Student created successfully');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', batchYear: '' });
      fetchStudentsAndClasses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setBulkErrors([]);
    setBulkSuccess(0);

    try {
      const rows = csvData.split('\n').map(row => row.trim()).filter(Boolean);
      // Assume header: Name,Email,Password,BatchYear
      const records = rows.slice(1).map(row => {
        const [name, email, password, batchYear] = row.split(',').map(s => s?.trim());
        return { name, email, password, batchYear };
      });

      if (records.length === 0) {
        toast.error('No valid records found in CSV data.');
        setIsLoading(false);
        return;
      }

      const response = await apiClient.post('/students/bulk', { records });
      
      if (response.errors && response.errors.length > 0) {
        setBulkErrors(response.errors);
      }
      
      setBulkSuccess(response.successfulCount);
      toast.success(response.message);
      
      if (response.successfulCount > 0) {
        fetchStudentsAndClasses();
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDivision = async (e) => {
    e.preventDefault();
    if (!selectedDivisionId) return;

    setIsLoading(true);
    try {
      await apiClient.post(`/divisions/${selectedDivisionId}/assign-students`, {
        studentIds: selectedStudentIds
      });
      toast.success('Students assigned and enrolled in core subjects successfully');
      setIsAssignModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudentsAndClasses();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openAssignModal = async () => {
    if (selectedStudentIds.length === 0) return;

    const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
    const batchYears = new Set(selectedStudents.map(s => s.batchYear));
    if (batchYears.size > 1) {
      toast.error('Please select students from the same batch year to assign division.');
      return;
    }

    const batchYear = Array.from(batchYears)[0];
    const relevantClasses = classes.filter(c => c.batchYear === batchYear);
    
    setIsLoading(true);
    try {
      const allDivs = [];
      for (const cls of relevantClasses) {
        const divs = await apiClient.get(`/divisions?classId=${cls.id}`);
        // attach class info for display
        divs.forEach(d => {
          allDivs.push({ ...d, class: cls });
        });
      }
      setDivisions(allDivs);
      setSelectedDivisionId('');
      setIsAssignModalOpen(true);
    } catch (error) {
      toast.error('Failed to load divisions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentClick = async (student) => {
    setSelectedStudentForDetails(student);
    setIsDetailsModalOpen(true);
    setIsDetailsLoading(true);
    try {
      const [enrolls, parents] = await Promise.all([
        apiClient.get(`/students/${student.id}/enrollments`),
        apiClient.get(`/parents/student/${student.id}`)
      ]);
      setStudentEnrollments(enrolls);
      setStudentParents(parents);
    } catch (error) {
      toast.error('Failed to load student details');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleLinkParent = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post('/parents', {
        ...parentFormData,
        studentId: selectedStudentForDetails.id
      });
      toast.success('Parent linked successfully');
      setIsLinkParentModalOpen(false);
      setParentFormData({ name: '', email: '', phoneNumber: '', password: '' });
      // Refresh parents list
      const parents = await apiClient.get(`/parents/student/${selectedStudentForDetails.id}`);
      setStudentParents(parents);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkParent = async (parentId) => {
    if (!window.confirm('Are you sure you want to unlink this parent?')) return;
    try {
      await apiClient.delete(`/parents/student/${selectedStudentForDetails.id}/parent/${parentId}`);
      toast.success('Parent unlinked successfully');
      const parents = await apiClient.get(`/parents/student/${selectedStudentForDetails.id}`);
      setStudentParents(parents);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const columns = [
    { title: 'ID', key: 'instituteId', className: 'font-mono text-sm' },
    { title: 'Name', key: 'name', className: 'font-semibold' },
    { title: 'Email', key: 'email', className: 'text-sm' },
    { title: 'Roll No', key: 'rollNumber', className: 'font-mono' },
    { 
      title: 'Division', 
      key: 'division', 
      render: (val) => val ? <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">{val.name}</span> : <span className="text-text-400 text-xs italic">Unassigned</span>
    },
    { title: 'Created At', key: 'createdAt', render: (val) => new Date(val).toLocaleDateString(), className: 'text-sm text-text-500' },
  ];

  const studentsInBatch = selectedBatchYear 
    ? students.filter(s => s.batchYear === selectedBatchYear)
    : students;

  const filteredStudents = studentsInBatch.filter(s => {
    // Apply division filter
    if (selectedDivisionFilter !== 'ALL') {
      if (selectedDivisionFilter === 'UNASSIGNED' && s.divisionId) return false;
      if (selectedDivisionFilter !== 'UNASSIGNED' && s.division?.name !== selectedDivisionFilter) return false;
    }

    // Apply search filter
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      if (
        !s.name?.toLowerCase().includes(lowerQ) &&
        !s.email?.toLowerCase().includes(lowerQ) &&
        !s.instituteId?.toLowerCase().includes(lowerQ) &&
        !s.rollNumber?.toLowerCase().includes(lowerQ)
      ) {
        return false;
      }
    }

    return true;
  });

  const availableDivisionsInBatch = Array.from(new Set(studentsInBatch.map(s => s.division?.name).filter(Boolean))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-900">Students</h2>
          <p className="text-sm text-text-500 mt-1">Manage student records for your department.</p>
        </div>
        <div className="flex gap-3">
          {selectedStudentIds.length > 0 && (
            <Button variant="primary" onClick={openAssignModal}>
              Assign Division ({selectedStudentIds.length})
            </Button>
          )}
          <Button variant="secondary" onClick={() => setIsBulkModalOpen(true)}>
            Bulk Import
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            New Student
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {availableBatchYears.length > 0 && (
          <div className="flex border-b border-border overflow-x-auto w-full sm:w-auto">
            {availableBatchYears.map(year => (
              <button
                key={year}
                onClick={() => {
                  setSelectedBatchYear(year);
                  setSelectedDivisionFilter('ALL');
                  setSelectedStudentIds([]); // clear selection when changing tabs
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  selectedBatchYear === year
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-500 hover:text-text-900 hover:border-border'
                }`}
              >
                Batch {year}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-500">Filter by Division:</span>
          <select 
            value={selectedDivisionFilter}
            onChange={(e) => {
              setSelectedDivisionFilter(e.target.value);
              setSelectedStudentIds([]);
            }}
            className="rounded-md border border-border px-3 py-1.5 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-0"
          >
            <option value="ALL">All Divisions</option>
            <option value="UNASSIGNED">Unassigned</option>
            {availableDivisionsInBatch.map(divName => (
              <option key={divName} value={divName}>Div {divName}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredStudents.length === 0 ? (
        <div className="p-8 text-center bg-surface-0 border border-border rounded-md text-text-500">
          No students found for this batch year.
        </div>
      ) : (
        <DataTable 
          columns={columns}
          data={filteredStudents}
          selectable={true}
          selectedIds={selectedStudentIds}
          onSelectionChange={setSelectedStudentIds}
          onRowClick={handleStudentClick}
        />
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create Student"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Field>
          
          <Field label="Email">
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </Field>

          <Field label="Batch Year">
            <select
              value={formData.batchYear}
              onChange={(e) => setFormData({ ...formData, batchYear: e.target.value })}
              className="w-full bg-surface-0 rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              required
            >
              <option value="" disabled>Select Batch Year</option>
              {availableBatchYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </Field>

          <Field label="Temporary Password">
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Student'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isBulkModalOpen} 
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Import Students"
      >
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <p className="text-sm text-text-500">
            Paste your CSV data below. The first row must be the header: <br/>
            <code>Name,Email,Password,BatchYear</code>.
          </p>
          <Field label="CSV Data">
            <textarea
              className="w-full h-40 font-mono text-sm"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Name,Email,Password,BatchYear&#10;Alice Kim,alice@example.edu,pass123,2024-2028"
              required
            ></textarea>
          </Field>

          {bulkErrors.length > 0 && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-md">
              <p className="text-sm font-semibold text-danger mb-2">Import Errors ({bulkErrors.length})</p>
              <ul className="text-xs text-danger space-y-1 max-h-32 overflow-y-auto">
                {bulkErrors.map((err, i) => (
                  <li key={i}>Row {err.row} ({err.email}): {err.error}</li>
                ))}
              </ul>
            </div>
          )}

          {bulkSuccess > 0 && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-md">
              <p className="text-sm text-success">Successfully imported {bulkSuccess} students.</p>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsBulkModalOpen(false)}>
              Close
            </Button>
            <Button type="submit" disabled={isLoading || !csvData.trim()}>
              {isLoading ? 'Importing...' : 'Run Import'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={isAssignModalOpen} 
        onClose={() => setIsAssignModalOpen(false)}
        title="Assign Students to Division"
      >
        <form onSubmit={handleAssignDivision} className="space-y-4">
          <p className="text-sm text-text-500">
            Assigning {selectedStudentIds.length} student(s) to a division will automatically enroll them in all CORE subjects for that class in the active academic term.
          </p>
          <Field label="Division">
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="w-full bg-surface-0 rounded-md border border-border px-3 py-2 text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700"
              required
            >
              <option value="" disabled>Select Division</option>
              {divisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.class.name} - Semester {div.class.semesterNumber} (Div {div.name})
                </option>
              ))}
            </select>
          </Field>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !selectedDivisionId}>
              {isLoading ? 'Assigning...' : 'Confirm Assignment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Student Details Modal */}
      <Modal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)}
        title="Student Details"
        maxWidth="max-w-2xl"
      >
        {selectedStudentForDetails && (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            <div className="flex items-center gap-4 border-b border-border pb-4">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold">
                {selectedStudentForDetails.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-text-900">{selectedStudentForDetails.name}</h3>
                <p className="text-sm text-text-500">{selectedStudentForDetails.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 bg-surface-50 p-6 rounded-lg border border-border">
              <div>
                <span className="block text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Institute ID</span>
                <span className="block text-base font-mono text-text-900">{selectedStudentForDetails.instituteId}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Roll Number</span>
                <span className="block text-base font-mono text-text-900">{selectedStudentForDetails.rollNumber}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Batch Year</span>
                <span className="block text-base text-text-900 font-medium">{selectedStudentForDetails.batchYear}</span>
              </div>
              <div>
                <span className="block text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Division</span>
                <span className="block text-base text-text-900 font-medium">
                  {selectedStudentForDetails.division?.name ? `Div ${selectedStudentForDetails.division.name}` : <span className="italic text-text-400">Unassigned</span>}
                </span>
              </div>
              <div>
                <span className="block text-xs font-medium text-text-500 uppercase tracking-wider mb-1">Registered On</span>
                <span className="block text-base text-text-900 font-medium">{new Date(selectedStudentForDetails.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-base font-semibold text-text-900 mb-3">Enrolled Subjects</h4>
              {isDetailsLoading ? (
                <div className="text-sm text-text-500 italic">Loading subjects...</div>
              ) : studentEnrollments.length > 0 ? (
                <div className="bg-surface-0 border border-border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-border text-left">
                    <thead className="bg-surface-50">
                      <tr>
                        <th className="px-4 py-2 text-xs font-medium text-text-500 uppercase">Code</th>
                        <th className="px-4 py-2 text-xs font-medium text-text-500 uppercase">Subject</th>
                        <th className="px-4 py-2 text-xs font-medium text-text-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-xs font-medium text-text-500 uppercase">Term</th>
                        <th className="px-4 py-2 text-xs font-medium text-text-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {studentEnrollments.map((enrollment) => (
                        <tr key={enrollment.id} className="hover:bg-surface-50">
                          <td className="px-4 py-2 text-sm font-mono text-text-900">{enrollment.subject?.code}</td>
                          <td className="px-4 py-2 text-sm text-text-900 font-medium">{enrollment.subject?.name}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${enrollment.subject?.subjectType === 'CORE' ? 'bg-ink-100 text-ink-700' : 'bg-primary/10 text-primary'}`}>
                              {enrollment.subject?.subjectType === 'CORE' ? 'Core' : 'Elective'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-text-700">
                            {enrollment.academicTerm?.name} 
                            {enrollment.academicTerm?.isCurrent && <span className="ml-1 text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded-full">Current</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-text-700">{enrollment.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-sm text-text-500 p-4 bg-surface-50 rounded-lg text-center border border-dashed border-border">
                  No subjects currently allocated.
                </div>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-text-900">Parents/Guardians</h4>
                <Button size="sm" variant="secondary" onClick={() => setIsLinkParentModalOpen(true)}>
                  <Plus size={14} className="mr-1" /> Add Parent
                </Button>
              </div>
              
              {isDetailsLoading ? (
                <div className="text-sm text-text-500 italic">Loading parents...</div>
              ) : studentParents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentParents.map(parent => (
                    <div key={parent.id} className="p-4 border border-border rounded-lg bg-surface-0 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-text-900">{parent.name}</div>
                        <div className="text-sm text-text-500">Phone: {parent.phoneNumber} {parent.email && ` | Email: ${parent.email}`}</div>
                      </div>
                      <button 
                        onClick={() => handleUnlinkParent(parent.id)}
                        className="text-danger hover:bg-danger/10 p-2 rounded-md transition-colors"
                        title="Unlink Parent"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-500 p-4 bg-surface-50 rounded-lg text-center border border-dashed border-border">
                  No parents linked to this student yet.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button onClick={() => setIsDetailsModalOpen(false)} variant="secondary">Close</Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal 
        isOpen={isLinkParentModalOpen}
        onClose={() => setIsLinkParentModalOpen(false)}
        title="Link Parent/Guardian"
      >
        <form onSubmit={handleLinkParent} className="space-y-4">
          <p className="text-sm text-text-500">
            If the parent already exists in the system (by phone number), they will be linked to this student. Otherwise, a new parent account will be created.
          </p>
          <Field label="Parent Phone Number (Required)">
            <input 
              type="tel"
              value={parentFormData.phoneNumber}
              onChange={(e) => setParentFormData({ ...parentFormData, phoneNumber: e.target.value })}
              placeholder="e.g. 9876543210"
              required
            />
          </Field>
          
          <div className="grid grid-cols-1 gap-4 border-t border-border pt-4">
            <p className="text-sm text-text-500 font-medium">For New Parents Only:</p>
            <Field label="Parent Name">
              <input 
                type="text"
                value={parentFormData.name}
                onChange={(e) => setParentFormData({ ...parentFormData, name: e.target.value })}
              />
            </Field>

            <Field label="Parent Email (Optional)">
              <input 
                type="email"
                value={parentFormData.email}
                onChange={(e) => setParentFormData({ ...parentFormData, email: e.target.value })}
              />
            </Field>
            
            <Field label="Temporary Password">
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={parentFormData.password}
                  onChange={(e) => setParentFormData({ ...parentFormData, password: e.target.value })}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-400 hover:text-ink-700 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsLinkParentModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Linking...' : 'Link Parent'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
