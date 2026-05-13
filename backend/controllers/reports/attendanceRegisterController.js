const { getConnection, sql } = require('../../config/database');

/**
 * Get Attendance Register Report
 */
const getAttendanceRegister = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const {
      fromDate,
      toDate,
      designation,
      department,
      location,
      section,
      empCode,
      inout,
      company,
      page = 1,
      limit = 10
    } = params;

    const pool = await getConnection();
    const request = pool.request();

    request.input('fromdate', sql.Date, fromDate || null);
    request.input('todate', sql.Date, toDate || null);
    request.input('designation', sql.NVarChar(sql.MAX), designation || null);
    request.input('department', sql.NVarChar(sql.MAX), department || null);
    request.input('location', sql.NVarChar(sql.MAX), location || null);
    request.input('section', sql.NVarChar(sql.MAX), section || null);
    request.input('empCode', sql.NVarChar(sql.MAX), empCode || null);
    request.input('inout', sql.NVarChar(10), inout || null);
    request.input('userId', sql.Int, req.user?.USR_Slno || 1);
    request.input('company', sql.NVarChar(sql.MAX), company || null);

    const result = await request.execute('SynATTENDANCE_REGISTER');

    const allRecords = result.recordsets[0] || [];
    const footerInfo = result.recordsets[1] ? result.recordsets[1][0] : null;

    const locPool = await getConnection();
    const locResult = await locPool.request().query(`
      SELECT e.EMP_Code, c.COM_DESC as LocationName
      FROM HRM_EMP_MASTER e
      LEFT JOIN COMMONCODES c ON e.EMP_LOC_DR = c.COM_SLNO AND c.COM_TYPE = 38
    `);
    const locMap = new Map(locResult.recordset.map(l => [l.EMP_Code, l.LocationName]));

    const groupedMap = new Map();

    allRecords.forEach(record => {
      const key = `${record.RAW_EMPCODE}_${record.DATE}`;
      const locationName = locMap.get(record.RAW_EMPCODE) || record.LOC_NAME || record.LOCATION || '-';

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...record,
          LOCATION_NAME: locationName,
          CHECK_IN: record.RAW_DIRECTION === 'IN' ? record.TIME : null,
          CHECK_OUT: record.RAW_DIRECTION === 'OUT' ? record.TIME : null
        });
      } else {
        const existing = groupedMap.get(key);
        if (existing.LOCATION_NAME === '-' && locationName !== '-') {
          existing.LOCATION_NAME = locationName;
        }

        if (record.RAW_DIRECTION === 'IN') {
          if (!existing.CHECK_IN || record.TIME < existing.CHECK_IN) {
            existing.CHECK_IN = record.TIME;
          }
        } else if (record.RAW_DIRECTION === 'OUT') {
          if (!existing.CHECK_OUT || record.TIME > existing.CHECK_OUT) {
            existing.CHECK_OUT = record.TIME;
          }
        }
      }
    });

    const groupedRecords = Array.from(groupedMap.values());
    const totalRecords = groupedRecords.length;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRecords = groupedRecords.slice(offset, offset + parseInt(limit));

    res.json({
      reportData: paginatedRecords,
      footerInfo,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRecords / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getAttendanceRegister:', error);
    res.status(500).json({ error: 'Failed to fetch attendance register report', details: error.message });
  }
};

module.exports = {
  getAttendanceRegister
};
