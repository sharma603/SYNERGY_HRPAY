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
        loc.COM_DESC as EMP_LOC_DR, e.EMP_LOC_DR as EMP_LOC_DR_ID,
        dept.COM_DESC as EMP_DEPT_DR, e.EMP_DEPT_DR as EMP_DEPT_DR_ID,
        desig.COM_DESC as EMP_DESIG_DR, e.EMP_DESIG_DR as EMP_DESIG_DR_ID,
        e.EMP_DOB, 
        nation.COM_DESC as EMP_NATION_DR, e.EMP_NATION_DR as EMP_NATION_DR_ID,
        rel.COM_DESC as EMP_RELIGION_DR, e.EMP_RELIGION_DR as EMP_RELIGION_DR_ID,
        e.EMP_PREV_ID, e.EMP_JOIN_DATE, e.EMP_ADDRESS, e.EMP_LAB_NO, 
        e.EMP_MOL_NO, e.EMP_OT_DR, 
        bank.COM_DESC as EMP_BANK_DR, e.EMP_BANK_DR as EMP_BANK_DR_ID,
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

    // Convert Buffer images to Base64
    const processedEmployees = result.recordset.map(emp => {
      if (emp.EMP_IMAGE && Buffer.isBuffer(emp.EMP_IMAGE)) {
        return {
          ...emp,
          EMP_IMAGE: emp.EMP_IMAGE.toString('base64')
        };
      }
      return emp;
    });

    res.json({
      data: processedEmployees,
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
          e.EMP_Slno, e.EMP_Code, e.EMP_Name, e.EMP_IMAGE,
          loc.COM_DESC as EMP_LOC_DR, e.EMP_LOC_DR as EMP_LOC_DR_ID,
          dept.COM_DESC as EMP_DEPT_DR, e.EMP_DEPT_DR as EMP_DEPT_DR_ID,
          desig.COM_DESC as EMP_DESIG_DR, e.EMP_DESIG_DR as EMP_DESIG_DR_ID,
          e.EMP_DOB, 
          nation.COM_DESC as EMP_NATION_DR, e.EMP_NATION_DR as EMP_NATION_DR_ID,
          rel.COM_DESC as EMP_RELIGION_DR, e.EMP_RELIGION_DR as EMP_RELIGION_DR_ID,
          e.EMP_PREV_ID, e.EMP_JOIN_DATE, e.EMP_ADDRESS, e.EMP_LAB_NO, 
          e.EMP_MOL_NO, e.EMP_OT_DR, 
          bank.COM_DESC as EMP_BANK_DR, e.EMP_BANK_DR as EMP_BANK_DR_ID,
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

    const emp = result.recordset[0];
    if (emp.EMP_IMAGE && Buffer.isBuffer(emp.EMP_IMAGE)) {
      emp.EMP_IMAGE = emp.EMP_IMAGE.toString('base64');
    }

    res.json(emp);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

// Create employee
const createEmployee = async (req, res) => {
  try {
    const { 
      EMP_Code, EMP_Name, EMP_LOC_DR, EMP_DEPT_DR, EMP_DESIG_DR, 
      EMP_DOB, EMP_NATION_DR, EMP_RELIGION_DR, EMP_PREV_ID, 
      EMP_JOIN_DATE, EMP_ADDRESS, EMP_LAB_NO, EMP_MOL_NO, 
      EMP_OT_DR, EMP_BANK_DR, EMP_BRANCH, EMP_AC_NO, 
      EMP_SWIFT_CODE, EMP_UNIQ_CODE 
    } = req.body;

    const image = req.file ? req.file.buffer : null;

    const pool = await getConnection();
    
    // 1. Get next Slno
    const slnoResult = await pool.request().query('SELECT MAX(EMP_Slno) as maxSlno FROM HRM_EMP_MASTER');
    const nextSlno = (slnoResult.recordset[0].maxSlno || 0) + 1;

    // 2. Insert into HRM_EMP_MASTER
    await pool.request()
      .input('Slno', sql.Int, nextSlno)
      .input('Code', sql.NVarChar, EMP_Code)
      .input('Name', sql.NVarChar, EMP_Name)
      .input('Image', sql.VarBinary(sql.MAX), image)
      .input('Loc', sql.Int, EMP_LOC_DR || null)
      .input('Dept', sql.Int, EMP_DEPT_DR || null)
      .input('Desig', sql.Int, EMP_DESIG_DR || null)
      .input('DOB', sql.DateTime, EMP_DOB || null)
      .input('Nation', sql.Int, EMP_NATION_DR || null)
      .input('Religion', sql.Int, EMP_RELIGION_DR || null)
      .input('PrevId', sql.NVarChar, EMP_PREV_ID || null)
      .input('JoinDate', sql.DateTime, EMP_JOIN_DATE || null)
      .input('Address', sql.NVarChar, EMP_ADDRESS || null)
      .input('LabNo', sql.NVarChar, EMP_LAB_NO || null)
      .input('MolNo', sql.NVarChar, EMP_MOL_NO || null)
      .input('Ot', sql.Int, EMP_OT_DR || null)
      .input('Bank', sql.Int, EMP_BANK_DR || null)
      .input('Branch', sql.NVarChar, EMP_BRANCH || null)
      .input('AcNo', sql.NVarChar, EMP_AC_NO || null)
      .input('Swift', sql.NVarChar, EMP_SWIFT_CODE || null)
      .input('UniqCode', sql.NVarChar, EMP_UNIQ_CODE || null)
      .query(`
        INSERT INTO HRM_EMP_MASTER (
          EMP_Slno, EMP_Code, EMP_Name, EMP_IMAGE, EMP_LOC_DR, EMP_DEPT_DR, EMP_DESIG_DR, 
          EMP_DOB, EMP_NATION_DR, EMP_RELIGION_DR, EMP_PREV_ID, EMP_JOIN_DATE, 
          EMP_ADDRESS, EMP_LAB_NO, EMP_MOL_NO, EMP_OT_DR, EMP_BANK_DR, 
          EMP_BRANCH, EMP_AC_NO, EMP_SWIFT_CODE, EMP_UNIQ_CODE, emp_stat_flag
        ) VALUES (
          @Slno, @Code, @Name, @Image, @Loc, @Dept, @Desig, 
          @DOB, @Nation, @Religion, @PrevId, @JoinDate, 
          @Address, @LabNo, @MolNo, @Ot, @Bank, 
          @Branch, @AcNo, @Swift, @UniqCode, 1
        )
      `);
    
    res.status(201).json({ message: 'Employee created successfully', id: nextSlno });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      EMP_Code, EMP_Name, EMP_LOC_DR, EMP_DEPT_DR, EMP_DESIG_DR, 
      EMP_DOB, EMP_NATION_DR, EMP_RELIGION_DR, EMP_PREV_ID, 
      EMP_JOIN_DATE, EMP_ADDRESS, EMP_LAB_NO, EMP_MOL_NO, 
      EMP_OT_DR, EMP_BANK_DR, EMP_BRANCH, EMP_AC_NO, 
      EMP_SWIFT_CODE, EMP_UNIQ_CODE 
    } = req.body;

    const image = req.file ? req.file.buffer : null;

    const pool = await getConnection();
    
    let query = `
      UPDATE HRM_EMP_MASTER 
      SET EMP_Code=@Code, EMP_Name=@Name, EMP_LOC_DR=@Loc, 
          EMP_DEPT_DR=@Dept, EMP_DESIG_DR=@Desig, EMP_DOB=@DOB, 
          EMP_NATION_DR=@Nation, EMP_RELIGION_DR=@Religion, 
          EMP_PREV_ID=@PrevId, EMP_JOIN_DATE=@JoinDate, 
          EMP_ADDRESS=@Address, EMP_LAB_NO=@LabNo, EMP_MOL_NO=@MolNo, 
          EMP_OT_DR=@Ot, EMP_BANK_DR=@Bank, EMP_BRANCH=@Branch, 
          EMP_AC_NO=@AcNo, EMP_SWIFT_CODE=@Swift, EMP_UNIQ_CODE=@UniqCode
    `;

    const request = pool.request()
      .input('id', sql.Int, id)
      .input('Code', sql.NVarChar, EMP_Code)
      .input('Name', sql.NVarChar, EMP_Name)
      .input('Loc', sql.Int, EMP_LOC_DR || null)
      .input('Dept', sql.Int, EMP_DEPT_DR || null)
      .input('Desig', sql.Int, EMP_DESIG_DR || null)
      .input('DOB', sql.DateTime, EMP_DOB || null)
      .input('Nation', sql.Int, EMP_NATION_DR || null)
      .input('Religion', sql.Int, EMP_RELIGION_DR || null)
      .input('PrevId', sql.NVarChar, EMP_PREV_ID || null)
      .input('JoinDate', sql.DateTime, EMP_JOIN_DATE || null)
      .input('Address', sql.NVarChar, EMP_ADDRESS || null)
      .input('LabNo', sql.NVarChar, EMP_LAB_NO || null)
      .input('MolNo', sql.NVarChar, EMP_MOL_NO || null)
      .input('Ot', sql.Int, EMP_OT_DR || null)
      .input('Bank', sql.Int, EMP_BANK_DR || null)
      .input('Branch', sql.NVarChar, EMP_BRANCH || null)
      .input('AcNo', sql.NVarChar, EMP_AC_NO || null)
      .input('Swift', sql.NVarChar, EMP_SWIFT_CODE || null)
      .input('UniqCode', sql.NVarChar, EMP_UNIQ_CODE || null);

    if (image) {
      query += `, EMP_IMAGE=@Image`;
      request.input('Image', sql.VarBinary(sql.MAX), image);
    }

    query += ` WHERE EMP_Slno=@id`;

    await request.query(query);
    
    res.json({ message: 'Employee updated successfully' });
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
      .input('id', sql.Int, id)
      .query('UPDATE HRM_EMP_MASTER SET emp_stat_flag = 0 WHERE EMP_Slno=@id');
    
    res.json({ message: 'Employee deactivated successfully' });
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
