const { getConnection, sql } = require('../config/database');

// Get all employees with pagination
const getAllEmployees = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    const pool = await getConnection();
    
    // Build the search condition
    const searchCondition = search ? `
      WHERE e.EMP_Name LIKE @search OR e.EMP_Code LIKE @search
    ` : '';

    // Get total count with search
    const countRequest = pool.request();
    if (search) countRequest.input('search', sql.NVarChar, `%${search}%`);
    const countResult = await countRequest.query(`SELECT COUNT(*) as total FROM HRM_EMP_MASTER e ${searchCondition}`);
    const total = countResult.recordset[0].total;

    // Get paginated data with JOINs and search
    const request = pool.request();
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);
    if (search) request.input('search', sql.NVarChar, `%${search}%`);

    const result = await request.query(`
      SELECT 
        e.EMP_Slno, e.EMP_Code, e.EMP_Name, e.EMP_IMAGE, 
        loc.COM_DESC as EMP_LOC_DR, 
        dept.COM_DESC as EMP_DEPT_DR, 
        desig.COM_DESC as EMP_DESIG_DR, 
        e.EMP_DOB, 
        nation.COM_DESC as EMP_NATION_DR, 
        rel.COM_DESC as EMP_RELIGION_DR, 
        e.EMP_PREV_ID, e.EMP_JOIN_DATE, e.EMP_ADDRESS, e.EMP_LAB_NO, 
        e.EMP_MOL_NO, e.EMP_OT_DR, 
        bank.COM_DESC as EMP_BANK_DR, 
        e.EMP_BRANCH, 
        e.EMP_AC_NO, e.EMP_SWIFT_CODE, e.EMP_UNIQ_CODE, e.EMP_SEPERATION
      FROM HRM_EMP_MASTER e
      LEFT JOIN COMMONCODES rel ON e.EMP_RELIGION_DR = rel.COM_SLNO AND rel.COM_TYPE = 42
       LEFT JOIN COMMONCODES nation ON e.EMP_NATION_DR = nation.COM_SLNO AND nation.COM_TYPE = 41
       LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
       LEFT JOIN COMMONCODES desig ON e.EMP_DESIG_DR = desig.COM_SLNO AND desig.COM_TYPE = 40
       LEFT JOIN COMMONCODES loc ON e.EMP_LOC_DR = loc.COM_SLNO AND loc.COM_TYPE = 38
       LEFT JOIN COMMONCODES bank ON e.EMP_BANK_DR = bank.COM_SLNO AND bank.COM_TYPE = 115
      ${searchCondition}
      ORDER BY e.EMP_Slno
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      data: result.recordset,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Get employee by ID
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    const result = await pool.request()
      .input('id', id)
      .query(`
        SELECT 
          e.EMP_Slno, e.EMP_Code, e.EMP_Name, 
          loc.COM_DESC as EMP_LOC_DR, 
          dept.COM_DESC as EMP_DEPT_DR, 
          desig.COM_DESC as EMP_DESIG_DR, 
          e.EMP_DOB, 
          nation.COM_DESC as EMP_NATION_DR, 
          rel.COM_DESC as EMP_RELIGION_DR, 
          e.EMP_PREV_ID, e.EMP_JOIN_DATE, e.EMP_ADDRESS, e.EMP_LAB_NO, 
          e.EMP_MOL_NO, e.EMP_OT_DR, 
          bank.COM_DESC as EMP_BANK_DR, 
          e.EMP_BRANCH, 
          e.EMP_AC_NO, e.EMP_SWIFT_CODE, e.EMP_UNIQ_CODE, e.EMP_SEPERATION
        FROM HRM_EMP_MASTER e
        LEFT JOIN COMMONCODES rel ON e.EMP_RELIGION_DR = rel.COM_SLNO AND rel.COM_TYPE = 42
        LEFT JOIN COMMONCODES nation ON e.EMP_NATION_DR = nation.COM_SLNO AND nation.COM_TYPE = 41
        LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
        LEFT JOIN COMMONCODES desig ON e.EMP_DESIG_DR = desig.COM_SLNO AND desig.COM_TYPE = 40
        LEFT JOIN COMMONCODES loc ON e.EMP_LOC_DR = loc.COM_SLNO AND loc.COM_TYPE = 38
        LEFT JOIN COMMONCODES bank ON e.EMP_BANK_DR = bank.COM_SLNO AND bank.COM_TYPE = 115
        WHERE e.EMP_Slno = @id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

// Create employee
const createEmployee = async (req, res) => {
  try {
    const { firstName, lastName, email, department, position } = req.body;
    const pool = await getConnection();
    
    const result = await pool.request()
      .input('firstName', firstName)
      .input('lastName', lastName)
      .input('email', email)
      .input('department', department)
      .input('position', position)
      .query(`INSERT INTO Employees (FirstName, LastName, Email, Department, Position) 
              VALUES (@firstName, @lastName, @email, @department, @position);
              SELECT SCOPE_IDENTITY() as id;`);
    
    res.status(201).json({ id: result.recordset[0].id, ...req.body });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, department, position } = req.body;
    const pool = await getConnection();
    
    await pool.request()
      .input('id', id)
      .input('firstName', firstName)
      .input('lastName', lastName)
      .input('email', email)
      .input('department', department)
      .input('position', position)
      .query(`UPDATE Employees SET FirstName=@firstName, LastName=@lastName, 
              Email=@email, Department=@department, Position=@position WHERE EmployeeID=@id`);
    
    res.json({ id, ...req.body });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// Delete employee
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getConnection();
    
    await pool.request()
      .input('id', id)
      .query('DELETE FROM Employees WHERE EmployeeID=@id');
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
};
