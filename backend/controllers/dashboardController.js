const { getConnection } = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const pool = await getConnection();
    
    const [empCount, leaveCount] = await Promise.all([
      pool.request().query('SELECT COUNT(*) as count FROM HRM_EMP_MASTER'),
      pool.request().query('SELECT COUNT(*) as count FROM HRM_ANUAL_LEAVE_TRN WHERE ALTR_STATUS_FLG = 0')
    ]);

    res.json({
      totalEmployees: empCount.recordset[0].count,
      pendingLeaves: leaveCount.recordset[0].count,
      presentToday: 0 // Attendance tracking to be implemented
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

module.exports = {
  getDashboardStats
};
