const { getConnection, sql } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get total active employees and pending leaves
    const [empCount, leaveCount] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as count FROM HRM_EMP_MASTER WHERE EMP_STAT_FLAG = 1'),
      pool.request().query('SELECT COUNT(*) as count FROM HRM_ANUAL_LEAVE_TRN WHERE ALTR_STATUS_FLG = 0')
    ]);

    // Get today's attendance summary using the existing procedure
    const today = new Date().toISOString().split('T')[0];
    const attendanceRequest = pool.request();
    attendanceRequest.input('fromdate', sql.Date, today);
    attendanceRequest.input('todate', sql.Date, today);
    attendanceRequest.input('designation', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('department', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('location', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('section', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('empCode', sql.NVarChar(sql.MAX), null);
    attendanceRequest.input('inout', sql.NVarChar(10), null);
    attendanceRequest.input('userId', sql.Int, 1); // Default user ID
    attendanceRequest.input('company', sql.NVarChar(sql.MAX), null);
    
    let records = [];
    try {
      const attendanceResult = await attendanceRequest.execute('SynATTENDANCE_REGISTER_ALL');
      records = attendanceResult.recordset || [];
    } catch (attError) {
      console.error('Error executing SynATTENDANCE_REGISTER_ALL for dashboard:', attError);
      // Fallback or empty stats if it fails
    }

    const stats = {
      presentToday: 0,
      absentToday: 0,
      onVacationToday: 0,
      otherToday: 0
    };

    records.forEach(rec => {
      const status = String(rec.STATUS).toLowerCase();
      if (status === 'present') stats.presentToday++;
      else if (status === 'absent') stats.absentToday++;
      else if (status === 'vacation' || status === 'on leave') stats.onVacationToday++;
      else stats.otherToday++;
    });

    // Get recent activities (Latest 5 leave requests)
    // Using fields confirmed in leaveController.js and SynAnnualLeaveExitPermit
    let activities = [];
    try {
      const recentLeaves = await pool.request().query(`
        SELECT TOP 5 
          e.EMP_Name as empName,
          'leave' as type,
          e.EMP_Name + ' requested ' + l.ALTR_TYPE + ' from ' + CONVERT(VARCHAR, l.ALTR_FROM_DT, 106) as message,
          l.ALTR_FROM_DT as timestamp
        FROM HRM_ANUAL_LEAVE_TRN l
        JOIN HRM_EMP_MASTER e ON l.ALTR_EMP_MASTER_PR = e.EMP_Slno
        ORDER BY l.ALTR_SLNO DESC
      `);
      activities = recentLeaves.recordset || [];
    } catch (actError) {
      console.error('Error fetching dashboard activities:', actError);
      // Don't fail the whole request if activities fail
    }

    res.json({
      totalEmployees: empCount.recordset[0].count,
      pendingLeaves: leaveCount.recordset[0].count,
      presentToday: stats.presentToday,
      absentToday: stats.absentToday,
      onVacationToday: stats.onVacationToday,
      otherToday: stats.otherToday,
      activities: activities
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getDashboardStats
};
