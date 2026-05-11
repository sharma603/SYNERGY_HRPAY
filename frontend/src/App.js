import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Employees from './pages/Employees';
import CostAllocationReport from './pages/CostAllocationReport';
import CostAllocationMonth from './pages/CostAllocationMonth';
import CostAllocationMonth_with_filter from './pages/CostAllocationMonth_with_filter';
import AnnualLeaveExitPermit from './pages/AnnualLeaveExitPermit';
import AttendanceRegister from './pages/AttendanceRegister';
import EmployeeSiteLocation from './pages/EmployeeSiteLocation';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import UserRoles from './pages/UserRoles';

import Login from './pages/Login';
import './App.css';

// Protected Route Component with Role Check
const ProtectedRoute = ({ children, allowedRoles = [], pageId }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token) {
    return <Login />;
  }

  // 1. Admin always has access
  if (user?.role?.toLowerCase() === 'admin') {
    return children;
  }

  // 2. Check page-level permissions if provided
  if (pageId && user?.permissions) {
    if (user.permissions.includes(pageId)) {
      return children;
    }
  }

  // 3. Fallback to role-based check (legacy)
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role?.toLowerCase())) {
    return <Home />; // Redirect to home if role not allowed
  }

  // 4. If pageId is provided but not in user permissions, and user is not admin, redirect
  if (pageId && (!user?.permissions || !user.permissions.includes(pageId))) {
    return <Home />;
  }

  return children;
};

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Apply saved theme on startup
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const { themeMode } = JSON.parse(savedSettings);
      if (themeMode === 'Dark Mode') {
        document.body.classList.add('dark-theme');
      }
    }
  }, []);
  
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(!sidebarOpen);
    } else {
      // On desktop, if it's completely closed, open it first. 
      // If it's open, then toggle the collapsed state.
      if (!sidebarOpen) {
        setSidebarOpen(true);
        setSidebarCollapsed(false);
      } else {
        setSidebarCollapsed(!sidebarCollapsed);
      }
    }
  };

  // If not logged in, show only Login page
  if (!token) {
    return (
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Login />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true, v7_fetcherPersist: true, v7_normalizeFormMethod: true }}>
      <div className={`app-wrapper ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar 
          isOpen={sidebarOpen} 
          isCollapsed={sidebarCollapsed}
          onClose={() => setSidebarOpen(false)} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          user={user}
        />
        <div className="main-wrapper">
          <Navigation onToggleSidebar={toggleSidebar} user={user} />
          <Container fluid className="main-content">
            <Routes>
              <Route path="/" element={<ProtectedRoute pageId="dashboard"><Home /></ProtectedRoute>} />
              <Route path="/employees" element={<ProtectedRoute pageId="employees" allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
              <Route path="/reports/cost-allocation" element={<ProtectedRoute pageId="report-cost-allocation" allowedRoles={['admin']}><CostAllocationReport /></ProtectedRoute>} />
              <Route path="/reports/cost-allocation-month" element={<ProtectedRoute pageId="report-cost-allocation-month" allowedRoles={['admin']}><CostAllocationMonth /></ProtectedRoute>} />
              <Route path="/reports/cost-allocation-month-with-filter" element={<ProtectedRoute pageId="report-cost-allocation-filter" allowedRoles={['admin']}><CostAllocationMonth_with_filter /></ProtectedRoute>} />
              <Route path="/reports/annual-leave-exit-permit" element={<ProtectedRoute pageId="report-annual-leave-exit-permit" allowedRoles={['admin']}><AnnualLeaveExitPermit /></ProtectedRoute>} />
              <Route path="/reports/attendance-register" element={<ProtectedRoute pageId="report-attendance-register" allowedRoles={['admin']}><AttendanceRegister /></ProtectedRoute>} />
              <Route path="/reports/employee-site-location" element={<ProtectedRoute pageId="report-employee-site-location" allowedRoles={['admin']}><EmployeeSiteLocation /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute pageId="settings"><Settings /></ProtectedRoute>} />
              <Route path="/user-roles" element={<ProtectedRoute pageId="user-roles" allowedRoles={['admin']}><UserRoles /></ProtectedRoute>} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </Container>
        </div>
      </div>
    </Router>
  );
}

export default App;
