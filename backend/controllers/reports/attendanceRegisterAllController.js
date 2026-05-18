const { getConnection, sql } = require('../../config/database');

/** 
 * Get Attendance Register All Report 
 */ 
const getAttendanceRegisterAll = async (req, res) => { 
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
      status,
      lateOnly,
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
    // Removed 'status' input because the database procedure doesn't accept it yet
 
    const result = await request.execute('SynATTENDANCE_REGISTER_ALL'); 
    
    let allRecords = result.recordsets[0] || []; 
    const footerInfo = result.recordsets[1] ? result.recordsets[1][0] : null; 
 
    // Fetch employee locations and departments
    const extraPool = await getConnection(); 
    const extraResult = await extraPool.request().query(` 
      SELECT e.EMP_Code, loc.COM_DESC as LocationName, dept.COM_DESC as DepartmentName
      FROM HRM_EMP_MASTER e 
      LEFT JOIN COMMONCODES loc ON e.EMP_LOC_DR = loc.COM_SLNO AND loc.COM_TYPE = 38
      LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
    `); 
    const extraMap = new Map(extraResult.recordset.map(r => [r.EMP_Code, { location: r.LocationName, department: r.DepartmentName }])); 
 
    let mappedRecords = allRecords.map(record => {
      const extraData = extraMap.get(record.RAW_EMPCODE) || { location: '-', department: '-' };
      return {
        ...record,
        LOCATION_NAME: extraData.location || record.LOCATION || '-',
        DEPARTMENT_NAME: extraData.department || '-'
      };
    });

    // Sort by Date then Time ascending
    mappedRecords.sort((a, b) => {
      const dateA = new Date(a.DATE);
      const dateB = new Date(b.DATE);
      if (dateA - dateB !== 0) return dateA - dateB;
      
      // If same date, sort by time
      return String(a.TIME).localeCompare(String(b.TIME));
    });

    // Handle Status filtering in the backend since the SQL doesn't have the parameter
    if (status && status !== '') {
      mappedRecords = mappedRecords.filter(record => 
        String(record.STATUS).toLowerCase() === String(status).toLowerCase()
      );
    }

    // Handle Late Arrivals (After 08:20)
    if (lateOnly === true || lateOnly === 'true') {
      mappedRecords = mappedRecords.filter(record => {
        const isLate = String(record.TIME) > '08:20';
        return isLate && String(record.DIRECTION).toUpperCase() === 'IN';
      });
    }

    const totalRecords = mappedRecords.length; 
    const offset = (parseInt(page) - 1) * parseInt(limit); 
    const paginatedRecords = mappedRecords.slice(offset, offset + parseInt(limit)); 
 
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
    console.error('Error in getAttendanceRegisterAll:', error); 
    res.status(500).json({ error: 'Failed to fetch attendance register all report', details: error.message }); 
  } 
};

/**
 * Update Attendance Status
 */
const updateAttendanceStatus = async (req, res) => {
  try {
    const { empCode, date, status } = req.body;

    if (!empCode || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const pool = await getConnection();
    
    // This is a placeholder update logic. 
    // You should replace 'TAS_ATTENDANCE' and the columns with your actual table names.
    // Usually, status updates involve updating a daily attendance table or an override table.
    await pool.request()
      .input('empCode', sql.NVarChar, empCode)
      .input('date', sql.Date, date)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE TAS_ATTENDANCE 
        SET ATT_STATUS = @status 
        WHERE ATT_EMP_CODE = @empCode 
        AND ATT_DATE = @date
      `);

    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating attendance status:', error);
    res.status(500).json({ error: 'Failed to update attendance status', details: error.message });
  }
};

module.exports = {
  getAttendanceRegisterAll,
  updateAttendanceStatus
};
