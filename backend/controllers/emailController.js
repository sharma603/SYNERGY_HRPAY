const nodemailer = require('nodemailer');

/**
 * Send email to employee
 */
const sendEmployeeEmail = async (req, res) => {
  try {
    const { to, subject, message, employeeName } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ error: 'Recipient, subject and message are required' });
    }

    const pool = await getConnection();
    const companyResult = await pool.request().query('SELECT TOP 1 COM_NAME FROM COMPANY');
    const companyName = companyResult.recordset[0]?.COM_NAME || 'SYNERGY HRPAY';

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: parseInt(process.env.EMAIL_PORT) === 465, 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: `
        <div style="background-color: #f1f5f9; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background-color: #0F172A; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">${companyName}</h1>
              <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase;">Employee Communications</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px;">Dear ${employeeName || 'Employee'},</h2>
              
              <div style="color: #475569; line-height: 1.6; font-size: 16px;">
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                Sent via <strong>${companyName}</strong> Management Portal.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} ${companyName} Management System</p>
          </div>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email. Please check SMTP settings in .env file.',
      details: error.message 
    });
  }
};

module.exports = {
  sendEmployeeEmail
};
