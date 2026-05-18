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

    const extraPool = await getConnection();
    const extraResult = await extraPool.request().query(`
      SELECT e.EMP_Code, loc.COM_DESC as LocationName, dept.COM_DESC as DepartmentName
      FROM HRM_EMP_MASTER e
      LEFT JOIN COMMONCODES loc ON e.EMP_LOC_DR = loc.COM_SLNO AND loc.COM_TYPE = 38
      LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
    `);
    const extraDataMap = new Map(extraResult.recordset.map(r => [r.EMP_Code, { location: r.LocationName, department: r.DepartmentName }]));

    const groupedMap = new Map();

    allRecords.forEach(record => {
      const key = `${record.RAW_EMPCODE}_${record.DATE}`;
      const extraData = extraDataMap.get(record.RAW_EMPCODE) || { location: '-', department: '-' };
      const locationName = extraData.location || record.LOC_NAME || record.LOCATION || '-';
      const departmentName = extraData.department || '-';

      // Support both RAW_LOCATION_MOB from my suggestion or direct names if added to SP
      const recordLocation = record.RAW_LOCATION_MOB || 
                            (record.RAW_DIRECTION === 'IN' ? record.ATT_IN_LOCATION_MOB : record.ATT_OUT_LOCATION_MOB) ||
                            record.LOCATION_MOB;

      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          ...record,
          LOCATION_NAME: locationName,
          DEPARTMENT_NAME: departmentName,
          CHECK_IN: record.RAW_DIRECTION === 'IN' ? record.TIME : null,
          CHECK_OUT: record.RAW_DIRECTION === 'OUT' ? record.TIME : null,
          IN_LOCATION_MOB: record.RAW_DIRECTION === 'IN' ? recordLocation : null,
          OUT_LOCATION_MOB: record.RAW_DIRECTION === 'OUT' ? recordLocation : null
        });
      } else {
        const existing = groupedMap.get(key);
        if (existing.LOCATION_NAME === '-' && locationName !== '-') {
          existing.LOCATION_NAME = locationName;
        }
        if (existing.DEPARTMENT_NAME === '-' && departmentName !== '-') {
          existing.DEPARTMENT_NAME = departmentName;
        }

        if (record.RAW_DIRECTION === 'IN') {
          if (!existing.CHECK_IN || record.TIME < existing.CHECK_IN) {
            existing.CHECK_IN = record.TIME;
            existing.IN_LOCATION_MOB = recordLocation;
          }
        } else if (record.RAW_DIRECTION === 'OUT') {
          if (!existing.CHECK_OUT || record.TIME > existing.CHECK_OUT) {
            existing.CHECK_OUT = record.TIME;
            existing.OUT_LOCATION_MOB = recordLocation;
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
