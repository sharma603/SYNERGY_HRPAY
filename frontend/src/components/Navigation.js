import React, { useState, useEffect } from 'react';
import { Navbar, Container } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import socketService from '../services/socket';
import './Navigation.css';

function Navigation({ onToggleSidebar, user }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const SEARCHABLE_PAGES = [
    { title: 'Dashboard', path: '/', category: 'Page', icon: 'fa-th-large' },
    { title: 'Employees', path: '/employees', category: 'Management', icon: 'fa-users' },
    { title: 'User Roles', path: '/user-roles', category: 'Management', icon: 'fa-shield' },
    { title: 'Cost Allocation', path: '/reports/cost-allocation', category: 'Report', icon: 'fa-bar-chart' },
    { title: 'Cost Allocation Month', path: '/reports/cost-allocation-month', category: 'Report', icon: 'fa-calendar' },
    { title: 'Cost Allocation Filter', path: '/reports/cost-allocation-month-with-filter', category: 'Report', icon: 'fa-filter' },
    { title: 'Annual Leave Exit Permit', path: '/reports/annual-leave-exit-permit', category: 'Report', icon: 'fa-plane' },
    { title: 'Attendance Register', path: '/reports/attendance-register', category: 'Report', icon: 'fa-clock-o' },
    { title: 'Employee Site Location', path: '/reports/employee-site-location', category: 'Report', icon: 'fa-map-marker' },
    { title: 'My Profile', path: '/profile', category: 'User', icon: 'fa-user-o' },
    { title: 'Settings', path: '/settings', category: 'User', icon: 'fa-cog' }
  ];

  const filteredResults = searchQuery.trim() === '' 
    ? [] 
    : SEARCHABLE_PAGES.filter(page => 
        page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleSearchSelect = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.search-bar')) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  useEffect(() => {
    socketService.connect();

    const handleNewNotification = (data) => {
      if (data.activity || data.message) {
        setNotifications(prev => [{
          id: Date.now(),
          message: data.message || data.activity?.message,
          time: new Date(),
          unread: true
        }, ...prev].slice(0, 5));
      }
    };

    socketService.on('dashboard_update', handleNewNotification);
    socketService.on('notification', handleNewNotification);

    return () => {
      socketService.off('dashboard_update', handleNewNotification);
      socketService.off('notification', handleNewNotification);
    };
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setShowNotifications(false);
  };

  return (
    <Navbar bg="white" expand="lg" sticky="top" className="navbar-custom shadow-sm py-2">
      <Container fluid className="px-4">
        <button 
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn me-3"
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar"
        >
          <i className="fa fa-bars"></i>
        </button>
        <Navbar.Brand href="/" className="fw-bold d-flex align-items-center">
          <span className="brand-text-primary">SYNERGY</span>
          <span className="brand-text-secondary ms-1">HRPAY</span>
        </Navbar.Brand>
        
        <div className="ms-auto d-flex align-items-center">
          <div className="search-bar d-none d-md-flex me-3">
            <i className="fa fa-search search-icon"></i>
            <input 
              type="text" 
              placeholder="Quick search..." 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => searchQuery.trim() !== '' && setShowSearchResults(true)}
            />

            {showSearchResults && searchQuery.trim() !== '' && (
              <div className="search-results-dropdown shadow-lg">
                {filteredResults.length > 0 ? (
                  filteredResults.map((result, idx) => (
                    <button 
                      key={idx} 
                      className="search-result-item"
                      onClick={() => handleSearchSelect(result.path)}
                    >
                      <div className="search-result-icon">
                        <i className={`fa ${result.icon}`}></i>
                      </div>
                      <div className="search-result-info">
                        <span className="search-result-title">{result.title}</span>
                        <span className="search-result-category">{result.category}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="search-no-results">
                    <i className="fa fa-frown-o fa-2x mb-2 d-block opacity-50"></i>
                    No pages found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="position-relative">
            <button 
              className="notification-btn me-3" 
              onClick={() => unreadCount > 0 ? setShowNotifications(!showNotifications) : null}
            >
              <i className="fa fa-bell-o notification-icon"></i>
              {unreadCount > 0 && <span className="notification-badge"></span>}
            </button>

            {showNotifications && notifications.length > 0 && (
              <div className="notification-dropdown shadow-lg">
                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <span className="fw-bold small">Notifications</span>
                  <button className="btn btn-link btn-sm p-0 text-decoration-none small" onClick={markAsRead}>
                    Mark all read
                  </button>
                </div>
                <div className="notification-list">
                  {notifications.map(n => (
                    <div key={n.id} className={`notification-item p-3 border-bottom ${n.unread ? 'bg-light' : ''}`}>
                      <div className="small mb-1">{n.message}</div>
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="v-divider me-3"></div>
          
          <div className="user-profile-section position-relative">
            <button 
              className="user-profile-btn d-flex align-items-center"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="user-avatar-mini me-2">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="user-info-mini d-none d-lg-block text-start">
                <div className="user-name-mini">{user?.name || 'User'}</div>
                <div className="user-role-mini text-muted">{user?.role || 'Staff'}</div>
              </div>
              <i className={`fa fa-chevron-${showUserMenu ? 'up' : 'down'} ms-2 user-menu-chevron`}></i>
            </button>

            {showUserMenu && (
              <div className="user-menu-dropdown shadow-lg">
                <div className="user-menu-header px-3 py-3 border-bottom bg-light">
                  <div className="fw-bold text-primary">{user?.name}</div>
                  <div className="text-muted small">Employee ID: {user?.id}</div>
                </div>
                <button className="user-menu-item" onClick={() => { setShowUserMenu(false); navigate('/profile'); }}>
                  <i className="fa fa-user-o me-2"></i> My Profile
                </button>
                <button className="user-menu-item" onClick={() => { setShowUserMenu(false); navigate('/settings'); }}>
                  <i className="fa fa-cog me-2"></i> Settings
                </button>
                <div className="border-top mt-1">
                  <button className="user-menu-item text-danger" onClick={handleLogout}>
                    <i className="fa fa-sign-out me-2"></i> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Navbar>
  );
}

export default Navigation;
