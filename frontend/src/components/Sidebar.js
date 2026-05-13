import React from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';
// this
function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse, user }) {
  const location = useLocation();

  const isActive = (path) => {
    try {
      return location.pathname === path;
    } catch (e) {
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === 'admin';
  const permissions = user?.permissions || [];

  const hasAccess = (pageId) => {
    if (isAdmin) return true;
    return permissions.includes(pageId);
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : 'closed'} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-icon">S</div>
        <h5 className="brand-name">SYNERGY HRPAY</h5>
        <button className="collapse-btn ms-auto d-none d-md-flex" onClick={onToggleCollapse}>
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      <div className="sidebar-nav mt-3">
        <Link to="/" onClick={onClose} title="Dashboard" className={`nav-link-custom ${isActive('/') ? 'active' : ''}`}>
          <span className="nav-icon"><i className="fa fa-th-large"></i></span>
          <span className="nav-text">Dashboard</span>
        </Link>

        {(hasAccess('report-cost-allocation') || hasAccess('report-cost-allocation-month') || hasAccess('report-cost-allocation-filter') || hasAccess('report-annual-leave-exit-permit') || hasAccess('report-attendance-register') || hasAccess('report-attendance-register-all') || hasAccess('report-employee-site-location')) && (
          <>
            <div className="nav-section-label">Reports</div>
            {hasAccess('report-cost-allocation') && (
              <Link to="/reports/cost-allocation" onClick={onClose} title="Cost Allocation" className={`nav-link-custom ${isActive('/reports/cost-allocation') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-bar-chart"></i></span>
                <span className="nav-text">Cost Allocation</span>
              </Link>
            )}
            
            {hasAccess('report-cost-allocation-filter') && (
              <Link to="/reports/cost-allocation-month-with-filter" onClick={onClose} title="Cost Allocation Filter" className={`nav-link-custom ${isActive('/reports/cost-allocation-month-with-filter') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-filter"></i></span>
                <span className="nav-text">Cost Allocation Filter</span>
              </Link>
            )}
            {hasAccess('report-annual-leave-exit-permit') && (
              <Link to="/reports/annual-leave-exit-permit" onClick={onClose} title="Annual Leave Exit Permit" className={`nav-link-custom ${isActive('/reports/annual-leave-exit-permit') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-plane"></i></span>
                <span className="nav-text">Annual Leave Exit Permit</span>
              </Link>
            )}
            {hasAccess('report-attendance-register') && (
              <Link to="/reports/attendance-register" onClick={onClose} title="Attendance Register" className={`nav-link-custom ${isActive('/reports/attendance-register') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-clock-o"></i></span>
                <span className="nav-text">Attendance Register</span>
              </Link>
            )}
            {hasAccess('report-attendance-register-all') && (
              <Link to="/reports/attendance-register-all" onClick={onClose} title="Attendance Register All" className={`nav-link-custom ${isActive('/reports/attendance-register-all') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-clock-o"></i></span>
                <span className="nav-text">Attendance Register All</span>
              </Link>
            )}
            {hasAccess('report-employee-site-location') && (
              <Link to="/reports/employee-site-location" onClick={onClose} title="Employee Site Location" className={`nav-link-custom ${isActive('/reports/employee-site-location') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-map-marker"></i></span>
                <span className="nav-text">Employee Site Location</span>
              </Link>
            )}
          </>
        )}
        
        {(hasAccess('user-roles') || hasAccess('employees')) && (
          <>
            <div className="nav-section-label">Management</div>
            {hasAccess('user-roles') && (
              <Link to="/user-roles" onClick={onClose} title="User Roles" className={`nav-link-custom ${isActive('/user-roles') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-shield"></i></span>
                <span className="nav-text">User Roles</span>
              </Link>
            )}
            {hasAccess('employees') && (
              <Link to="/employees" onClick={onClose} title="Employees" className={`nav-link-custom ${isActive('/employees') ? 'active' : ''}`}>
                <span className="nav-icon"><i className="fa fa-users"></i></span>
                <span className="nav-text">Employees</span>
              </Link>
            )}
          </>
        )}
      </div>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">{user?.name?.charAt(0).toUpperCase() || 'U'}</div>
          {!isCollapsed && (
            <div className="user-details">
              <div className="user-name">{user?.name || 'User'}</div>
              <div className="user-role">{user?.role || 'Staff'}</div>
            </div>
          )}
          {!isCollapsed && (
            <button className="logout-mini-btn ms-auto" onClick={handleLogout} title="Logout">
              <i className="fa fa-sign-out"></i>
            </button>
          )}
        </div>
        {!isCollapsed && (
          <div className="sidebar-powered-by">
            Powered by  synergy
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
