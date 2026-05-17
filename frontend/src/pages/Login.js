import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';
// this
function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Force page reload to refresh App state or navigate
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <i className="fa fa-shield"></i>
            </div>
            <h1 className="login-title">SYNERGY HRPAY</h1>
            <p className="login-subtitle">Secure access to HR & Payroll Management</p>
          </div>

          {error && (
            <div className="login-error">
              <i className="fa fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group-premium">
              <label className="form-label-premium">Username</label>
              <div className="form-input-wrapper">
                <i className="fa fa-user input-icon"></i>
                <input
                  type="text"
                  name="username"
                  className="form-input-premium"
                  placeholder="Enter your username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group-premium">
              <label className="form-label-premium">Password</label>
              <div className="form-input-wrapper">
                <i className="fa fa-lock input-icon"></i>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className="form-input-premium"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button 
                  type="button" 
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="login-actions">
              <div className="form-check-premium">
                <input type="checkbox" id="remember" className="checkbox-premium" />
                <label htmlFor="remember">Remember me</label>
              </div>
              <a href="#forgot" className="forgot-link">Forgot password?</a>
            </div>

            <button 
              type="submit" 
              className="btn-login-premium"
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner-border spinner-border-sm me-2"></span>Authenticating...</>
              ) : (
                <>Sign In <i className="fa fa-arrow-right ms-2"></i></>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>&copy; 2026 Synergy IT Solutions. All rights reserved.</p>
            <p className="powered-by">Powered by Synergy IT Solutions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
