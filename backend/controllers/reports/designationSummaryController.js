const { getConnection, sql } = require('../../config/database');

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

module.exports = {
  getDesignationMultiPeriodSummary,
  getDesignationMultiPeriodSummarywithfilters
};
