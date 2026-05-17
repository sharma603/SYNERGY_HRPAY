const { getConnection, sql } = require('../../config/database');

/**
 * Get Employee Project/Site Location Report
 */
const getEmployeeProjectReport = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const {
      department,
      designation,
      section,
      project,
      empCode,
      nationality,
      page = 1,
      limit = 10
    } = params;

    const pool = await getConnection();
    const request = pool.request();

    request.input('Department', sql.NVarChar(sql.MAX), department || null);
    request.input('Designation', sql.NVarChar(sql.MAX), designation || null);
    request.input('Section', sql.NVarChar(sql.MAX), section || null);
    request.input('Project', sql.NVarChar(sql.MAX), project || null);

    const result = await request.execute('synEmployeeProjectReport');
    
    let allRecords = result.recordset || [];

    // Apply additional filters if provided
    if (empCode) {
      const codes = empCode.split(',').map(c => c.trim().toUpperCase());
      allRecords = allRecords.filter(row => 
        row.EMP_CODE && codes.includes(row.EMP_CODE.trim().toUpperCase())
      );
    }

    if (nationality) {
      allRecords = allRecords.filter(row => 
        row.Nationality && row.Nationality.trim().toUpperCase() === nationality.trim().toUpperCase()
      );
    }

    const totalRecords = allRecords.length;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedRecords = allRecords.slice(offset, offset + parseInt(limit));

    res.json({
      reportData: paginatedRecords,
      pagination: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRecords / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error in getEmployeeProjectReport:', error);
    res.status(500).json({ error: 'Failed to fetch employee project report', details: error.message });
  }
};

module.exports = {
  getEmployeeProjectReport
};
