const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { auth, admin } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const pool = await getConnection();
    
    // 1. First, try finding user in the new Users table
    let userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT TOP 1 * FROM Users WHERE username = @username');

    let user = userResult.recordset[0];
    let isNewTable = false;

    if (user) {
      isNewTable = true;
    } else {
      // 2. Fallback to USER_DEFINITION table
      userResult = await pool.request()
        .input('username', sql.NVarChar, username)
        .query('SELECT TOP 1 * FROM USER_DEFINITION WHERE USR_UserID = @username');
      user = userResult.recordset[0];
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Check password
    let isMatch = false;
    if (isNewTable) {
      // For the new Users table, we check 'password' column (using bcrypt)
      isMatch = await bcrypt.compare(password, user.password);
      
      // Fallback for plain text if bcrypt fails (during migration)
      if (!isMatch) {
        isMatch = (password === user.password);
      }
    } else {
      // For USER_DEFINITION, we check 'PASSWORD' column (plain text/legacy)
      isMatch = (password === user.PASSWORD); 
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Create JWT
    const userData = isNewTable ? {
      id: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      role: user.role || 'user',
      permissions: user.permissions ? JSON.parse(user.permissions) : null
    } : {
      id: user.USR_UserID,
      name: user.USR_Name,
      email: user.USR_EMAIL_ID,
      role: user.USR_ROLE || 'user',
      permissions: null
    };

    const payload = {
      user: userData
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'hrpay_secret_key_2026',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hrpay_secret_key_2026');
    
    const pool = await getConnection();
    
    // Check Users table first
    let userResult = await pool.request()
      .input('id', sql.NVarChar, decoded.user.id)
      .query('SELECT username as id, name, role, permissions FROM Users WHERE username = @id');

    let user = userResult.recordset[0];

    if (!user) {
      // Fallback to USER_DEFINITION
      userResult = await pool.request()
        .input('id', sql.NVarChar, decoded.user.id)
        .query('SELECT USR_UserID as id, USR_Name as name, USR_ROLE as role FROM USER_DEFINITION WHERE USR_UserID = @id');
      user = userResult.recordset[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      department: user.department,
      designation: user.designation,
      role: user.role || 'user',
      permissions: user.permissions ? JSON.parse(user.permissions) : null
    });

  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
});

/**
 * Helper to decode passwords from USER_DEFINITION
 */
const decodePassword = (encoded) => {
  if (!encoded) return '';
  try {
    // Attempt Base64 decoding as it's common for these types of database passwords
    return Buffer.from(encoded, 'base64').toString('utf8');
  } catch (e) {
    // If it fails or isn't Base64, return original
    return encoded;
  }
};

/**
 * @route   GET /api/auth/users
 * @desc    Get all users from USER_DEFINITION
 * @access  Private (Admin)
 */
router.get('/users', auth, admin, async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Get all employees and link with Users/USER_DEFINITION for emails
    // This allows Message Broadcast to find all employees and User Roles to manage them
    const result = await pool.request().query(`
      SELECT 
        e.EMP_Code as USR_UserID, 
        e.EMP_Name as USR_Name, 
        ISNULL(e.EMP_EMAIL, ISNULL(u.email, ud.USR_EMAIL_ID)) as email,
        dept.COM_DESC as department,
        desig.COM_DESC as designation,
        u.role, 
        u.permissions, 
        CASE 
          WHEN u.username IS NOT NULL THEN 'new' 
          WHEN ud.USR_UserID IS NOT NULL THEN 'legacy'
          ELSE 'employee'
        END as source
      FROM HRM_EMP_MASTER e
      LEFT JOIN Users u ON e.EMP_Code = u.username
      LEFT JOIN USER_DEFINITION ud ON e.EMP_Code = ud.USR_UserID
      LEFT JOIN COMMONCODES dept ON e.EMP_DEPT_DR = dept.COM_SLNO AND dept.COM_TYPE = 39
      LEFT JOIN COMMONCODES desig ON e.EMP_DESIG_DR = desig.COM_SLNO AND desig.COM_TYPE = 40
      WHERE e.emp_stat_flag = 1
      ORDER BY e.EMP_Name
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error fetching user list' });
  }
});

/**
 * @route   POST /api/auth/update-profile
 * @desc    Update user profile information
 * @access  Private
 */
router.post('/update-profile', auth, async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const pool = await getConnection();

    // 1. Try finding in Users table first
    let userResult = await pool.request()
      .input('username', sql.NVarChar, userId)
      .query('SELECT * FROM Users WHERE username = @username');

    let user = userResult.recordset[0];

    if (user) {
      // Update new Users table
      await pool.request()
        .input('username', sql.NVarChar, userId)
        .input('name', sql.NVarChar, name)
        .input('email', sql.NVarChar, email)
        .input('phone', sql.NVarChar, phone)
        .query(`
          UPDATE Users 
          SET name = @name, email = @email, phone = @phone 
          WHERE username = @username
        `);
    } else {
      // Fallback to USER_DEFINITION
      await pool.request()
        .input('username', sql.NVarChar, userId)
        .input('name', sql.NVarChar, name)
        .input('email', sql.NVarChar, email)
        .query(`
          UPDATE USER_DEFINITION 
          SET USR_Name = @name, USR_EMAIL_ID = @email 
          WHERE USR_UserID = @username
        `);
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

/**
 * @route   POST /api/auth/update-password
 * @desc    Update user password
 * @access  Private
 */
router.post('/update-password', auth, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const pool = await getConnection();

    // 1. Try finding in Users table first
    let userResult = await pool.request()
      .input('username', sql.NVarChar, userId)
      .query('SELECT * FROM Users WHERE username = @username');

    let user = userResult.recordset[0];
    let isNewTable = false;

    if (user) {
      isNewTable = true;
    } else {
      // 2. Fallback to USER_DEFINITION
      userResult = await pool.request()
        .input('username', sql.NVarChar, userId)
        .query('SELECT * FROM USER_DEFINITION WHERE USR_UserID = @username');
      user = userResult.recordset[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. Verify current password
    const dbPassword = isNewTable ? user.password : user.PASSWORD;
    let isCurrentMatch = false;
    
    if (isNewTable) {
      isCurrentMatch = await bcrypt.compare(currentPassword, dbPassword);
      // Fallback for plain text
      if (!isCurrentMatch) isCurrentMatch = (currentPassword === dbPassword);
    } else {
      isCurrentMatch = (currentPassword === dbPassword);
    }

    if (!isCurrentMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // 4. Update password
    if (isNewTable) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.request()
        .input('username', sql.NVarChar, userId)
        .input('newPassword', sql.NVarChar, hashedPassword)
        .query('UPDATE Users SET password = @newPassword WHERE username = @username');
    } else {
      await pool.request()
        .input('username', sql.NVarChar, userId)
        .input('newPassword', sql.NVarChar, newPassword)
        .query('UPDATE USER_DEFINITION SET PASSWORD = @newPassword WHERE USR_UserID = @username');
    }

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Server error updating password' });
  }
});

/**
 * @route   GET /api/auth/master-data
 * @desc    Get Departments and Designations for dropdowns
 * @access  Private
 */
router.get('/master-data', auth, async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Helper function to execute query safely
    const safeQuery = async (query) => {
      try {
        const result = await pool.request().query(query);
        return result.recordset;
      } catch (err) {
        console.error(`Query failed: ${query}`, err.message);
        return [];
      }
    };

    const departments = await safeQuery(`
      SELECT COM_SLNO as id, COM_DESC as name 
      FROM COMMONCODES 
      WHERE COM_TYPE = 39 
      ORDER BY COM_DESC
    `);

    const designations = await safeQuery(`
      SELECT COM_SLNO as id, COM_DESC as name 
      FROM COMMONCODES 
      WHERE COM_TYPE = 40 
      ORDER BY COM_DESC
    `);

    const employees = await safeQuery(`
      SELECT EMP_Slno as id, EMP_Name as name, EMP_Code as code
      FROM HRM_EMP_MASTER
      WHERE emp_stat_flag = 1
      ORDER BY EMP_Name
    `);

    const locations = await safeQuery(`
      SELECT DISTINCT c.COM_SLNO as id, c.COM_DESC as name 
      FROM COMMONCODES c
      INNER JOIN HRM_EMP_MASTER h ON h.EMP_LOC_DR = c.COM_SLNO
      ORDER BY c.COM_DESC
    `);

    const sections = await safeQuery(`
      SELECT DISTINCT c.COM_SLNO as id, c.COM_DESC as name 
      FROM COMMONCODES c
      INNER JOIN HRM_EMP_MASTER h ON h.EMP_SECTION_DR = c.COM_SLNO
      ORDER BY c.COM_DESC
    `);

    const companies = await safeQuery(`
      SELECT COM_NAME as id, COM_NAME as name
      FROM COMPANY
      ORDER BY COM_NAME
    `);

    const projects = await safeQuery(`
      SELECT DISTINCT c.COM_SLNO as id, c.COM_DESC as name 
      FROM COMMONCODES c
      INNER JOIN HRM_EMP_PROJECT_TRADE_MAP m ON m.EPT_PROJECT_DR = c.COM_SLNO
      ORDER BY c.COM_DESC
    `);

    const attendanceStatuses = await safeQuery(`
      SELECT DISTINCT name FROM (
        SELECT COM_DESC as name 
        FROM COMMONCODES 
        WHERE COM_TYPE = 44 
        UNION
        SELECT 'Present' as name
        UNION
        SELECT 'Absent' as name
        UNION
        SELECT 'Vacation' as name
        UNION
        SELECT 'Holiday' as name
      ) AS Statuses
      ORDER BY name
    `);

    res.json({
      departments,
      designations,
      employees,
      locations,
      sections,
      companies,
      projects,
      attendanceStatuses
    });
  } catch (error) {
    console.error('Error fetching master data:', error);
    res.status(500).json({ error: 'Server error fetching master data' });
  }
});

/**
 * @route   POST /api/auth/create-user
 * @desc    Create a new user with role
 * @access  Private/Admin
 */
router.post('/create-user', auth, admin, async (req, res) => {
  try {
    const { username, password, name, role, email, phone, department, designation, permissions } = req.body;
    
    if (!username || !password || !name) {
      return res.status(400).json({ error: 'Username, password and name are required' });
    }

    const pool = await getConnection();

    // Check if user exists in either table
    const checkUser = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT username FROM Users WHERE username = @username');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.request()
      .input('username', sql.NVarChar, username)
      .input('password', sql.NVarChar, hashedPassword)
      .input('name', sql.NVarChar, name)
      .input('role', sql.NVarChar, role || 'user')
      .input('email', sql.NVarChar, email || null)
      .input('phone', sql.NVarChar, phone || null)
      .input('department', sql.NVarChar, department || null)
      .input('designation', sql.NVarChar, designation || null)
      .input('permissions', sql.NVarChar, permissions ? JSON.stringify(permissions) : null)
      .query(`
        INSERT INTO Users (username, password, name, role, email, phone, department, designation, permissions)
        VALUES (@username, @password, @name, @role, @email, @phone, @department, @designation, @permissions)
      `);

    res.json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

/**
 * @route   PUT /api/auth/users/:username
 * @desc    Update user details (Admin)
 * @access  Private/Admin
 */
router.put('/users/:username', auth, admin, async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, email, phone, department, designation, permissions } = req.body;
    
    const pool = await getConnection();

    // Check if user exists
    const userResult = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Users WHERE username = @username');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = `
      UPDATE Users 
      SET role = @role, 
          email = @email, 
          phone = @phone, 
          department = @department, 
          designation = @designation,
          permissions = @permissions
    `;

    const request = pool.request()
      .input('username', sql.NVarChar, username)
      .input('role', sql.NVarChar, role)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('department', sql.NVarChar, department)
      .input('designation', sql.NVarChar, designation)
      .input('permissions', sql.NVarChar, permissions ? JSON.stringify(permissions) : null);

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = @password`;
      request.input('password', sql.NVarChar, hashedPassword);
    }

    query += ` WHERE username = @username`;

    await request.query(query);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

/**
 * @route   DELETE /api/auth/users/:username
 * @desc    Delete a user
 * @access  Private/Admin
 */
router.delete('/users/:username', auth, admin, async (req, res) => {
  try {
    const { username } = req.params;
    const pool = await getConnection();

    await pool.request()
      .input('username', sql.NVarChar, username)
      .query('DELETE FROM Users WHERE username = @username');

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

module.exports = router;
