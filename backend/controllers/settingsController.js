const fs = require('fs');
const path = require('path');
const { initScheduler } = require('../utils/scheduler');

const SETTINGS_PATH = path.join(__dirname, '../config/notification_settings.json');

const getSettings = (req, res) => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
            return res.json(settings);
        }
        res.json({
            absent: { enabled: false, time: '10:00', subject: '', message: '' },
            late: { enabled: false, time: '09:00', subject: '', message: '' }
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load settings' });
    }
};

const updateSettings = (req, res) => {
    try {
        const { absent, late } = req.body;
        const settings = { absent, late };
        
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        
        // Restart the scheduler with new settings
        initScheduler();
        
        res.json({ message: 'Settings updated and scheduler restarted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
};

module.exports = { getSettings, updateSettings };
