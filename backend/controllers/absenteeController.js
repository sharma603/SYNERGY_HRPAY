const { getConnection, sql } = require('../config/database');
const nodemailer = require('nodemailer');

/**
 * Get absent or late employees for a specific date
 */
const getAbsentees = async (req, res) => {
  try {
    const { date, page = 1, limit = 10, type = 'absent', lateThreshold = '08:20', section = null, department = null, sectionRules = null } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Parse section rules if provided
    let rules = [];
    try {
      if (sectionRules) {
        rules = JSON.parse(sectionRules);
      }
    } catch (e) {
      console.error('Failed to parse section rules');
    }

    const pool = await getConnection();
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // 0. Get Company Name
    const companyResult = await pool.request().query('SELECT TOP 1 COM_NAME FROM COMPANY');
    const companyName = companyResult.recordset[0]?.COM_NAME || 'SYNERGY HRPAY';

    // 1. Get all active employees with their emails
    let query = `
      SELECT 
        e.EMP_Code, 
        e.EMP_Name, 
        ISNULL(e.EMP_EMAIL, ISNULL(u.email, ud.USR_EMAIL_ID)) as email,
        dept.COM_DESC as department,
        desig.COM_DESC as designation,
        sec.COM_DESC as section
      FROM HRM_EMP_MASTER e
      LEFT JOIN Users u ON e.EMP_Code = u.username
      LEFT JOIN USER_DEFINITION ud ON e.EMP_Code = ud.USR_UserID
      LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
      LEFT JOIN COMMONCODES desig ON e.EMP_DESIG_DR = desig.COM_SLNO AND desig.COM_TYPE = 40
      LEFT JOIN COMMONCODES sec ON e.EMP_SECTION_DR = sec.COM_SLNO
      WHERE e.emp_stat_flag = 1
    `;

    if (section) {
      query += ` AND sec.COM_DESC = '${section.replace(/'/g, "''")}'`;
    }
    if (department) {
      query += ` AND dept.COM_DESC = '${department.replace(/'/g, "''")}'`;
    }

    const allEmployeesResult = await pool.request().query(query);
    const allEmployees = allEmployeesResult.recordset;

    // 2. Get attendance for that date
    const attendanceRequest = pool.request();
    attendanceRequest.input('fromdate', sql.Date, date);
    attendanceRequest.input('todate', sql.Date, date);
    attendanceRequest.input('designation', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('department', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('location', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('section', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('empCode', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('inout', sql.NVarChar(10), null);
    attendanceRequest.input('userId', sql.Int, req.user?.USR_Slno || 1);
    attendanceRequest.input('company', sql.NVarChar(sql.MAX), null);
    
    const attendanceResult = await attendanceRequest.execute('SynATTENDANCE_REGISTER');
    const attendanceRecords = attendanceResult.recordsets[0] || [];
    
    // Group attendance by employee code to get first IN time
    const attendanceMap = new Map();
    attendanceRecords.forEach(record => {
      if (record.RAW_DIRECTION === 'IN') {
        if (!attendanceMap.has(record.RAW_EMPCODE) || record.TIME < attendanceMap.get(record.RAW_EMPCODE)) {
          attendanceMap.set(record.RAW_EMPCODE, record.TIME);
        }
      }
    });

    // 3. Get employees on leave for that date
    const leaveRequest = pool.request();
    leaveRequest.input('date', sql.Date, date);
    const leaveResult = await leaveRequest.query(`
      SELECT e.EMP_Code
      FROM HRM_ANUAL_LEAVE_TRN l
      JOIN HRM_EMP_MASTER e ON l.ALTR_EMP_MASTER_PR = e.EMP_Slno
      WHERE @date BETWEEN l.ALTR_FROM_DT AND l.ALTR_TO_DT
      AND l.ALTR_STATUS_FLG = 1
    `);
    const leaveCodes = new Set(leaveResult.recordset.map(r => r.EMP_Code));

    // 4. Calculate based on type
    let filteredList = [];
    
    if (type === 'absent') {
      filteredList = allEmployees.filter(emp => 
        !attendanceMap.has(emp.EMP_Code) && 
        !leaveCodes.has(emp.EMP_Code)
      );
    } else if (type === 'late') {
      filteredList = allEmployees.filter(emp => {
        const checkIn = attendanceMap.get(emp.EMP_Code);
        if (!checkIn) return false; // Not present
        
        // Find if there's a specific rule for this employee's section
        const sectionRule = rules.find(r => r.section === emp.section);
        const effectiveThreshold = sectionRule ? sectionRule.time : lateThreshold;
        
        // Compare times (checkIn vs effectiveThreshold)
        return checkIn > effectiveThreshold;
      }).map(emp => ({
        ...emp,
        CHECK_IN: attendanceMap.get(emp.EMP_Code)
      }));
    }

    const total = filteredList.length;
    const paginatedList = filteredList.slice(offset, offset + limitNum);

    res.json({
      data: paginatedList,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error in getAbsentees:', error);
    res.status(500).json({ error: 'Failed to fetch employee list', details: error.message });
  }
};

/**
 * Send bulk absentee notifications
 */
const sendBulkNotifications = async (req, res) => {
  try {
    const { recipients, subject, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients selected' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const pool = await getConnection();
    const companyResult = await pool.request().query('SELECT TOP 1 COM_NAME FROM COMPANY');
    const companyName = companyResult.recordset[0]?.COM_NAME || 'SYNERGY HRPAY';

    const sendPromises = recipients.map(emp => {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: emp.email,
        subject: subject,
        html: `
          <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="background-color: #0F172A; padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">${companyName}</h1>
                <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase;">Attendance Management System</p>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px;">
                <div style="display: inline-block; padding: 6px 12px; background-color: #fee2e2; color: #ef4444; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase;">
                  Attendance Alert
                </div>
                
                <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Dear ${emp.EMP_Name},</h2>
                
                  <div style="color: #475569; line-height: 1.6; font-size: 16px;">
                    <p style="margin-bottom: 25px;">
                      ${message.replace(/\n/g, '<br>')}
                    </p>
                    
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0F172A; padding: 20px; margin: 30px 0; border-radius: 8px;">
                      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                          <td style="color: #64748b; padding-bottom: 10px; width: 120px; font-weight: 500;">Employee ID :</td>
                          <td style="color: #1e293b; font-weight: 700; padding-bottom: 10px;">${emp.EMP_Code}</td>
                        </tr>
                        <tr>
                          <td style="color: #64748b; ${emp.CHECK_IN ? 'padding-bottom: 10px;' : ''} font-weight: 500;">Record Date :</td>
                          <td style="color: #1e293b; font-weight: 700; ${emp.CHECK_IN ? 'padding-bottom: 10px;' : ''}">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                        </tr>
                        ${emp.CHECK_IN ? `
                        <tr>
                          <td style="color: #64748b; font-weight: 500;">Check-In Time :</td>
                          <td style="color: #ef4444; font-weight: 700;">${emp.CHECK_IN}</td>
                        </tr>
                        ` : ''}
                      </table>
                    </div>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                      <p style="margin-bottom: 5px; color: #475569;">Regards,</p>
                      <p style="margin: 0; color: #1e293b; font-weight: 600;">HR Department</p>
                      <p style="margin: 0; color: #64748b; font-size: 14px;">${companyName}</p>
                    </div>
                  </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; margin: 0;">
                  This is an automated notification from <strong>${companyName}</strong>.
                </p>
                <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
                  Please do not reply directly to this email.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} ${companyName} Management System</p>
            </div>
          </div>
        `
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(sendPromises);

    res.json({ message: `Successfully sent notifications to ${recipients.length} employees.` });
  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    res.status(500).json({ error: 'Failed to send notifications', details: error.message });
  }
};

module.exports = {
  getAbsentees,
  sendBulkNotifications
};
