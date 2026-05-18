const { getConnection, sql } = require('../../config/database');

/**
 * Get Cost Allocation Report using stored procedure procHRM_Cost_Allocation_Report
 */
const synHRM_Cost_Allocation_Report = async (req, res) => {
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
      return res.json({
        filters: {
          payPeriods: result.recordsets[0] || [],
          employees: result.recordsets[1] || [],
          projects: result.recordsets[2] || [],
          sections: result.recordsets[3] || [],
          companies: result.recordsets[4] || [],
          departments: result.recordsets[5] || [],
          designations: result.recordsets[6] || [],
          employers: result.recordsets[7] || []
        }
      });
    } else {
      const reportData = result.recordsets[0] || [];
      const totalRow = result.recordsets[1] ? result.recordsets[1][0] : null;
      const searchCriteria = result.recordsets[2] ? result.recordsets[2][0] : null;
      const footer = result.recordsets[3] ? result.recordsets[3][0] : null;
      const companyInfo = result.recordsets[4] ? result.recordsets[4][0] : null;

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
        columns: reportData.length > 0 ? Object.keys(reportData[0]) : []
      });
    }
  } catch (error) {
    console.error('Error in synHRM_Cost_Allocation_Report:', error);
    res.status(500).json({ error: 'Failed to fetch cost allocation report', details: error.message });
  }
};

/**
 * Export Cost Allocation Report
 */
const synHRM_Cost_Allocation_Report_Export = async (req, res) => {
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

    const columns = Object.keys(records[0]);
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

module.exports = {
  synHRM_Cost_Allocation_Report,
  synHRM_Cost_Allocation_Report_Export
};
