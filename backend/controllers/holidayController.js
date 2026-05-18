const { getConnection, sql } = require('../config/database');

const getHolidays = async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request().query(`
      SELECT TOP (1000) 
        [HRH_SLNO],
        [HRH_CODE],
        [HRH_DESC],
        [HRH_NORMAL_HRS],
        [HRH_FROM_DT],
        [HRH_TO_DATE],
        [HRH_CREAT_USER_DR],
        [HRH_CREAT_DT],
        [HRH_EDIT_USER_DR],
        [HRH_EDIT_DT],
        [HRH_RAMADAN]
      FROM [HRM_HOLIDAY]
      ORDER BY [HRH_FROM_DT] DESC
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
};

module.exports = {
  getHolidays
};
