import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '../services/api';
import socketService from '../services/socket';
import '../PremiumTheme.css';
// this
function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalPayroll: 0,
    presentToday: 0,
    absentToday: 0,
    onVacationToday: 0,
    pendingLeaves: 0,
    totalAttendance: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const CHART_COLORS = {
    'Present': '#10b981', // Emerald
    'Absent': '#f43f5e',  // Rose
    'Vacation': '#3b82f6', // Blue
    'On Leave': '#8b5cf6', // Violet
    'Holiday': '#f59e0b',  // Amber
    'Unknown': '#94a3b8'   // Slate
  };

  const getAttendanceChartData = () => {
    return [
      { name: 'Present', value: stats.presentToday || 0 },
      { name: 'Absent', value: stats.absentToday || 0 },
      { name: 'Vacation', value: stats.onVacationToday || 0 }
    ].filter(item => item.value > 0);
  };

  const fetchStats = useCallback(async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
      if (response.data.activities) {
        setActivities(response.data.activities);
      }
      setError('');
    } catch (err) {
      setError('Failed to fetch dashboard statistics. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Get user from localStorage
    const userData = JSON.parse(localStorage.getItem('user') || 'null');
    setUser(userData);

    fetchStats();

    // Connect to WebSocket
    socketService.connect();

    // Listen for real-time updates
    const handleStatsUpdate = (data) => {
      console.log('Real-time stats update:', data);
      if (data.stats) {
        setStats(prev => ({ ...prev, ...data.stats }));
      }
      if (data.activity) {
        setActivities(prev => [data.activity, ...prev].slice(0, 10));
      }
      // Alternatively, just re-fetch to ensure consistency
      // fetchStats();
    };

    socketService.on('dashboard_update', handleStatsUpdate);
    socketService.on('employee_added', fetchStats);
    socketService.on('attendance_marked', fetchStats);
    socketService.on('leave_requested', fetchStats);

    return () => {
      socketService.off('dashboard_update', handleStatsUpdate);
      socketService.off('employee_added', fetchStats);
      socketService.off('attendance_marked', fetchStats);
      socketService.off('leave_requested', fetchStats);
    };
  }, [fetchStats]);

  const hasAccess = (pageId) => {
    if (!user) return false;
    if (user.role?.toLowerCase() === 'admin') return true;
    return user.permissions?.includes(pageId);
  };

  if (loading) {
    return (
      <div className="premium-container d-flex justify-content-center align-items-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="premium-title">Dashboard</h1>
            <span className="badge-premium badge-premium-green" style={{ fontSize: '0.65rem' }}>
              <span className="me-1">●</span> Live
            </span>
          </div>
          <p className="premium-subtitle">Welcome to SYNERGY HRPAY Management System</p>
        </div>
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <Row className="g-4">
        <Col xl md={4} sm={6}>
          <div className="premium-card text-center h-100 d-flex flex-column justify-content-center p-3 position-relative overflow-hidden" style={{ minHeight: '180px' }}>
            <div className="position-absolute" style={{ top: '-10px', right: '-10px', opacity: 0.1, fontSize: '4rem', color: 'var(--primary-color)' }}>
              <i className="fa fa-users"></i>
            </div>
            <div className="premium-subtitle mb-2" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>Total Employees</div>
            <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>{stats.totalEmployees}</h2>
            <div className="mt-2" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Personnel</div>
          </div>
        </Col>

        <Col xl md={4} sm={6}>
          <div className="premium-card text-center h-100 d-flex flex-column justify-content-center p-3 position-relative overflow-hidden" style={{ minHeight: '180px' }}>
            <div className="position-absolute" style={{ top: '-10px', right: '-10px', opacity: 0.1, fontSize: '4rem', color: CHART_COLORS.Present }}>
              <i className="fa fa-check-circle"></i>
            </div>
            <div className="premium-subtitle mb-2" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>Present Today</div>
            <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 800, color: CHART_COLORS.Present }}>{stats.presentToday}</h2>
            <div className="mt-2" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Tracking</div>
          </div>
        </Col>

        <Col xl md={4} sm={6}>
          <div className="premium-card text-center h-100 d-flex flex-column justify-content-center p-3 position-relative overflow-hidden" style={{ minHeight: '180px' }}>
            <div className="position-absolute" style={{ top: '-10px', right: '-10px', opacity: 0.1, fontSize: '4rem', color: CHART_COLORS.Absent }}>
              <i className="fa fa-times-circle"></i>
            </div>
            <div className="premium-subtitle mb-2" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>Absent Today</div>
            <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 800, color: CHART_COLORS.Absent }}>{stats.absentToday}</h2>
            <div className="mt-2" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance Tracking</div>
          </div>
        </Col>

        <Col xl md={4} sm={6}>
          <div className="premium-card text-center h-100 d-flex flex-column justify-content-center p-3 position-relative overflow-hidden" style={{ minHeight: '180px' }}>
            <div className="position-absolute" style={{ top: '-10px', right: '-10px', opacity: 0.1, fontSize: '4rem', color: '#3b82f6' }}>
              <i className="fa fa-plane"></i>
            </div>
            <div className="premium-subtitle mb-2" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>On Vacation</div>
            <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 800, color: '#3b82f6' }}>{stats.onVacationToday}</h2>
            <div className="mt-2" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Currently on leave</div>
          </div>
        </Col>

        <Col xl md={4} sm={6}>
          <div className="premium-card h-100 d-flex flex-column p-2 position-relative overflow-hidden" style={{ minHeight: '180px' }}>
            <div className="text-center mb-1">
              <div className="premium-subtitle" style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>Analytics</div>
            </div>
            <div className="flex-grow-1" style={{ width: '100%', minHeight: '100px' }}>
              {getAttendanceChartData().length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getAttendanceChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={5}
                      cornerRadius={4}
                      dataKey="value"
                    >
                      {getAttendanceChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.name]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.65rem' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted small" style={{ fontSize: '0.6rem' }}>
                  No data
                </div>
              )}
            </div>
            <div className="text-center mt-1">
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Summary View</div>
            </div>
          </div>
        </Col>
      </Row>

      <Row className="mt-2">
        <Col md={8}>
          <div className="premium-card" style={{ minHeight: '450px' }}>
            <h6 className="mb-4" style={{ fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Recent Activity</h6>
            {activities.length === 0 ? (
              <div className="empty-state">
                <i className="fa fa-bell-o empty-state-icon" style={{ fontSize: '2rem', color: '#94a3b8', marginBottom: '1rem', display: 'block' }}></i>
                <p style={{ fontSize: '0.8125rem' }}>No recent activities to show.</p>
              </div>
            ) : (
              <div className="activity-list">
                {activities.map((activity, index) => (
                  <div key={index} className="activity-item d-flex align-items-start gap-3 mb-3 pb-3 border-bottom">
                    <div className="activity-icon-wrapper" style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}>
                      {activity.type === 'employee' ? <i className="fa fa-user"></i> :
                        activity.type === 'payroll' ? <i className="fa fa-money"></i> :
                          activity.type === 'attendance' ? <i className="fa fa-calendar-check-o"></i> : <i className="fa fa-calendar-minus-o"></i>}
                    </div>
                    <div className="activity-details flex-grow-1">
                      <div className="activity-text fw-medium" style={{ fontSize: '0.8125rem' }}>{activity.message}</div>
                      <div className="activity-time small text-muted" style={{ fontSize: '0.7rem' }}>
                        {new Date(activity.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>
        <Col md={4}>
          <div className="premium-card" style={{ minHeight: '450px' }}>
            <h6 className="mb-4" style={{ fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Quick Links</h6>
            <div className="d-grid gap-2">
              {hasAccess('employees') && (
                <Link to="/employees" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                    <i className="fa fa-users"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">Employee Directory</div>
                    <div className="text-muted small">Manage all staff records</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}

              {hasAccess('report-cost-allocation') && (
                <Link to="/reports/cost-allocation" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}>
                    <i className="fa fa-bar-chart"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">Cost Allocation</div>
                    <div className="text-muted small">Standard allocation report</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}

              {hasAccess('report-cost-allocation-filter') && (
                <Link to="/reports/cost-allocation-month-with-filter" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                    <i className="fa fa-filter"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">Cost Allocation Filter</div>
                    <div className="text-muted small">Advanced filtered report</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}

              {hasAccess('report-attendance-register') && (
                <Link to="/reports/attendance-register" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                    <i className="fa fa-calendar-check-o"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">Attendance Register</div>
                    <div className="text-muted small">Daily attendance summary</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}

              {hasAccess('report-attendance-register-all') && (
                <Link to="/reports/attendance-register-all" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                    <i className="fa fa-clock-o"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">Attendance Register All</div>
                    <div className="text-muted small">Complete attendance records</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}

              {hasAccess('settings') && (
                <Link to="/settings" className="quick-link-item">
                  <div className="quick-link-icon" style={{ backgroundColor: '#f8fafc', color: '#64748b' }}>
                    <i className="fa fa-cog"></i>
                  </div>
                  <div className="quick-link-text">
                    <div className="fw-bold">System Settings</div>
                    <div className="text-muted small">Configure preferences</div>
                  </div>
                  <i className="fa fa-chevron-right ms-auto text-muted small"></i>
                </Link>
              )}
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default Home;
