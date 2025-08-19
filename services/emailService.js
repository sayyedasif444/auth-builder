const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    const secureEnv = (process.env.DEFAULT_SMTP_SECURE || 'false').toString().trim().toLowerCase();
    const secureBool = secureEnv === 'true' || secureEnv === '1' || secureEnv === 'yes';
    this.defaultSMTP = {
      host: process.env.DEFAULT_SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.DEFAULT_SMTP_PORT || 587),
      secure: secureBool, // true for 465, false for STARTTLS (e.g., 587)
      auth: {
        user: process.env.DEFAULT_SMTP_USER || '',
        pass: process.env.DEFAULT_SMTP_PASS || ''
      }
    };
  }

  async createTransporter(smtpConfig = null) {
    const base = this.defaultSMTP;
    const config = smtpConfig ? { ...base, ...smtpConfig } : base;
    const parseBool = (v) => {
      if (typeof v === 'boolean') return v;
      if (v == null) return false;
      const s = String(v).trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes';
    };

    const host = config.host;
    const port = Number(config.port || 587);
    const secure = parseBool(config.secure);
    const requireTLS = parseBool(config.requireTLS || process.env.DEFAULT_SMTP_REQUIRE_TLS);
    const authUser = config.auth?.user || config.user;
    const authPass = config.auth?.pass || config.pass;
    const authMethod = config.authMethod || config.auth_method || process.env.DEFAULT_SMTP_AUTH_METHOD; // e.g. 'PLAIN', 'LOGIN'

    const transportOptions = {
      host,
      port,
      secure,
      auth: authUser || authPass ? { user: authUser, pass: authPass } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    };
    if (requireTLS) transportOptions.requireTLS = true;
    if (authMethod) transportOptions.authMethod = authMethod;

    try {
      const transporter = nodemailer.createTransport(transportOptions);

      // Verify connection configuration
      await transporter.verify();
      return transporter;
    } catch (error) {
      console.error('SMTP configuration error:', error);
      throw new Error(`SMTP configuration failed: ${error.message}`);
    }
  }

  async sendOtpEmail({ to, code, purpose = 'verification' }, smtpConfig = null) {
    try {
      const transporter = await this.createTransporter(smtpConfig);
      const subject = purpose === '2fa' ? 'Your 2FA verification code' : 'Your password reset code';
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>${subject}</h2>
          <p>Use the following one-time code:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${code}</div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `;
      const mailOptions = {
        from: smtpConfig?.auth?.user || smtpConfig?.user || this.defaultSMTP.auth.user,
        to,
        subject,
        html
      };
      const result = await transporter.sendMail(mailOptions);
      console.log('OTP email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(userData, smtpConfig = null) {
    try {
      const transporter = await this.createTransporter(smtpConfig);
      
      const mailOptions = {
        from: smtpConfig?.user || this.defaultSMTP.auth.user,
        to: userData.email,
        subject: 'Welcome to Auth Builder - Your Account Details',
        html: this.generateWelcomeEmailHTML(userData)
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Welcome email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  generateWelcomeEmailHTML(userData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Auth Builder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .credentials { background: #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .password { font-family: monospace; font-size: 16px; background: #f3f4f6; padding: 10px; border-radius: 4px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Auth Builder</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${userData.first_name} ${userData.last_name},</h2>
            
            <p>Your account has been successfully created in Auth Builder. Here are your login credentials:</p>
            
            <div class="credentials">
              <p><strong>Email:</strong> ${userData.email}</p>
              <p><strong>Password:</strong> <span class="password">${userData.generatedPassword}</span></p>
            </div>
            
            <div class="warning">
              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            </div>
            
            <p>You can now log in to your account using these credentials.</p>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Auth Builder. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async testSMTPConnection(smtpConfig) {
    try {
      const transporter = await this.createTransporter(smtpConfig);
      await transporter.verify();
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new EmailService();
