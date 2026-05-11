import React, { useState, useEffect } from 'react';
import '../PremiumTheme.css';
import './CostAllocationMonth.css';

function Settings() {
  const [settings, setSettings] = useState({
    emailNotifications: true,
    desktopAlerts: true,
    themeMode: 'Light',
    language: 'English',
    autoSave: true
  });

  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));
    
    // Feedback
    if (key === 'autoSave') {
      alert(`Auto-Save ${newSettings[key] ? 'Enabled' : 'Disabled'}`);
    }
  };

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('appSettings', JSON.stringify(newSettings));

    // Special logic for theme
    if (key === 'themeMode') {
      applyTheme(value);
    }
  };

  const applyTheme = (mode) => {
    if (mode === 'Dark Mode') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  return (
    <div className="premium-container">
      <div className="premium-header">
        <div>
          <h1 className="premium-title">Settings</h1>
          <p className="premium-subtitle">Configure your application preferences and system behavior</p>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-6">
          <div className="premium-card h-100">
            <h5 className="section-title mb-4 pb-2 border-bottom">
              <i className="fa fa-bell me-2 text-primary"></i> Notifications
            </h5>
            <div className="settings-item mb-3 d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">Email Notifications</div>
                <div className="text-muted small">Receive daily summary via email</div>
              </div>
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={settings.emailNotifications}
                  onChange={() => handleToggle('emailNotifications')}
                />
              </div>
            </div>
            <div className="settings-item mb-3 d-flex justify-content-between align-items-center">
              <div>
                <div className="fw-bold">Desktop Alerts</div>
                <div className="text-muted small">Show real-time browser notifications</div>
              </div>
              <div className="form-check form-switch">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={settings.desktopAlerts}
                  onChange={() => handleToggle('desktopAlerts')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="premium-card h-100">
            <h5 className="section-title mb-4 pb-2 border-bottom">
              <i className="fa fa-eye me-2 text-primary"></i> Appearance
            </h5>
            <div className="settings-item mb-3">
              <label className="filter-label mb-2">Theme Mode</label>
              <select 
                className="form-select form-select-sm"
                value={settings.themeMode}
                onChange={(e) => handleChange('themeMode', e.target.value)}
              >
                <option>Light</option>
                <option>Dark Mode</option>
                <option>System Preference</option>
              </select>
            </div>
            <div className="settings-item mb-3">
              <label className="filter-label mb-2">Language</label>
              <select 
                className="form-select form-select-sm"
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option>English</option>
                <option>Arabic</option>
                <option>French</option>
              </select>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="premium-card h-100">
            <h5 className="section-title mb-4 pb-2 border-bottom">
              <i className="fa fa-database me-2 text-primary"></i> Data Management
            </h5>
            <div className="settings-item mb-3">
              <div className="fw-bold">Auto-Save</div>
              <div className="text-muted small">Automatically save report drafts</div>
              <div className="form-check form-switch mt-2">
                <input 
                  className="form-check-input" 
                  type="checkbox" 
                  checked={settings.autoSave}
                  onChange={() => handleToggle('autoSave')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="premium-card h-100">
            <h5 className="section-title mb-4 pb-2 border-bottom">
              <i className="fa fa-shield me-2 text-primary"></i> Privacy
            </h5>
            <div className="settings-item mb-3">
              <div className="fw-bold">Two-Factor Authentication</div>
              <div className="text-muted small">Add an extra layer of security</div>
              <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => alert('2FA Setup Coming Soon')}>
                Enable 2FA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
