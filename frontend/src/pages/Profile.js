import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import '../PremiumTheme.css';
import './CostAllocationMonth.css'; // Reusing some styles

function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: ''
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (storedUser) {
      setUser(storedUser);
      setFormData({
        name: storedUser.name || '',
        email: storedUser.email || '',
        phone: storedUser.phone || '',
        department: storedUser.department || 'N/A',
        designation: storedUser.designation || 'N/A'
      });
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError('');
  };

  const handleSave = async () => {
    try {
      await authAPI.updateProfile({
        userId: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });

      // Update local storage and state
      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }

    try {
      await authAPI.updatePassword({
        userId: user.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to update password');
    }
  };

  if (!user) return <div className="p-5 text-center">Loading...</div>;

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">My Profile</h1>
          <p className="premium-subtitle">Manage your personal information and account settings</p>
        </div>
        <div className="action-buttons">
          {!isEditing ? (
            <button className="btn-premium btn-premium-primary" onClick={() => setIsEditing(true)}>
              <i className="fa fa-pencil me-2"></i> Edit Profile
            </button>
          ) : (
            <div className="d-flex gap-2">
              <button className="btn-premium btn-premium-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button className="btn-premium btn-premium-primary" onClick={handleSave}>
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="row">
        <div className="col-lg-4">
          <div className="premium-card text-center py-5">
            <div className="user-avatar mx-auto mb-3" style={{ width: '120px', height: '120px', fontSize: '3rem' }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <h3 className="fw-bold text-primary mb-1">{user.name}</h3>
            <p className="text-muted mb-3">{user.role?.toUpperCase()}</p>
            <div className="badge bg-light text-primary px-3 py-2 rounded-pill border">
              Employee ID: {user.id}
            </div>
          </div>
          
          <div className="premium-card mt-4">
            <h5 className="section-title mb-3 pb-2 border-bottom text-start">Organization</h5>
            <div className="text-start small">
              <div className="mb-2">
                <span className="text-muted">Department:</span>
                <div className="fw-bold">{user.department || 'N/A'}</div>
              </div>
              <div>
                <span className="text-muted">Designation:</span>
                <div className="fw-bold">{user.designation || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="premium-card">
            <h5 className="section-title mb-4 pb-2 border-bottom">Account Information</h5>
            
            <div className="row g-4">
              <div className="col-md-6">
                <label className="filter-label mb-2">Full Name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="name"
                    className="form-input-premium w-100" 
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                ) : (
                  <div className="fw-bold p-2 bg-light rounded">{user.name}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="filter-label mb-2">Email Address</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    name="email"
                    className="form-input-premium w-100" 
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                ) : (
                  <div className="fw-bold p-2 bg-light rounded">{formData.email || 'Not specified'}</div>
                )}
              </div>

              <div className="col-md-6">
                <label className="filter-label mb-2">Department</label>
                <div className="fw-bold p-2 bg-light rounded">{formData.department}</div>
              </div>

              <div className="col-md-6">
                <label className="filter-label mb-2">Designation</label>
                <div className="fw-bold p-2 bg-light rounded">{formData.designation}</div>
              </div>

              <div className="col-md-6">
                <label className="filter-label mb-2">Phone Number</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    name="phone"
                    className="form-input-premium w-100" 
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                ) : (
                  <div className="fw-bold p-2 bg-light rounded">{formData.phone || 'Not specified'}</div>
                )}
              </div>
            </div>
          </div>

          <div className="premium-card mt-4">
            <h5 className="section-title mb-4 pb-2 border-bottom">Security</h5>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">Password</div>
                <div className="text-muted small">Change your account password</div>
              </div>
              <button className="btn btn-outline-primary btn-sm" onClick={() => setShowPasswordModal(true)}>
                Update Password
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal-backdrop-custom d-flex align-items-center justify-content-center" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050
        }}>
          <div className="premium-card p-4" style={{ width: '100%', maxWidth: '450px' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="mb-0 fw-bold">Update Password</h5>
              <button className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
            </div>
            
            <form onSubmit={handleUpdatePassword}>
              <div className="mb-3">
                <label className="filter-label mb-1">Current Password</label>
                <input 
                  type="password" 
                  name="currentPassword"
                  className="form-input-premium w-100" 
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="filter-label mb-1">New Password</label>
                <input 
                  type="password" 
                  name="newPassword"
                  className="form-input-premium w-100" 
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="filter-label mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  className="form-input-premium w-100" 
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                />
              </div>

              {passwordError && <div className="alert alert-danger py-2 small mb-3">{passwordError}</div>}
              {passwordSuccess && <div className="alert alert-success py-2 small mb-3">{passwordSuccess}</div>}

              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-light" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
