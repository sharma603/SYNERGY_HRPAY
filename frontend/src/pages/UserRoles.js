import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Modal, Button, Badge, Table } from 'react-bootstrap';
import { authAPI } from '../services/api';
import '../PremiumTheme.css';
// this
const ROLES = [
  { id: 'admin', label: 'Administrator', color: 'dark', permissions: ['all'] },
  { id: 'manager', label: 'Manager', color: 'gray', permissions: ['dashboard', 'employees', 'report-cost-allocation', 'report-attendance-register'] },
  { id: 'user', label: 'Standard User', color: 'gray', permissions: ['dashboard'] }
];

const PAGES = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-th-large' },
  { id: 'employees', label: 'Employees', icon: 'fa-users' },
  { id: 'report-cost-allocation', label: 'Report: Cost Allocation', icon: 'fa-bar-chart' },
  { id: 'report-cost-allocation-filter', label: 'Report: Cost Allocation Filter', icon: 'fa-filter' },
  { id: 'report-annual-leave-exit-permit', label: 'Report: Annual Leave Exit Permit', icon: 'fa-plane' },
  { id: 'report-attendance-register', label: 'Report: Attendance Register', icon: 'fa-clock-o' },
  { id: 'report-attendance-register-all', label: 'Report: Attendance Register All', icon: 'fa-clock-o' },
  { id: 'report-employee-site-location', label: 'Report: Employee Site Location', icon: 'fa-map-marker' },
  { id: 'user-roles', label: 'User Roles', icon: 'fa-shield' },
  { id: 'message-broadcast', label: 'Message Broadcast', icon: 'fa-bullhorn' },
  { id: 'absentee-notification', label: 'Absentee Notification', icon: 'fa-user-times' },
  { id: 'holidays', label: 'Holidays', icon: 'fa-calendar-check-o' },
  { id: 'settings', label: 'Settings', icon: 'fa-cog' }
];

function UserRoles() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [masterData, setMasterData] = useState({ departments: [], designations: [], employees: [] });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    email: '',
    phone: '',
    department: '',
    designation: '',
    permissions: []
  });

  useEffect(() => {
    fetchUsers();
    fetchMasterData();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateNew = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'user',
      email: '',
      phone: '',
      department: '',
      designation: '',
      permissions: []
    });
    setViewOnly(false);
    setEditMode(false);
    setShowModal(true);
  };

  const handleView = (user) => {
    setFormData({
      username: user.USR_UserID,
      password: '••••••••',
      name: user.USR_Name,
      role: user.role || 'user',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []
    });
    setViewOnly(true);
    setEditMode(false);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.USR_UserID,
      password: '', // Keep empty if not changing
      name: user.USR_Name,
      role: user.role || 'user',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
      designation: user.designation || '',
      permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : []
    });
    setViewOnly(false);
    setEditMode(true);
    setShowModal(true);
  };

  const handlePermissionChange = (pageId) => {
    setFormData(prev => {
      const permissions = prev.permissions.includes(pageId)
        ? prev.permissions.filter(p => p !== pageId)
        : [...prev.permissions, pageId];
      return { ...prev, permissions };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await authAPI.updateUser(formData.username, formData);
        alert('User updated successfully!');
      } else {
        await authAPI.createUser(formData);
        alert('User created successfully!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to process request');
    }
  };

  const handleDelete = async (username) => {
    if (window.confirm(`Are you sure you want to delete user: ${username}?`)) {
      try {
        await authAPI.deleteUser(username);
        fetchUsers();
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">User Roles & Permissions</h1>
          <p className="premium-subtitle">Manage system users, assigned roles, and granular page-level access permissions</p>
        </div>
        <button className="btn-premium btn-premium-dark" onClick={handleCreateNew}>
          <i className="fa fa-user-plus"></i> <span>Create New User</span>
        </button>
      </div>

      <div className="premium-card p-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table-premium mb-0">
            <thead>
              <tr>
                <th>NAME</th>
                <th>USERNAME</th>
                <th>ROLE</th>
                <th>SOURCE</th>
                <th>PERMISSIONS</th>
                <th className="text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-premium"></div>
                    <p className="text-muted mt-2">Loading system users...</p>
                  </td>
                </tr>
              ) : users.length > 0 ? (
                users.map((user) => {
                  const roleInfo = ROLES.find(r => r.id === (user.role?.toLowerCase() || 'user')) || ROLES[2];
                  const permissionsCount = user.permissions ? 
                    (typeof user.permissions === 'string' ? JSON.parse(user.permissions).length : user.permissions.length) : 0;
                  
                  return (
                    <tr key={user.USR_UserID}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-circle-sm me-3">
                            {user.USR_Name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-bold">{user.USR_Name}</div>
                            <div className="small text-muted">{user.email || 'No email provided'}</div>
                          </div>
                        </div>
                      </td>
                      <td><code>{user.USR_UserID}</code></td>
                      <td>
                        <span className={`badge-premium badge-premium-${roleInfo.color}`}>
                          {roleInfo.label}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-premium ${user.source === 'new' ? 'badge-premium-dark' : 'badge-premium-gray'}`}>
                          {user.source || 'Legacy'}
                        </span>
                      </td>
                      <td>
                        <span className="badge-premium badge-premium-dark">
                          <i className="fa fa-lock me-1"></i> {permissionsCount} Modules
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-end">
                          <button className="btn-premium btn-premium-secondary btn-sm p-2" onClick={() => handleView(user)} title="View Details">
                            <i className="fa fa-eye m-0 text-dark"></i>
                          </button>
                          {user.source === 'new' && (
                            <button className="btn-premium btn-premium-secondary btn-sm p-2" onClick={() => handleEdit(user)} title="Edit User">
                              <i className="fa fa-edit m-0 text-dark"></i>
                            </button>
                          )}
                          {user.source === 'new' && user.USR_UserID !== 'admin' && (
                            <button className="btn-premium btn-premium-secondary btn-sm p-2" onClick={() => handleDelete(user.USR_UserID)} title="Delete User">
                              <i className="fa fa-trash m-0 text-danger"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <i className="fa fa-users fa-3x text-muted mb-3 opacity-25"></i>
                    <p className="text-muted">No users found in the system.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg" className="premium-modal">
        <Modal.Header closeButton className="border-0 px-4 pt-4 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center text-dark">
            <div className="icon-box-sm bg-dark text-white me-3 d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
              <i className={`fa ${viewOnly ? 'fa-user-circle-o' : editMode ? 'fa-user-edit' : 'fa-user-plus'}`}></i>
            </div>
            {viewOnly ? 'User Details' : editMode ? 'Edit User Account' : 'Create New User Account'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body className="px-4 py-4">
            <Row className="g-4">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Employee Name</Form.Label>
                  <Form.Select 
                    name="name" className="form-select border-gray-200" 
                    value={formData.name} onChange={handleInputChange} 
                    required disabled={viewOnly || editMode}
                  >
                    <option value="">Select Employee</option>
                    {masterData.employees.map(e => (
                      <option key={e.id} value={e.name}>
                        {e.name} ({e.code})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Login Username</Form.Label>
                  <Form.Control 
                    type="text" name="username" className="form-control border-gray-200" 
                    value={formData.username} onChange={handleInputChange} 
                    placeholder="e.g. jdoe"
                    required disabled={viewOnly || editMode}
                  />
                </Form.Group>
              </Col>
              {!viewOnly && (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="form-label fw-bold small text-muted text-uppercase">
                      {editMode ? 'Reset Password' : 'Password'}
                    </Form.Label>
                    <Form.Control 
                      type="password" name="password" className="form-control border-gray-200" 
                      value={formData.password} onChange={handleInputChange} 
                      placeholder={editMode ? "Leave blank to keep current" : "Enter secure password"}
                      required={!editMode}
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Email Address</Form.Label>
                  <Form.Control 
                    type="email" name="email" className="form-control border-gray-200" 
                    value={formData.email} onChange={handleInputChange} 
                    placeholder="e.g. john@example.com"
                    disabled={viewOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Phone Number</Form.Label>
                  <Form.Control 
                    type="text" name="phone" className="form-control border-gray-200" 
                    value={formData.phone} onChange={handleInputChange} 
                    placeholder="e.g. +1234567890"
                    disabled={viewOnly}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">System Role</Form.Label>
                  <Form.Select 
                    name="role" className="form-select border-gray-200" 
                    value={formData.role} onChange={handleInputChange}
                    disabled={viewOnly}
                  >
                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Primary Department</Form.Label>
                  <Form.Select 
                    name="department" className="form-select border-gray-200" 
                    value={formData.department} onChange={handleInputChange}
                    disabled={viewOnly}
                  >
                    <option value="">Select Department</option>
                    {masterData.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label fw-bold small text-muted text-uppercase">Job Designation</Form.Label>
                  <Form.Select 
                    name="designation" className="form-select border-gray-200" 
                    value={formData.designation} onChange={handleInputChange}
                    disabled={viewOnly}
                  >
                    <option value="">Select Designation</option>
                    {masterData.designations.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={12}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="fw-bold m-0 d-flex align-items-center text-uppercase small text-dark">
                    <i className="fa fa-shield me-2"></i> Page Access Permissions
                  </h6>
                  {!viewOnly && (
                    <div className="d-flex gap-2">
                      <button 
                        type="button" className="btn btn-link btn-sm p-0 text-decoration-none small text-dark fw-bold"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: PAGES.map(p => p.id) }))}
                      >
                        Select All
                      </button>
                      <span className="text-muted small">|</span>
                      <button 
                        type="button" className="btn btn-link btn-sm p-0 text-decoration-none small text-muted fw-bold"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                </div>
                <div className="premium-card bg-light p-3 border-0 shadow-none" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="row g-3">
                    {PAGES.map(page => (
                      <Col key={page.id} sm={6} lg={4}>
                        <div className={`permission-card-item p-2 rounded border transition-all ${formData.permissions.includes(page.id) ? 'bg-dark text-white border-dark' : 'bg-white text-dark border-gray-100'}`}>
                          <Form.Check 
                            type="checkbox"
                            id={`perm-${page.id}`}
                            label={
                              <div className="d-flex align-items-center ms-1">
                                <div className={`permission-icon-box me-2 d-flex align-items-center justify-content-center ${formData.permissions.includes(page.id) ? 'text-white' : 'text-muted'}`} style={{ width: '24px' }}>
                                  <i className={`fa ${page.icon}`}></i>
                                </div>
                                <span className="small fw-semibold">{page.label}</span>
                              </div>
                            }
                            checked={formData.permissions.includes(page.id)}
                            onChange={() => handlePermissionChange(page.id)}
                            disabled={viewOnly}
                            className="m-0 custom-checkbox-white"
                          />
                        </div>
                      </Col>
                    ))}
                  </div>
                </div>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0 px-4 pt-0 pb-4 d-flex justify-content-end gap-2">
            <button type="button" className="btn-premium btn-premium-secondary px-4 fw-bold" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            {!viewOnly && (
              <button type="submit" className="btn-premium btn-premium-dark px-5 fw-bold">
                {editMode ? 'Save Changes' : 'Create Account'}
              </button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default UserRoles;
