const { getConnection, sql } = require('../config/database');

const getAllLeaves = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT 
        ALTR_SLNO as LeaveID,
        EMP_Code as EmployeeID,
        ALTR_TYPE as LeaveType,
        ALTR_FROM_DT as StartDate,
        ALTR_TO_DT as EndDate,
        ALTR_REMARK as Reason,
        CASE ALTR_STATUS_FLG WHEN 1 THEN 'Approved' WHEN 0 THEN 'Pending' ELSE 'Rejected' END as Status
      FROM HRM_ANUAL_LEAVE_TRN l
      JOIN HRM_EMP_MASTER e ON l.ALTR_EMP_MASTER_PR = e.EMP_Slno
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: 'Failed to fetch leaves' });
  }
};

const createLeave = async (req, res) => {
  try {
    res.status(201).json({ message: 'Leave request submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit leave request' });
  }
};

module.exports = {
  getAllLeaves,
  createLeave
};
