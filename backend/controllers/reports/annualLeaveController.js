const { getConnection, sql } = require('../../config/database');

/**
 * Get Annual Leave Exit Permit Report
 */
const getAnnualLeaveExitPermit = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { 
      fromDate, 
      toDate, 
      department, 
      designation, 
      section, 
      employee, 
      company, 
      page = 1, 
      limit = 10 
    } = params;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const pool = await getConnection();
    const request = pool.request();

    const sqlFromDate = fromDate && fromDate !== '' ? fromDate : null;
    const sqlToDate = toDate && toDate !== '' ? toDate : null;

    request.input('FromDate', sql.Date, sqlFromDate);
    request.input('ToDate', sql.Date, sqlToDate);

    const result = await request.execute('SynAnnualLeaveExitPermit');
    let allRecords = result.recordset || [];
    
    const hasActiveFilters = (fromDate && fromDate !== '') || 
                             (toDate && toDate !== '') || 
                             (department && department !== '') || 
                             (designation && designation !== '') || 
                             (section && section !== '') || 
                             (employee && employee !== '') || 
                             (company && company !== '');

    if (hasActiveFilters) {
      allRecords = allRecords.filter(record => {
        try {
          let match = true;

          if ((fromDate && fromDate !== '') || (toDate && toDate !== '')) {
            const rawDate = record.PFT_DATE || record.PFT_FROM_DT;
            if (!rawDate) return false;

            const recordDate = new Date(rawDate);
            if (isNaN(recordDate.getTime())) return false;
            
            const recordTime = Date.UTC(recordDate.getUTCFullYear(), recordDate.getUTCMonth(), recordDate.getUTCDate());

            if (fromDate && fromDate !== '') {
              const start = new Date(fromDate);
              const startTime = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
              if (recordTime < startTime) match = false;
            }
            if (toDate && toDate !== '') {
              const end = new Date(toDate);
              const endTime = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
              if (recordTime > endTime) match = false;
            }
          }

          if (department && department !== '') {
            const deptKeys = ['Department', 'PFT_DEPT_DR', 'DEPT_NAME'];
            if (!deptKeys.some(key => record.hasOwnProperty(key) && String(record[key]) === String(department))) match = false;
          }

          if (designation && designation !== '') {
            const desigKeys = ['Designation', 'PFT_DESIG_DR', 'DESIG_NAME'];
            if (!desigKeys.some(key => record.hasOwnProperty(key) && String(record[key]) === String(designation))) match = false;
          }

          if (section && section !== '') {
            const sectionKeys = ['Section', 'PFT_SECTION_DR', 'SECTION_NAME'];
            if (!sectionKeys.some(key => record.hasOwnProperty(key) && String(record[key]) === String(section))) match = false;
          }

          if (employee && employee !== '') {
            const empKeys = ['EMP_CODE', 'PFT_EMPLOYEE_DR', 'EMP_NAME', 'Request From'];
            if (!empKeys.some(key => record.hasOwnProperty(key) && String(record[key]).includes(String(employee)))) match = false;
          }

          if (company && company !== '') {
            const companyKeys = ['Company', 'PFT_COMPANY_DR', 'COM_NAME'];
            if (!companyKeys.some(key => record.hasOwnProperty(key) && String(record[key]) === String(company))) match = false;
          }

          return match;
        } catch (err) {
          console.error('Error filtering record:', err);
          return false;
        }
      });
    }
    
    const totalRecords = allRecords.length;
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
    console.error('Error in getAnnualLeaveExitPermit:', error);
    res.status(500).json({ error: 'Failed to fetch annual leave exit permit report', details: error.message });
  }
};

module.exports = {
  getAnnualLeaveExitPermit
};
