import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Spinner, Alert, Badge, Form, InputGroup } from 'react-bootstrap';
import { holidayAPI } from '../services/api';
import '../PremiumTheme.css';

function Holidays() {
  const [loading, setLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState({ show: false, message: '', variant: 'success' });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await holidayAPI.getAll();
      setHolidays(response.data || []);
    } catch (err) {
      console.error('Error fetching holidays:', err);
      setStatus({ show: true, message: 'Failed to load holidays.', variant: 'danger' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const filteredHolidays = holidays.filter(h => 
    (h.HRH_DESC || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.HRH_CODE || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const upcomingHolidays = holidays.filter(h => new Date(h.HRH_FROM_DT) >= new Date()).length;
  const ramadanHolidays = holidays.filter(h => h.HRH_RAMADAN).length;

  return (
    <div className="page-wrapper">
      <div className="page-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold text-dark mb-1">
              <div className="icon-box-sm bg-primary text-white d-inline-flex align-items-center justify-content-center me-2" style={{ width: '32px', height: '32px', borderRadius: '6px' }}>
                <i className="fa fa-calendar-check-o" style={{ fontSize: '0.9rem' }}></i>
              </div>
              Holiday Management
            </h4>
            <p className="text-muted small">View and manage company holidays and observances</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-primary fw-bold" onClick={fetchHolidays} disabled={loading}>
              <i className={`fa fa-refresh me-1 ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>
      </div>

      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px', borderLeft: '4px solid #0d6efd' }}>
            <Card.Body className="d-flex align-items-center p-3">
              <div className="rounded-circle bg-light-primary p-3 me-3" style={{ backgroundColor: '#e7f1ff', color: '#0d6efd' }}>
                <i className="fa fa-calendar fa-lg"></i>
              </div>
              <div>
                <h6 className="text-muted small fw-bold mb-0 text-uppercase">Total Holidays</h6>
                <h4 className="fw-bold mb-0">{holidays.length}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px', borderLeft: '4px solid #198754' }}>
            <Card.Body className="d-flex align-items-center p-3">
              <div className="rounded-circle bg-light-success p-3 me-3" style={{ backgroundColor: '#e6f4ea', color: '#198754' }}>
                <i className="fa fa-clock-o fa-lg"></i>
              </div>
              <div>
                <h6 className="text-muted small fw-bold mb-0 text-uppercase">Upcoming</h6>
                <h4 className="fw-bold mb-0">{upcomingHolidays}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100" style={{ borderRadius: '12px', borderLeft: '4px solid #fd7e14' }}>
            <Card.Body className="d-flex align-items-center p-3">
              <div className="rounded-circle bg-light-warning p-3 me-3" style={{ backgroundColor: '#fff3e0', color: '#fd7e14' }}>
                <i className="fa fa-moon-o fa-lg"></i>
              </div>
              <div>
                <h6 className="text-muted small fw-bold mb-0 text-uppercase">Ramadan Timing</h6>
                <h4 className="fw-bold mb-0">{ramadanHolidays}</h4>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {status.show && (
        <Alert variant={status.variant} onClose={() => setStatus({ ...status, show: false })} dismissible>
          {status.message}
        </Alert>
      )}

      <Card className="premium-card border-0 shadow-sm overflow-hidden">
        <div className="p-3 bg-white border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <h6 className="fw-bold mb-0 small text-uppercase d-flex align-items-center">
            <i className="fa fa-list me-2 text-primary"></i> 
            Holiday Schedule
          </h6>
          
          <div style={{ minWidth: '300px' }}>
            <InputGroup size="sm">
              <InputGroup.Text className="bg-light border-end-0">
                <i className="fa fa-search text-muted"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by code or description..."
                className="bg-light border-start-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </div>
        </div>
        
        <div className="table-responsive">
          <Table hover className="mb-0 align-middle">
            <thead className="bg-light">
              <tr className="small text-uppercase text-muted" style={{ fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                <th style={{ width: '60px' }} className="ps-4">#</th>
                <th style={{ width: '100px' }}>Code</th>
                <th>Description</th>
                <th style={{ width: '160px' }}>From Date</th>
                <th style={{ width: '160px' }}>To Date</th>
                <th className="text-center" style={{ width: '80px' }}>Hrs</th>
                <th className="text-center" style={{ width: '120px' }}>Ramadan</th>
              </tr>
            </thead>
            <tbody className="border-top-0">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center p-5">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="mt-2 text-muted small">Loading holiday schedule...</p>
                  </td>
                </tr>
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-5">
                    <div className="text-muted mb-2"><i className="fa fa-calendar-o fa-2x opacity-25"></i></div>
                    <div className="text-muted small">No holidays found matching your search.</div>
                  </td>
                </tr>
              ) : (
                filteredHolidays.map((holiday, index) => (
                  <tr key={holiday.HRH_SLNO} className="hover-row">
                    <td className="ps-4 small text-muted">{index + 1}</td>
                    <td>
                      <Badge bg="light" text="dark" className="border px-2 py-1 fw-bold" style={{ fontSize: '0.75rem' }}>
                        {holiday.HRH_CODE}
                      </Badge>
                    </td>
                    <td>
                      <div className="fw-bold text-dark mb-0" style={{ fontSize: '0.85rem' }}>
                        {holiday.HRH_DESC || <span className="text-muted italic small fw-normal">No description provided</span>}
                      </div>
                    </td>
                    <td>
                      <span className="small fw-bold text-dark">
                        <i className="fa fa-calendar-o me-1 text-primary" style={{ fontSize: '0.8rem' }}></i>
                        {formatDate(holiday.HRH_FROM_DT)}
                      </span>
                    </td>
                    <td>
                      <span className="small fw-bold text-dark">
                        <i className="fa fa-calendar-o me-1 text-secondary" style={{ fontSize: '0.8rem' }}></i>
                        {formatDate(holiday.HRH_TO_DATE)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1" style={{ fontSize: '0.75rem' }}>
                        {holiday.HRH_NORMAL_HRS || '8'} hrs
                      </span>
                    </td>
                    <td className="text-center">
                      {holiday.HRH_RAMADAN ? (
                        <Badge bg="warning" text="dark" className="rounded-pill px-3" style={{ fontSize: '0.65rem' }}>
                          <i className="fa fa-moon-o me-1"></i> YES
                        </Badge>
                      ) : (
                        <Badge bg="light" text="muted" className="rounded-pill px-3 border" style={{ fontSize: '0.65rem' }}>
                          NO
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        <div className="p-3 bg-light border-top d-flex justify-content-between align-items-center">
          <div className="small text-muted">
            Showing {filteredHolidays.length} of {holidays.length} holidays
          </div>
          {searchTerm && (
            <button className="btn btn-link btn-sm text-decoration-none p-0" onClick={() => setSearchTerm('')}>
              Clear Search
            </button>
          )}
        </div>
      </Card>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-light-primary { background-color: #e7f1ff; }
        .bg-light-success { background-color: #e6f4ea; }
        .bg-light-warning { background-color: #fff3e0; }
        .hover-row:hover { background-color: #f8f9fa; }
        .italic { font-style: italic; }
      `}} />
    </div>
  );
}

export default Holidays;
