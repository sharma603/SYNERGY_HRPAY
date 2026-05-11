const { getConnection, sql } = require('../config/database');

/**
 * Get Cost Allocation Report using stored procedure procHRM_Cost_Allocation_Report
 */
const getCostAllocationReport = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const {
      payGroup,
      payPeriod,
      mode = 3, // Default to report mode if not specified
      employeeId,
      employer,
      project,
      section,
      company,
      department,
      designation
    } = params;

    const pool = await getConnection();
    const request = pool.request();

    // Set parameters for the stored procedure
    request.input('mode', sql.Int, parseInt(mode));
    request.input('paygroup', sql.Int, payGroup ? parseInt(payGroup) : null);
    request.input('payPeriod', sql.Int, payPeriod ? parseInt(payPeriod) : null);
    request.input('Employee', sql.Int, employeeId ? parseInt(employeeId) : null);
    request.input('employer', sql.Int, employer ? parseInt(employer) : null);
    request.input('Project', sql.Int, project ? parseInt(project) : null);
    request.input('section', sql.Int, section ? parseInt(section) : null);
    request.input('company', sql.Int, company ? parseInt(company) : null);
    request.input('department', sql.Int, department ? parseInt(department) : null);
    request.input('designation', sql.Int, designation ? parseInt(designation) : null);
    request.input('user', sql.Int, 1); // Default user ID

    const result = await request.execute('procHRM_Cost_Allocation_Report');

    // Handle results based on mode
    if (parseInt(mode) === 1) {
      // Mode 1: Fetch Pay Groups
      return res.json({
        filters: {
          payGroups: result.recordset
        }
      });
    } else if (parseInt(mode) === 2) {
      // Mode 2: Fetch Cascading Dropdowns (Multiple Result Sets)
      // Order in SP: PayPeriods, Employees, Projects, Sections, Company, Dept, Desig
      return res.json({
        filters: {
          payPeriods: result.recordsets[0] || [],
          employees: result.recordsets[1] || [],
          projects: result.recordsets[2] || [],
          sections: result.recordsets[3] || [],
          companies: result.recordsets[4] || [],
          departments: result.recordsets[5] || [],
          designations: result.recordsets[6] || []
        }
      });
    } else {
      // Mode 3: Main Report (Multiple Result Sets)
      // Resultset 1: Main pivoted data
      // Resultset 2: Total row
      // Resultset 3: Search Criteria
      // Resultset 4: Footer
      // Resultset 5: Company Name

      const reportData = result.recordsets[0] || [];
      const totalRow = result.recordsets[1] ? result.recordsets[1][0] : null;
      const searchCriteria = result.recordsets[2] ? result.recordsets[2][0] : null;
      const footer = result.recordsets[3] ? result.recordsets[3][0] : null;
      const companyInfo = result.recordsets[4] ? result.recordsets[4][0] : null;

      // Handle "No Data Found" message which comes in Resultset 0 as a single row
      if (reportData.length === 1 && reportData[0].Sites === 'No Data Found') {
        return res.json({
          reportData: [],
          totalRow: null,
          searchCriteria: null,
          message: 'No Data Found'
        });
      }

      return res.json({
        reportData,
        totalRow,
        searchCriteria,
        footer: footer ? footer.reportFooter : '',
        companyName: companyInfo ? companyInfo.COMPANY_NAME : '',
        // Include filters for the UI state if needed, though they usually come from mode 2
        columns: reportData.length > 0 ? Object.keys(reportData[0]) : []
      });
    }
  } catch (error) {
    console.error('Error in getCostAllocationReport:', error);
    res.status(500).json({ error: 'Failed to fetch cost allocation report', details: error.message });
  }
};

/**
 * Export Cost Allocation Report
 * This will reuse the same SP but format the output for CSV
 */
const exportCostAllocationReport = async (req, res) => {
  try {
    const {
      payGroup,
      payPeriod,
      employeeId,
      employer,
      project,
      section,
      company,
      department,
      designation
    } = req.query;

    if (!payGroup || !payPeriod) {
      return res.status(400).send('Pay Group and Pay Period are mandatory for export');
    }

    const pool = await getConnection();
    const request = pool.request();

    request.input('mode', sql.Int, 3);
    request.input('paygroup', sql.Int, parseInt(payGroup));
    request.input('payPeriod', sql.Int, parseInt(payPeriod));
    request.input('Employee', sql.Int, employeeId ? parseInt(employeeId) : null);
    request.input('employer', sql.Int, employer ? parseInt(employer) : null);
    request.input('Project', sql.Int, project ? parseInt(project) : null);
    request.input('section', sql.Int, section ? parseInt(section) : null);
    request.input('company', sql.Int, company ? parseInt(company) : null);
    request.input('department', sql.Int, department ? parseInt(department) : null);
    request.input('designation', sql.Int, designation ? parseInt(designation) : null);

    const result = await request.execute('procHRM_Cost_Allocation_Report');
    const records = result.recordsets[0] || [];

    if (records.length === 0 || (records.length === 1 && records[0].Sites === 'No Data Found')) {
      return res.status(404).send('No data found to export');
    }

    // Get column names
    const columns = Object.keys(records[0]);

    // Format CSV
    const csv = [
      columns.join(','),
      ...records.map(r => columns.map(col => {
        const val = r[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cost_allocation_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting cost allocation report:', error);
    res.status(500).json({ error: 'Failed to export report' });
  }
};

/**
 * Get Designation DesignationMultiPeriodSummary Summary (Basic)
 */
const getDesignationMultiPeriodSummary = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { 
      payPeriods, 
      designations
    } = params;

    if (!payPeriods) {
      return res.status(400).json({ error: 'Pay Periods are mandatory' });
    }

    const pool = await getConnection();
    const request = pool.request();

    request.input('PayPeriods', sql.NVarChar(sql.MAX), payPeriods);
    request.input('Designation', sql.NVarChar(sql.MAX), designations || null);
    
    const result = await request.execute('DesignationMultiPeriodSummary');
    
    const reportData = result.recordsets[0] || [];
    const companyInfo = result.recordsets[1] ? result.recordsets[1][0] : null;
    const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

    return res.json({
      reportData,
      columns,
      companyName: companyInfo ? companyInfo.COMPANY_NAME : ''
    });
  } catch (error) {
    console.error('Error in getDesignationMultiPeriodSummary:', error);
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
};

/**
 * Get Designation DesignationMultiPeriodSummary Summary with all filters (Advanced)
 */
const getDesignationMultiPeriodSummarywithfilters = async (req, res) => {
  try {
    const params = req.method === 'POST' ? req.body : req.query;
    const { 
      payPeriods, 
      designations, 
      employees, 
      projects, 
      sections, 
      companies, 
      departments, 
      employers 
    } = params;

    if (!payPeriods) {
      return res.status(400).json({ error: 'Pay Periods are mandatory' });
    }

    const pool = await getConnection();
    const request = pool.request();

    request.input('PayPeriods', sql.NVarChar(sql.MAX), payPeriods);
    request.input('Designation', sql.NVarChar(sql.MAX), designations || null);
    request.input('Employees', sql.NVarChar(sql.MAX), employees || null);
    request.input('Projects', sql.NVarChar(sql.MAX), projects || null);
    request.input('Sections', sql.NVarChar(sql.MAX), sections || null);
    request.input('Companies', sql.NVarChar(sql.MAX), companies || null);
    request.input('Departments', sql.NVarChar(sql.MAX), departments || null);
    request.input('Employers', sql.NVarChar(sql.MAX), employers || null);

    const result = await request.execute('DesignationMultiPeriodSummary');
    
    const reportData = result.recordsets[0] || [];
    const companyInfo = result.recordsets[1] ? result.recordsets[1][0] : null;
    const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

    return res.json({
      reportData,
      columns,
      companyName: companyInfo ? companyInfo.COMPANY_NAME : ''
    });
  } catch (error) {
    console.error('Error in getDesignationMultiPeriodSummarywithfilters:', error);
    res.status(500).json({ error: 'Failed to fetch summary with filters', details: error.message });
  }
};

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

    // Only pass parameters that the SP expects to avoid 500 errors
    // If the string is empty, pass null
    const sqlFromDate = fromDate && fromDate !== '' ? fromDate : null;
    const sqlToDate = toDate && toDate !== '' ? toDate : null;

    request.input('FromDate', sql.Date, sqlFromDate);
    request.input('ToDate', sql.Date, sqlToDate);

    const result = await request.execute('SynAnnualLeaveExitPermit');
    let allRecords = result.recordset || [];
    
    // Log available fields for the first record to help with debugging
    if (allRecords.length > 0) {
      console.log('AnnualLeaveExitPermit record keys:', Object.keys(allRecords[0]));
    }

    // Perform manual filtering in JavaScript only if a filter is actually selected
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

          // 1. Date filtering (Request Date or Start Date)
          if ((fromDate && fromDate !== '') || (toDate && toDate !== '')) {
            const rawDate = record.PFT_DATE || record.PFT_FROM_DT;
            if (!rawDate) return false;

            const recordDate = new Date(rawDate);
            if (isNaN(recordDate.getTime())) return false;
            
            // Standardize to UTC midnight for comparison to avoid timezone issues
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

          // 2. Additional field filtering
          // Only filter if the record actually has the property, otherwise skip to avoid filtering everything out
          const checkFilter = (val, recordKeys) => {
            if (!val || val === '') return true;
            for (const key of recordKeys) {
              if (String(record[key]) === String(val)) return true;
            }
            return false;
          };

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
            // Check if employee code or name contains the search string or matches ID
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
    
    // Client-side pagination for this specific report since SP doesn't support it
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
    request.input('userId', sql.Int, req.user?.USR_Slno || 1); // Get user ID from auth middleware
    request.input('company', sql.NVarChar(sql.MAX), company || null);

    const result = await request.execute('SynATTENDANCE_REGISTER');
    
    const allRecords = result.recordsets[0] || [];
    const footerInfo = result.recordsets[1] ? result.recordsets[1][0] : null;

    // Fetch employee locations to ensure we have the descriptive names
    const locPool = await getConnection();
    const locResult = await locPool.request().query(`
      SELECT e.EMP_Code, c.COM_DESC as LocationName
      FROM HRM_EMP_MASTER e
      LEFT JOIN COMMONCODES c ON e.EMP_LOC_DR = c.COM_SLNO AND c.COM_TYPE = 38
    `);
    const locMap = new Map(locResult.recordset.map(l => [l.EMP_Code, l.LocationName]));

    // Group records by Employee Code and Date
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
        // Update location if it was missing
        if (existing.LOCATION_NAME === '-' && locationName !== '-') {
          existing.LOCATION_NAME = locationName;
        }
        
        if (record.RAW_DIRECTION === 'IN') {
          // If multiple INs, take the earliest
          if (!existing.CHECK_IN || record.TIME < existing.CHECK_IN) {
            existing.CHECK_IN = record.TIME;
          }
        } else if (record.RAW_DIRECTION === 'OUT') {
          // If multiple OUTs, take the latest
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
    
    const allRecords = result.recordset || [];
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
  getCostAllocationReport,
  exportCostAllocationReport,
  getDesignationMultiPeriodSummary,
  getDesignationMultiPeriodSummarywithfilters,
  getAnnualLeaveExitPermit,
  getAttendanceRegister,
  getEmployeeProjectReport
};
