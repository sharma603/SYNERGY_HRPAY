import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Table, Spinner, Alert } from 'react-bootstrap';
import { emailAPI, authAPI } from '../services/api';
import '../PremiumTheme.css';

function MessageBroadcast() {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({ departments: [], designations: [] });
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState({ show: false, message: '', variant: 'success' });
  
  const [filters, setFilters] = useState({
    department: '',
    designation: ''
  });

  const [broadcastData, setBroadcastData] = useState({
    subject: 'Important Message',
    message: ''
  });

  useEffect(() => {
    fetchMasterData();
    fetchEmployees();
  }, []);

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getUsers();
      // Ensure we only show users who have a valid email address
      const usersWithEmail = (response.data || []).filter(u => u.email && u.email.trim() !== '');
      setEmployees(usersWithEmail);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setStatus({ show: true, message: 'Failed to load employees. Please try again.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const empDept = String(emp.department || '').trim().toLowerCase();
    const filterDept = String(filters.department || '').trim().toLowerCase();
    const matchesDept = filterDept === '' || empDept === filterDept;

    const empDesig = String(emp.designation || '').trim().toLowerCase();
    const filterDesig = String(filters.designation || '').trim().toLowerCase();
    const matchesDesig = filterDesig === '' || empDesig === filterDesig;

    const matchesSearch = searchTerm === '' || 
                         String(emp.USR_Name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                         String(emp.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesDesig && matchesSearch;
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(filteredEmployees.map(emp => emp.email));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (email) => {
    if (selectedEmployees.includes(email)) {
      setSelectedEmployees(selectedEmployees.filter(e => e !== email));
    } else {
      setSelectedEmployees([...selectedEmployees, email]);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      setStatus({ show: true, message: 'Please select at least one employee', variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      await emailAPI.send({
        to: selectedEmployees.join(','),
        subject: broadcastData.subject,
        message: broadcastData.message,
        employeeName: 'Team Member'
      });
      setStatus({ show: true, message: `Broadcast sent successfully to ${selectedEmployees.length} employees!`, variant: 'success' });
      setBroadcastData({ ...broadcastData, message: '' });
      setSelectedEmployees([]);
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setStatus({ show: true, message: 'Failed to send broadcast. Check SMTP settings.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header mb-4">
        <h4 className="fw-bold text-dark mb-1">
          <div className="icon-box-sm bg-dark text-white d-inline-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px', borderRadius: '6px' }}>
            <i className="fa fa-bullhorn" style={{ fontSize: '0.9rem' }}></i>
          </div>
          Message Broadcast
        </h4>
        <p className="text-muted small">Send bulk messages and announcements to multiple employees</p>
      </div>

      {status.show && (
        <Alert variant={status.variant} onClose={() => setStatus({ ...status, show: false })} dismissible>
          {status.message}
        </Alert>
      )}

      <Row>
        <Col lg={4}>
          <Card className="premium-card border-0 shadow-sm mb-4">
            <Card.Body>
              <h6 className="fw-bold mb-3 text-uppercase small text-dark">
                <i className="fa fa-filter me-2"></i> Select Recipients
              </h6>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">DEPARTMENT</Form.Label>
                <Form.Select 
                  className="form-select-sm"
                  value={filters.department}
                  onChange={(e) => setFilters({...filters, department: e.target.value})}
                >
                  <option value="">All Departments</option>
                  {masterData.departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">DESIGNATION</Form.Label>
                <Form.Select 
                  className="form-select-sm"
                  value={filters.designation}
                  onChange={(e) => setFilters({...filters, designation: e.target.value})}
                >
                  <option value="">All Designations</option>
                  {masterData.designations.map(desig => (
                    <option key={desig.id} value={desig.name}>{desig.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-muted">SEARCH EMPLOYEE</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-search text-muted"></i></span>
                  <Form.Control 
                    type="text"
                    className="border-start-0 ps-0"
                    placeholder="Name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </Form.Group>

              <hr />

              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-bold text-muted text-uppercase">Employee List ({filteredEmployees.length})</span>
                <Form.Check 
                  type="checkbox" 
                  label="Select All" 
                  className="small fw-bold"
                  onChange={handleSelectAll}
                  checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                />
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }} className="pe-2 custom-scrollbar">
                {loading && <div className="text-center p-3"><Spinner size="sm" variant="dark" /></div>}
                {filteredEmployees.length === 0 && !loading && <div className="text-center text-muted small p-3">No employees found with email</div>}
                {filteredEmployees.map(emp => (
                  <div key={emp.USR_UserID} className="d-flex align-items-center p-2 mb-1 border-bottom-light rounded hover-bg-light transition-all">
                    <Form.Check 
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.email)}
                      onChange={() => handleSelectEmployee(emp.email)}
                      className="me-2 custom-checkbox"
                    />
                    <div className="flex-grow-1 overflow-hidden">
                      <div className="fw-bold small text-truncate text-dark">{emp.USR_Name}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>{emp.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-end">
                <span className="badge bg-dark px-3 py-2">{selectedEmployees.length} selected</span>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="premium-card border-0 shadow-sm">
            <Card.Body>
              <h6 className="fw-bold mb-4 text-uppercase small text-dark">
                <i className="fa fa-envelope-o me-2"></i> Compose Broadcast Message
              </h6>
              <Form onSubmit={handleSendBroadcast}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-muted">SUBJECT</Form.Label>
                  <Form.Control 
                    type="text"
                    required
                    value={broadcastData.subject}
                    onChange={(e) => setBroadcastData({...broadcastData, subject: e.target.value})}
                    placeholder="Enter broadcast subject..."
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-muted">MESSAGE CONTENT</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={12}
                    required
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({...broadcastData, message: e.target.value})}
                    placeholder="Write your announcement or message here..."
                  />
                  <Form.Text className="text-muted">
                    This message will be sent to all {selectedEmployees.length} selected employees.
                  </Form.Text>
                </Form.Group>
                <div className="d-flex justify-content-end">
                  <Button 
                    variant="dark" 
                    type="submit" 
                    disabled={loading || selectedEmployees.length === 0}
                    className="btn-premium btn-premium-dark px-5 py-2 fw-bold"
                  >
                    {loading ? <><Spinner size="sm" className="me-2" variant="light" /> Sending...</> : <><i className="fa fa-send me-2"></i> Send Broadcast</>}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default MessageBroadcast;
