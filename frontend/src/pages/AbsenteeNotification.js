import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Card, Table, Spinner, Alert, Badge, Modal } from 'react-bootstrap';
import Select from 'react-select';
import { attendanceAPI, authAPI, holidayAPI } from '../services/api';
import '../PremiumTheme.css';

function AbsenteeNotification() {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('absent'); // 'absent' or 'late'
  const [absentees, setAbsentees] = useState([]);
  const [totalAbsentees, setTotalAbsentees] = useState(0);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [masterData, setMasterData] = useState({ sections: [], departments: [] });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [selectedAbsentees, setSelectedAbsentees] = useState([]);
  const [status, setStatus] = useState({ show: false, message: '', variant: 'success' });
  const [isHoliday, setIsHoliday] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const daysOfWeek = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' }
  ];

  const [automation, setAutomation] = useState({
    absent: {
      enabled: false,
      time: '10:00',
      days: [1, 2, 3, 4, 5, 6], // Default Mon-Sat
      department: '',
      section: '',
      subject: 'Absence Notification',
      message: "Hope you're doing well,\n\nWe have noticed that you were absent today without prior notice.\n\nIf you have missed your check-in or were on official duty outside the office, kindly ensure that your attendance is registered or your leave request (according to the applicable leave type) is submitted through the system to avoid the day being recorded as an absence.\n\nThank you for your cooperation, and we wish you a pleasant day."
    },
    late: {
      enabled: false,
      time: '09:00',
      days: [1, 2, 3, 4, 5, 6], // Default Mon-Sat
      department: '',
      section: '',
      lateThreshold: '08:20',
      sectionRules: [], // [{ section: 'STAFF A', time: '08:00' }]
      subject: 'Late Check-in',
      message: "Based on today’s attendance records, your official working hours commence at 08:00 AM. However, the system indicates that your check-in was recorded as follows:\n\nWe trust that this delay was due to a valid reason and hope everything is well. In accordance with company attendance policy, kindly coordinate with your direct manager to provide the necessary clarification or approval, if applicable."
    }
  });

  const [newRule, setNewRule] = useState({ section: '', time: '08:20' });

  const [broadcastData, setBroadcastData] = useState({
    absent: {
      subject: 'Absence Notification',
      message: "Hope you're doing well,\n\nWe have noticed that you were absent today without prior notice.\n\nIf you have missed your check-in or were on official duty outside the office, kindly ensure that your attendance is registered or your leave request (according to the applicable leave type) is submitted through the system to avoid the day being recorded as an absence.\n\nThank you for your cooperation, and we wish you a pleasant day."
    },
    late: {
      subject: 'Late Check-in',
      message: "Based on today’s attendance records, your official working hours commence at 08:00 AM. However, the system indicates that your check-in was recorded as follows:\n\nWe trust that this delay was due to a valid reason and hope everything is well. In accordance with company attendance policy, kindly coordinate with your direct manager to provide the necessary clarification or approval, if applicable."
    }
  });

  useEffect(() => {
    fetchSettings();
    fetchMasterData();
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await holidayAPI.getAll();
      setHolidays(response.data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
    }
  };

  useEffect(() => {
    fetchAbsentees(1);
  }, [date, activeTab, automation.late.lateThreshold, selectedSection, selectedDepartment, automation.late.sectionRules]);

  const fetchMasterData = async () => {
    try {
      const response = await authAPI.getMasterData();
      setMasterData(response.data);
    } catch (err) {
      console.error('Error fetching master data:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await attendanceAPI.getAbsenteeSettings();
      if (response.data) {
        setAutomation(response.data);
        setBroadcastData({
          absent: {
            subject: response.data.absent?.subject || 'Absence Notification',
            message: response.data.absent?.message || 'We noticed you were absent today without prior notice.'
          },
          late: {
            subject: response.data.late?.subject || 'Late Check-in',
            message: response.data.late?.message || "Based on today’s attendance records, your official working hours commence at 08:00 AM. However, the system indicates that your check-in was recorded as follows:\n\nWe trust that this delay was due to a valid reason and hope everything is well. In accordance with company attendance policy, kindly coordinate with your direct manager to provide the necessary clarification or approval, if applicable."
          }
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const handleSaveAutomation = async (updatedAutomation = automation, silent = false) => {
    try {
      if (!silent) setLoading(true);
      await attendanceAPI.updateAbsenteeSettings(updatedAutomation);
      if (!silent) setStatus({ show: true, message: 'Automation settings saved successfully!', variant: 'success' });
    } catch (err) {
      console.error('Error saving automation settings:', err);
      if (!silent) setStatus({ show: true, message: 'Failed to save automation settings.', variant: 'danger' });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updateAutomationSetting = async (key, value) => {
    const newAutomation = {
      ...automation,
      [activeTab]: { ...automation[activeTab], [key]: value }
    };
    setAutomation(newAutomation);
    // Auto-save for critical settings
    if (['enabled', 'time', 'department', 'section', 'lateThreshold'].includes(key)) {
      await handleSaveAutomation(newAutomation, true);
    }
  };

  const fetchAbsentees = async (pageNumber = pagination.page) => {
    try {
      setLoading(true);
      const threshold = automation.late.lateThreshold || '08:20';
      const rules = automation.late.sectionRules || [];
      const response = await attendanceAPI.getAbsentees(date, pageNumber, pagination.limit, activeTab, threshold, selectedSection, selectedDepartment, rules);
      
      if (response.data.holiday) {
        setIsHoliday(response.data.holiday);
        setAbsentees([]);
        setTotalAbsentees(0);
      } else {
        setIsHoliday(null);
        setAbsentees(response.data.data || []);
        setTotalAbsentees(response.data.pagination?.total || 0);
        setPagination(prev => ({
          ...prev,
          page: response.data.pagination?.page || 1,
          totalPages: response.data.pagination?.totalPages || 0
        }));
      }
      setSelectedAbsentees([]); // Reset selection on data change
    } catch (err) {
      console.error('Error fetching employee list:', err);
      setStatus({ show: true, message: 'Failed to load employee list.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedAbsentees(absentees.filter(a => a.email).map(a => a.EMP_Code));
    } else {
      setSelectedAbsentees([]);
    }
  };

  const handleSelectOne = (code) => {
    if (selectedAbsentees.includes(code)) {
      setSelectedAbsentees(selectedAbsentees.filter(c => c !== code));
    } else {
      setSelectedAbsentees([...selectedAbsentees, code]);
    }
  };

  const handleSendNotifications = async (e) => {
    e.preventDefault();
    if (selectedAbsentees.length === 0) {
      setStatus({ show: true, message: 'Please select at least one employee', variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const recipients = absentees.filter(a => selectedAbsentees.includes(a.EMP_Code));
      await attendanceAPI.notifyAbsentees({
        recipients,
        subject: broadcastData[activeTab].subject,
        message: broadcastData[activeTab].message
      });
      setStatus({ 
        show: true, 
        message: `Notifications sent successfully to ${selectedAbsentees.length} employees!`, 
        variant: 'success' 
      });
      setSelectedAbsentees([]);
    } catch (err) {
      console.error('Error sending notifications:', err);
      setStatus({ show: true, message: 'Failed to send notifications. Check SMTP settings.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayValue) => {
    const currentDays = automation[activeTab].days || [];
    const newDays = currentDays.includes(dayValue)
      ? currentDays.filter(d => d !== dayValue)
      : [...currentDays, dayValue];
    
    setAutomation({
      ...automation,
      [activeTab]: { ...automation[activeTab], days: newDays }
    });
  };

  const addSectionRule = () => {
    if (!newRule.section) return;
    const currentRules = automation.late.sectionRules || [];
    setAutomation({
      ...automation,
      late: { ...automation.late, sectionRules: [...currentRules, { ...newRule }] }
    });
    setNewRule({ section: '', time: '08:20' });
  };

  const removeSectionRule = (index) => {
    const currentRules = automation.late.sectionRules || [];
    const updatedRules = currentRules.filter((_, i) => i !== index);
    setAutomation({
      ...automation,
      late: { ...automation.late, sectionRules: updatedRules }
    });
  };

  const handleModalSave = async () => {
    await handleSaveAutomation();
    setShowSettingsModal(false);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header mb-4">
        <h4 className="fw-bold text-dark mb-1">
          <div className="icon-box-sm bg-danger text-white d-inline-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px', borderRadius: '6px' }}>
            <i className={`fa ${activeTab === 'absent' ? 'fa-user-times' : 'fa-clock-o'}`} style={{ fontSize: '0.9rem' }}></i>
          </div>
          {activeTab === 'absent' ? 'Absentee Notification' : 'Late Comer Notification'}
        </h4>
        <p className="text-muted small">Send alerts to employees who are absent or arrived late</p>
      </div>

      <div className="d-flex mb-4">
        <Button 
          variant={activeTab === 'absent' ? 'danger' : 'outline-danger'} 
          className="me-2 btn-sm fw-bold px-4"
          onClick={() => setActiveTab('absent')}
        >
          <i className="fa fa-user-times me-2"></i> Absentees
        </Button>
        <Button 
          variant={activeTab === 'late' ? 'warning' : 'outline-warning'} 
          className="btn-sm fw-bold px-4"
          onClick={() => setActiveTab('late')}
        >
          <i className="fa fa-clock-o me-2"></i> Late Comers
        </Button>
      </div>

      {status.show && (
        <Alert variant={status.variant} onClose={() => setStatus({ ...status, show: false })} dismissible>
          {status.message}
        </Alert>
      )}

      {isHoliday && (
        <Alert variant="info" className="border-0 shadow-sm d-flex align-items-center">
          <i className="fa fa-calendar-check-o me-3 fa-lg"></i>
          <div>
            <div className="fw-bold">Company Holiday: {isHoliday}</div>
            <div className="small">Notifications are automatically disabled for this date.</div>
          </div>
        </Alert>
      )}

      <Row>
        <Col lg={4} className="pe-lg-4">
          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px', borderLeft: '4px solid #334155' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-4 text-uppercase small d-flex align-items-center" style={{ color: '#1e293b', letterSpacing: '0.5px' }}>
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '28px', height: '28px' }}>
                  <i className="fa fa-magic text-secondary" style={{ fontSize: '0.85rem' }}></i>
                </div>
                Auto-Notification Settings
              </h6>
              
              <Form.Group className="mb-4 d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <div>
                  <Form.Label className="small fw-bold text-dark mb-0 text-uppercase">Enable {activeTab.toUpperCase()} Auto</Form.Label>
                  <div className="text-muted" style={{ fontSize: '0.65rem' }}>Send emails automatically</div>
                </div>
                <Form.Check 
                  type="switch"
                  id="auto-switch"
                  className="custom-switch-lg"
                  checked={automation[activeTab].enabled}
                  onChange={(e) => updateAutomationSetting('enabled', e.target.checked)}
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Scheduled Time (Daily)</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-clock-o text-muted"></i></span>
                  <Form.Control 
                    type="time"
                    className="form-control-sm border-start-0 ps-0"
                    style={{ backgroundColor: automation[activeTab].enabled ? 'white' : '#f1f5f9' }}
                    value={automation[activeTab].time}
                    onChange={(e) => updateAutomationSetting('time', e.target.value)}
                    disabled={!automation[activeTab].enabled}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Target Department</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-building-o text-muted"></i></span>
                  <div className="flex-grow-1">
                    <Select
                      name="auto-department"
                      value={automation[activeTab].department ? { value: automation[activeTab].department, label: automation[activeTab].department } : null}
                      onChange={(opt) => updateAutomationSetting('department', opt ? opt.value : '')}
                      options={masterData.departments.map(d => ({ value: d.name, label: d.name }))}
                      placeholder="All Departments"
                      isClearable
                      isDisabled={!automation[activeTab].enabled}
                      styles={{
                        control: (base) => ({ 
                          ...base, 
                          minHeight: '31px', 
                          borderRadius: '0 6px 6px 0', 
                          fontSize: '0.8rem',
                          borderLeft: '0',
                          backgroundColor: automation[activeTab].enabled ? 'white' : '#f1f5f9'
                        }),
                        valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                        dropdownIndicator: (base) => ({ ...base, padding: '2px 8px' }),
                        clearIndicator: (base) => ({ ...base, padding: '2px 8px' })
                      }}
                    />
                  </div>
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Target Section</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-filter text-muted"></i></span>
                  <div className="flex-grow-1">
                    <Select
                      name="auto-section"
                      value={automation[activeTab].section ? { value: automation[activeTab].section, label: automation[activeTab].section } : null}
                      onChange={(opt) => updateAutomationSetting('section', opt ? opt.value : '')}
                      options={masterData.sections.map(s => ({ value: s.name, label: s.name }))}
                      placeholder="All Sections"
                      isClearable
                      isDisabled={!automation[activeTab].enabled}
                      styles={{
                        control: (base) => ({ 
                          ...base, 
                          minHeight: '31px', 
                          borderRadius: '0 6px 6px 0', 
                          fontSize: '0.8rem',
                          borderLeft: '0',
                          backgroundColor: automation[activeTab].enabled ? 'white' : '#f1f5f9'
                        }),
                        valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                        dropdownIndicator: (base) => ({ ...base, padding: '2px 8px' }),
                        clearIndicator: (base) => ({ ...base, padding: '2px 8px' })
                      }}
                    />
                  </div>
                </div>
              </Form.Group>

              {activeTab === 'late' && (
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Late Threshold Time</Form.Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0"><i className="fa fa-hourglass-start text-muted"></i></span>
                    <Form.Control 
                      type="time"
                      className="form-control-sm border-start-0 ps-0"
                      style={{ backgroundColor: automation.late.enabled ? 'white' : '#f1f5f9' }}
                      value={automation.late.lateThreshold || '08:20'}
                      onChange={(e) => updateAutomationSetting('lateThreshold', e.target.value)}
                      disabled={!automation.late.enabled}
                    />
                  </div>
                </Form.Group>
              )}

              <Button 
                variant="dark" 
                className="w-100 btn-sm fw-bold py-2 shadow-sm"
                style={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
                onClick={() => setShowSettingsModal(true)}
              >
                <i className="fa fa-sliders me-2"></i> {activeTab === 'absent' ? 'Absentee' : 'Late Comer'} Settings
              </Button>
            </Card.Body>
          </Card>

          <Card className="border-0 shadow-sm mb-4" style={{ borderRadius: '12px', borderLeft: '4px solid #64748b' }}>
            <Card.Body className="p-4">
              <h6 className="fw-bold mb-4 text-uppercase small d-flex align-items-center" style={{ color: '#1e293b', letterSpacing: '0.5px' }}>
                <div className="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" style={{ width: '28px', height: '28px' }}>
                  <i className="fa fa-cog text-secondary" style={{ fontSize: '0.85rem' }}></i>
                </div>
                Manual Check & Broadcast
              </h6>
              
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Date to Check</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-calendar text-muted"></i></span>
                  <Form.Control 
                    type="date"
                    className="form-control-sm border-start-0 ps-0"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Filter by Department</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-building-o text-muted"></i></span>
                  <div className="flex-grow-1">
                    <Select
                      name="department"
                      value={selectedDepartment ? { value: selectedDepartment, label: selectedDepartment } : null}
                      onChange={(opt) => setSelectedDepartment(opt ? opt.value : '')}
                      options={masterData.departments.map(d => ({ value: d.name, label: d.name }))}
                      placeholder="All Departments"
                      isClearable
                      styles={{
                        control: (base) => ({ 
                          ...base, 
                          minHeight: '31px', 
                          borderRadius: '0 6px 6px 0', 
                          fontSize: '0.8rem',
                          borderLeft: '0'
                        }),
                        valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                        dropdownIndicator: (base) => ({ ...base, padding: '2px 8px' }),
                        clearIndicator: (base) => ({ ...base, padding: '2px 8px' })
                      }}
                    />
                  </div>
                </div>
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Filter by Section</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-white border-end-0"><i className="fa fa-filter text-muted"></i></span>
                  <div className="flex-grow-1">
                    <Select
                      name="section"
                      value={selectedSection ? { value: selectedSection, label: selectedSection } : null}
                      onChange={(opt) => setSelectedSection(opt ? opt.value : '')}
                      options={masterData.sections.map(s => ({ value: s.name, label: s.name }))}
                      placeholder="All Sections"
                      isClearable
                      styles={{
                        control: (base) => ({ 
                          ...base, 
                          minHeight: '31px', 
                          borderRadius: '0 6px 6px 0', 
                          fontSize: '0.8rem',
                          borderLeft: '0'
                        }),
                        valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                        dropdownIndicator: (base) => ({ ...base, padding: '2px 8px' }),
                        clearIndicator: (base) => ({ ...base, padding: '2px 8px' })
                      }}
                    />
                  </div>
                </div>
              </Form.Group>

              {activeTab === 'late' && (
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Manual Late Threshold</Form.Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white border-end-0"><i className="fa fa-sliders text-muted"></i></span>
                    <Form.Control 
                      type="time"
                      className="form-control-sm border-start-0 ps-0"
                      value={automation.late.lateThreshold || '08:20'}
                      onChange={(e) => setAutomation({
                        ...automation, 
                        late: { ...automation.late, lateThreshold: e.target.value }
                      })}
                    />
                    <span className="input-group-text bg-white border-start-0"><i className="fa fa-clock-o text-muted"></i></span>
                  </div>
                </Form.Group>
              )}

              <hr className="my-4" style={{ opacity: 0.1 }} />

              <Form onSubmit={handleSendNotifications}>
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Email Subject</Form.Label>
                  <Form.Control 
                    type="text"
                    className="form-control-sm bg-light border-0"
                    style={{ borderRadius: '6px' }}
                    value={broadcastData[activeTab].subject}
                    onChange={(e) => setBroadcastData({
                      ...broadcastData, 
                      [activeTab]: { ...broadcastData[activeTab], subject: e.target.value }
                    })}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Message Content</Form.Label>
                  <Form.Control 
                    as="textarea"
                    rows={4}
                    className="form-control-sm bg-light border-0"
                    style={{ borderRadius: '6px', resize: 'none' }}
                    value={broadcastData[activeTab].message}
                    onChange={(e) => setBroadcastData({
                      ...broadcastData, 
                      [activeTab]: { ...broadcastData[activeTab], message: e.target.value }
                    })}
                    required
                  />
                </Form.Group>

                <Button 
                  type="submit" 
                  variant="dark" 
                  className="w-100 btn-sm fw-bold py-2 shadow-sm"
                  style={{ backgroundColor: '#334155', border: 'none', borderRadius: '8px' }}
                  disabled={loading || selectedAbsentees.length === 0 || isHoliday}
                >
                  {loading ? <Spinner size="sm" /> : <><i className="fa fa-paper-plane me-2"></i> Send to ({selectedAbsentees.length})</>}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={8}>
          <Card className="premium-card border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="p-3 d-flex justify-content-between align-items-center border-bottom">
                <h6 className="fw-bold mb-0 small text-uppercase">
                  <i className={`fa ${activeTab === 'absent' ? 'fa-list' : 'fa-clock-o'} me-2`}></i> {activeTab === 'absent' ? 'Absentees' : 'Late Comers'} List
                </h6>
                <div className="d-flex align-items-center">
                  <Badge bg={activeTab === 'absent' ? 'danger' : 'warning'} className="me-3">{totalAbsentees} Found</Badge>
                  <Form.Check 
                    type="checkbox"
                    label="Select All"
                    className="small fw-bold mb-0"
                    onChange={handleSelectAll}
                    checked={absentees.length > 0 && selectedAbsentees.length === absentees.filter(a => a.email).length}
                  />
                </div>
              </div>
              
              <div className="table-responsive">
                <Table hover className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th style={{ width: '40px' }} className="ps-3">#</th>
                      <th style={{ width: '40px' }}></th>
                      <th>Employee</th>
                      <th>Dept / Section</th>
                      {activeTab === 'late' && <th>Check-In</th>}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={activeTab === 'late' ? "6" : "5"} className="text-center p-5">
                          <Spinner animation="border" variant="dark" size="sm" />
                          <p className="mt-2 text-muted small">Checking attendance records...</p>
                        </td>
                      </tr>
                    ) : absentees.length === 0 ? (
                      <tr>
                        <td colSpan={activeTab === 'late' ? "6" : "5"} className="text-center p-5 text-muted small">
                          {isHoliday ? (
                            <>
                              <i className="fa fa-calendar-check-o fa-2x mb-3 d-block opacity-25"></i>
                              Today is a company holiday (<strong>{isHoliday}</strong>).<br/>
                              No attendance tracking or notifications required.
                            </>
                          ) : (
                            `No ${activeTab === 'absent' ? 'absentees' : 'late comers'} found for this date.`
                          )}
                        </td>
                      </tr>
                    ) : (
                      absentees.map((emp, index) => (
                        <tr key={emp.EMP_Code}>
                          <td className="ps-3 small text-muted">{index + 1}</td>
                          <td>
                            <Form.Check 
                              type="checkbox"
                              checked={selectedAbsentees.includes(emp.EMP_Code)}
                              onChange={() => handleSelectOne(emp.EMP_Code)}
                              disabled={!emp.email}
                            />
                          </td>
                          <td>
                            <div className="fw-bold text-dark mb-0 small">{emp.EMP_Name}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              {emp.EMP_Code} {emp.email ? `| ${emp.email}` : <span className="text-danger">| No Email</span>}
                            </div>
                          </td>
                          <td>
                            <div className="small fw-bold text-dark">{emp.department}</div>
                            <div className="text-muted" style={{ fontSize: '0.7rem' }}>{emp.section || '-'}</div>
                          </td>
                          {activeTab === 'late' && (
                            <td className="small fw-bold text-danger">{emp.CHECK_IN}</td>
                          )}
                          <td>
                            <Badge bg={activeTab === 'absent' ? 'danger' : 'warning'} style={{ fontSize: '0.65rem' }}>
                              {activeTab === 'absent' ? 'ABSENT' : 'LATE'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Pagination Footer */}
              {!loading && absentees.length > 0 && (
                <div className="p-3 border-top d-flex justify-content-between align-items-center bg-light">
                  <div className="small text-muted">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, totalAbsentees)} of {totalAbsentees} absentees
                  </div>
                  <div className="d-flex align-items-center">
                    <Form.Select 
                      size="sm" 
                      className="me-3" 
                      style={{ width: 'auto' }}
                      value={pagination.limit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value);
                        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                        fetchAbsentees(1);
                      }}
                    >
                      <option value="10">10 per page</option>
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </Form.Select>
                    <nav>
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => fetchAbsentees(pagination.page - 1)}>
                            <i className="fa fa-chevron-left"></i>
                          </button>
                        </li>
                        {[...Array(pagination.totalPages)].map((_, i) => (
                          <li key={i + 1} className={`page-item ${pagination.page === i + 1 ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => fetchAbsentees(i + 1)}>
                              {i + 1}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${pagination.page === pagination.totalPages ? 'disabled' : ''}`}>
                          <button className="page-link" onClick={() => fetchAbsentees(pagination.page + 1)}>
                            <i className="fa fa-chevron-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Settings Modal */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} centered size="md">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>
            <i className={`fa ${activeTab === 'absent' ? 'fa-user-times' : 'fa-clock-o'} me-2`}></i>
            {activeTab === 'absent' ? 'Absentee' : 'Late Comer'} Auto-Settings
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form.Group className="mb-4 d-flex align-items-center justify-content-between p-3 rounded-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9' }}>
            <div>
              <Form.Label className="small fw-bold text-dark mb-0 text-uppercase">Enable Automation</Form.Label>
              <div className="text-muted" style={{ fontSize: '0.65rem' }}>Send emails automatically on scheduled days</div>
            </div>
            <Form.Check 
              type="switch"
              id="modal-auto-switch"
              checked={automation[activeTab].enabled}
              onChange={(e) => setAutomation({
                ...automation, 
                [activeTab]: { ...automation[activeTab], enabled: e.target.checked }
              })}
            />
          </Form.Group>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Target Department</Form.Label>
                <Select
                  name="modal-auto-department"
                  value={automation[activeTab].department ? { value: automation[activeTab].department, label: automation[activeTab].department } : null}
                  onChange={(opt) => setAutomation({
                    ...automation,
                    [activeTab]: { ...automation[activeTab], department: opt ? opt.value : '' }
                  })}
                  options={masterData.departments.map(d => ({ value: d.name, label: d.name }))}
                  placeholder="All Departments"
                  isClearable
                  isDisabled={!automation[activeTab].enabled}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      minHeight: '34px', 
                      fontSize: '0.8rem',
                      backgroundColor: automation[activeTab].enabled ? 'white' : '#f1f5f9'
                    })
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Target Section</Form.Label>
                <Select
                  name="modal-auto-section"
                  value={automation[activeTab].section ? { value: automation[activeTab].section, label: automation[activeTab].section } : null}
                  onChange={(opt) => setAutomation({
                    ...automation,
                    [activeTab]: { ...automation[activeTab], section: opt ? opt.value : '' }
                  })}
                  options={masterData.sections.map(s => ({ value: s.name, label: s.name }))}
                  placeholder="All Sections"
                  isClearable
                  isDisabled={!automation[activeTab].enabled}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      minHeight: '34px', 
                      fontSize: '0.8rem',
                      backgroundColor: automation[activeTab].enabled ? 'white' : '#f1f5f9'
                    })
                  }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Scheduled Time</Form.Label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text bg-light border-end-0"><i className="fa fa-clock-o"></i></span>
                  <Form.Control 
                    type="time"
                    className="form-control-sm border-start-0"
                    value={automation[activeTab].time}
                    onChange={(e) => setAutomation({
                      ...automation, 
                      [activeTab]: { ...automation[activeTab], time: e.target.value }
                    })}
                    disabled={!automation[activeTab].enabled}
                  />
                </div>
              </Form.Group>
            </Col>
            {activeTab === 'late' && (
              <Col md={6}>
                <Form.Group className="mb-4">
                  <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Late Threshold</Form.Label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-light border-end-0"><i className="fa fa-hourglass-start"></i></span>
                    <Form.Control 
                      type="time"
                      className="form-control-sm border-start-0"
                      value={automation.late.lateThreshold || '08:20'}
                      onChange={(e) => setAutomation({
                        ...automation, 
                        late: { ...automation.late, lateThreshold: e.target.value }
                      })}
                      disabled={!automation.late.enabled}
                    />
                  </div>
                </Form.Group>
              </Col>
            )}
          </Row>

          <Form.Group className="mb-4">
            <Form.Label className="small fw-bold text-secondary text-uppercase mb-2">Run on these Days</Form.Label>
            <div className="d-flex justify-content-between">
              {daysOfWeek.map(day => (
                <div 
                  key={day.value}
                  onClick={() => automation[activeTab].enabled && toggleDay(day.value)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    cursor: automation[activeTab].enabled ? 'pointer' : 'not-allowed',
                    backgroundColor: (automation[activeTab].days || []).includes(day.value) ? '#0f172a' : '#f1f5f9',
                    color: (automation[activeTab].days || []).includes(day.value) ? 'white' : '#64748b',
                    transition: 'all 0.2s',
                    opacity: automation[activeTab].enabled ? 1 : 0.5
                  }}
                  title={day.label}
                >
                  {day.label[0]}
                </div>
              ))}
            </div>
          </Form.Group>

          {activeTab === 'late' && (
            <>
              <hr className="my-4" style={{ opacity: 0.1 }} />
              <Form.Group className="mb-4">
                <Form.Label className="small fw-bold text-dark text-uppercase mb-3 d-flex align-items-center">
                  <i className="fa fa-building-o me-2 text-primary"></i> Section-Specific Timings
                </Form.Label>
                
                {/* Rule Entry */}
                <div className="d-flex gap-2 mb-3 bg-light p-3 rounded-3 border">
                  <div style={{ flex: 2 }}>
                    <Select
                      name="ruleSection"
                      value={newRule.section ? { value: newRule.section, label: newRule.section } : null}
                      onChange={(opt) => setNewRule({ ...newRule, section: opt ? opt.value : '' })}
                      options={masterData.sections.map(s => ({ value: s.name, label: s.name }))}
                      placeholder="Select Section"
                      styles={{
                        control: (base) => ({ ...base, minHeight: '34px', fontSize: '0.8rem', borderRadius: '6px' })
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Form.Control 
                      type="time"
                      className="form-control-sm h-100"
                      value={newRule.time}
                      onChange={(e) => setNewRule({ ...newRule, time: e.target.value })}
                    />
                  </div>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={addSectionRule}
                    disabled={!newRule.section || !automation.late.enabled}
                  >
                    <i className="fa fa-plus"></i>
                  </Button>
                </div>

                {/* Rules List */}
                <div className="section-rules-list">
                  {(automation.late.sectionRules || []).map((rule, idx) => (
                    <div key={idx} className="d-flex align-items-center justify-content-between p-2 mb-2 rounded border-bottom bg-white shadow-xs">
                      <div className="small fw-bold text-dark">{rule.section}</div>
                      <div className="d-flex align-items-center">
                        <Badge bg="info" className="me-3" style={{ fontSize: '0.75rem' }}>{rule.time}</Badge>
                        <i 
                          className="fa fa-times-circle text-danger cursor-pointer" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => automation.late.enabled && removeSectionRule(idx)}
                        ></i>
                      </div>
                    </div>
                  ))}
                  {(automation.late.sectionRules || []).length === 0 && (
                    <div className="text-center py-2 text-muted small italic">No specific section rules added yet.</div>
                  )}
                </div>
              </Form.Group>
            </>
          )}

          <div className="mt-4">
            <div className="bg-light p-3 rounded-3 border mb-3">
              <h6 className="small fw-bold text-dark text-uppercase mb-2 d-flex align-items-center">
                <i className="fa fa-info-circle me-2 text-info"></i> Holiday Policy
              </h6>
              <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                Automation will <strong>automatically skip</strong> any days registered in the Holiday Management system.
              </p>
              {holidays.filter(h => new Date(h.HRH_FROM_DT) >= new Date()).length > 0 && (
                <div className="mt-2 pt-2 border-top">
                  <div className="text-dark fw-bold mb-1" style={{ fontSize: '0.7rem' }}>Upcoming Holidays:</div>
                  <div className="d-flex flex-wrap gap-1">
                    {holidays
                      .filter(h => new Date(h.HRH_FROM_DT) >= new Date())
                      .slice(0, 3)
                      .map((h, i) => (
                        <Badge key={i} bg="white" text="dark" className="border fw-normal" style={{ fontSize: '0.65rem' }}>
                          {h.HRH_DESC} ({new Date(h.HRH_FROM_DT).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
                        </Badge>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            <Button 
              variant="dark" 
              className="w-100 fw-bold py-2 shadow-sm"
              style={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }}
              onClick={handleModalSave}
              disabled={loading}
            >
              {loading ? <Spinner size="sm" /> : <><i className="fa fa-save me-2"></i> Save Automation Settings</>}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default AbsenteeNotification;
