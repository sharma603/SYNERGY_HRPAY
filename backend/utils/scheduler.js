const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getConnection, sql } = require('../config/database');
const nodemailer = require('nodemailer');

const SETTINGS_PATH = path.join(__dirname, '../config/notification_settings.json');

let absentTask = null;
let lateTask = null;

/**
 * Load settings from JSON file
 */
const loadSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
    return { 
        absent: { enabled: false, time: '10:00', days: [1, 2, 3, 4, 5, 6], subject: '', message: '' },
        late: { enabled: false, time: '09:00', days: [1, 2, 3, 4, 5, 6], subject: '', message: '' }
    };
};

/**
 * Core logic to find and notify absentees or late comers
 */
const checkAndNotify = async (type = 'absent') => {
    const settingsAll = loadSettings();
    const settings = settingsAll[type];
    if (!settings || !settings.enabled) return;

    console.log(`[Scheduler] Starting ${type} check: ${new Date().toLocaleString()}`);

    try {
        const pool = await getConnection();
        const today = new Date().toISOString().split('T')[0];

        // 0. Check if today is a holiday
        const holidayCheck = await pool.request()
            .input('today', sql.Date, today)
            .query(`
                SELECT TOP 1 HRH_DESC 
                FROM HRM_HOLIDAY 
                WHERE @today BETWEEN HRH_FROM_DT AND HRH_TO_DATE
            `);

        if (holidayCheck.recordset.length > 0) {
            console.log(`[Scheduler] Today is a holiday (${holidayCheck.recordset[0].HRH_DESC}). Skipping ${type} notifications.`);
            return;
        }

        // 1. Get all active employees with emails and filters
        let query = `
            SELECT 
                e.EMP_Code, 
                e.EMP_Name, 
                ISNULL(e.EMP_EMAIL, ISNULL(u.email, ud.USR_EMAIL_ID)) as email,
                dept.COM_DESC as department,
                sec.COM_DESC as section
            FROM HRM_EMP_MASTER e
            LEFT JOIN Users u ON e.EMP_Code = u.username
            LEFT JOIN USER_DEFINITION ud ON e.EMP_Code = ud.USR_UserID
            LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
            LEFT JOIN COMMONCODES sec ON e.EMP_SECTION_DR = sec.COM_SLNO
            WHERE e.emp_stat_flag = 1 
            AND (e.EMP_EMAIL IS NOT NULL OR u.email IS NOT NULL OR ud.USR_EMAIL_ID IS NOT NULL)
        `;

        if (settings.department) {
            query += ` AND dept.COM_DESC = '${settings.department.replace(/'/g, "''")}'`;
        }
        if (settings.section) {
            query += ` AND sec.COM_DESC = '${settings.section.replace(/'/g, "''")}'`;
        }

        const allEmployeesResult = await pool.request().query(query);
        const allEmployees = allEmployeesResult.recordset;

        // 2. Get today's attendance
        const attendanceRequest = pool.request();
        attendanceRequest.input('fromdate', sql.Date, today);
        attendanceRequest.input('todate', sql.Date, today);
        attendanceRequest.input('designation', sql.NVarChar(sql.MAX), null);
        attendanceRequest.input('department', sql.NVarChar(sql.MAX), null);
        attendanceRequest.input('location', sql.NVarChar(sql.MAX), null);
        attendanceRequest.input('section', sql.NVarChar(sql.MAX), null);
        attendanceRequest.input('empCode', sql.NVarChar(sql.MAX), null);
        attendanceRequest.input('inout', sql.NVarChar(10), null);
        attendanceRequest.input('userId', sql.Int, 1);
        attendanceRequest.input('company', sql.NVarChar(sql.MAX), null);

        const attendanceResult = await attendanceRequest.execute('SynATTENDANCE_REGISTER');
        const attendanceRecords = attendanceResult.recordsets[0] || [];
        
        const attendanceMap = new Map();
        attendanceRecords.forEach(record => {
            if (record.RAW_DIRECTION === 'IN') {
                if (!attendanceMap.has(record.RAW_EMPCODE) || record.TIME < attendanceMap.get(record.RAW_EMPCODE)) {
                    attendanceMap.set(record.RAW_EMPCODE, record.TIME);
                }
            }
        });

        // 3. Get employees on leave
        const leaveRequest = pool.request();
        leaveRequest.input('date', sql.Date, today);
        const leaveResult = await leaveRequest.query(`
            SELECT e.EMP_Code FROM HRM_ANUAL_LEAVE_TRN l
            JOIN HRM_EMP_MASTER e ON l.ALTR_EMP_MASTER_PR = e.EMP_Slno
            WHERE @date BETWEEN l.ALTR_FROM_DT AND l.ALTR_TO_DT AND l.ALTR_STATUS_FLG = 1
        `);
        const leaveCodes = new Set(leaveResult.recordset.map(r => r.EMP_Code));

        // 4. Identify targets
        let targets = [];
        
        if (type === 'absent') {
            targets = allEmployees.filter(emp => !attendanceMap.has(emp.EMP_Code) && !leaveCodes.has(emp.EMP_Code));
        } else {
            const lateThreshold = settings.lateThreshold || '08:20';
            const sectionRules = settings.sectionRules || [];
            
            targets = allEmployees.filter(emp => {
                const checkIn = attendanceMap.get(emp.EMP_Code);
                if (!checkIn) return false;

                const sectionRule = sectionRules.find(r => r.section === emp.section);
                const effectiveThreshold = sectionRule ? sectionRule.time : lateThreshold;

                return checkIn > effectiveThreshold;
            });
        }

        if (targets.length === 0) {
            console.log(`[Scheduler] No ${type} employees found today.`);
            return;
        }

        // 5. Send emails
        const companyResult = await pool.request().query('SELECT TOP 1 COM_NAME FROM COMPANY');
        const companyName = companyResult.recordset[0]?.COM_NAME || 'SYNERGY HRPAY';
        
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: parseInt(process.env.EMAIL_PORT) === 465,
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
            tls: { rejectUnauthorized: false }
        });

        console.log(`[Scheduler] Sending ${type} notifications to ${targets.length} employees...`);

        for (const emp of targets) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: emp.email,
                    subject: settings.subject,
                    html: `
                        <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                <div style="background-color: #0F172A; padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${companyName}</h1>
                                    <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px;">Attendance Management System</p>
                                </div>
                                <div style="padding: 40px;">
                                    <div style="display: inline-block; padding: 6px 12px; background-color: #fee2e2; color: #ef4444; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase;">
                                        ${type === 'absent' ? 'Absence Alert' : 'Late Arrival Alert'}
                                    </div>
                                    <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Dear ${emp.EMP_Name},</h2>
                                    <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                                        ${settings.message.replace(/\n/g, '<br>')}
                                    </p>
                                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0F172A; padding: 20px; margin: 30px 0; border-radius: 8px;">
                                        <table style="width: 100%; font-size: 14px;">
                                            <tr>
                                                <td style="color: #64748b; width: 120px; font-weight: 500;">Employee ID :</td>
                                                <td style="color: #1e293b; font-weight: 700;">${emp.EMP_Code}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #64748b; font-weight: 500;">Record Date :</td>
                                                <td style="color: #1e293b; font-weight: 700;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                                            </tr>
                                            ${type === 'late' ? `
                                            <tr>
                                                <td style="color: #64748b; font-weight: 500;">Check-In Time :</td>
                                                <td style="color: #ef4444; font-weight: 700;">${attendanceMap.get(emp.EMP_Code)}</td>
                                            </tr>` : ''}
                                        </table>
                                    </div>

                                    <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                                        <p style="margin-bottom: 5px; color: #475569;">Regards,</p>
                                        <p style="margin: 0; color: #1e293b; font-weight: 600;">HR Department</p>
                                        <p style="margin: 0; color: #64748b; font-size: 14px;">${companyName}</p>
                                    </div>
                                </div>
                                <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="color: #64748b; font-size: 13px;">Automated notification from <strong>${companyName}</strong>.</p>
                                </div>
                            </div>
                        </div>
                    `
                });
            } catch (err) {
                console.error(`[Scheduler] Failed to send ${type} email to ${emp.email}:`, err.message);
            }
        }
    } catch (error) {
        console.error(`[Scheduler] Error in ${type} check:`, error);
    }
};

/**
 * Initialize or restart the scheduler tasks
 */
const initScheduler = () => {
    const settings = loadSettings();
    
    if (absentTask) absentTask.stop();
    if (lateTask) lateTask.stop();

    if (settings.absent?.enabled && settings.absent.time) {
        const [h, m] = settings.absent.time.split(':');
        const days = (settings.absent.days || [1, 2, 3, 4, 5, 6]).join(',');
        absentTask = cron.schedule(`${m} ${h} * * ${days}`, () => checkAndNotify('absent'));
        console.log(`[Scheduler] Absentee automation scheduled for ${settings.absent.time} on days: ${days}`);
    }

    if (settings.late?.enabled && settings.late.time) {
        const [h, m] = settings.late.time.split(':');
        const days = (settings.late.days || [1, 2, 3, 4, 5, 6]).join(',');
        lateTask = cron.schedule(`${m} ${h} * * ${days}`, () => checkAndNotify('late'));
        console.log(`[Scheduler] Late Comer automation scheduled for ${settings.late.time} on days: ${days}`);
    }
};

module.exports = { initScheduler };
