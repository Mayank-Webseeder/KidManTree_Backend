const nodemailer = require("nodemailer");
const emailConfig = require("../config/email");
const logger = require("../utils/logger");

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  async initialize() {
    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth,
      });

      // Verify connection
      await this.transporter.verify();
      logger.info("✅ Email service initialized successfully");
    } catch (error) {
      logger.error("❌ Email service initialization failed:", error);
    }
  }

  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: emailConfig.templates.otpSubject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header with gradient and logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <img src="${emailConfig.logoUrl}" alt="Manmitr Logo" style="max-width: 150px; height: auto; margin-bottom: 10px; display: inline-block;" />
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Manmitr</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Manmitr Support Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">Email Verification</h2>
                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Thank you for joining Manmitr. To complete your registration, please use the verification code below:
                        </p>
                        
                        <!-- OTP Box -->
                        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                          <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                          <div style="background-color: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 16px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: bold; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                          </div>
                        </div>
                        
                        <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 20px;">
                            ⏱️ <strong>Important:</strong> This code will expire in 10 minutes for security reasons.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          If you didn't request this verification, please ignore this email or contact our support team if you have concerns.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                          © 2025 Manmitr. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          Your journey of manmitr starts here.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}`);
      return result;
    } catch (error) {
      logger.error("Failed to send OTP email:", error);
      throw error;
    }
  }

  async sendParentConsentOTP(parentEmail, otp, childName) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: parentEmail,
        subject: "Parent Consent Verification",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Parent Consent Required</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header with logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <img src="${emailConfig.logoUrl}" alt="Manmitr Logo" style="max-width: 150px; height: auto; margin-bottom: 10px; display: inline-block;" />
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Manmitr</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Manmitr Support Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">🛡️ Parent Consent Required</h2>
                        <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Dear Parent/Guardian,
                        </p>
                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Your child, <strong style="color: #667eea;">${childName}</strong>, has requested to join Manmitr, our manmitr support platform.
                        </p>
                        
                        <div style="background-color: #ebf4ff; border-left: 4px solid #4299e1; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 20px;">
                            ℹ️ <strong>What is Manmitr?</strong><br/>
                            Manmitr provides professional mental health support, mindfulness tools, and counseling services in a safe, monitored environment.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          To provide your consent, please enter this verification code:
                        </p>
                        
                        <!-- OTP Box -->
                        <div style="background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                          <p style="margin: 0 0 10px 0; color: #1a202c; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                          <div style="background-color: rgba(255, 255, 255, 0.9); border-radius: 8px; padding: 16px; display: inline-block;">
                            <span style="font-size: 36px; font-weight: bold; color: #2d3748; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                          </div>
                        </div>
                        
                        <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 20px;">
                            ⏱️ This code will expire in 10 minutes.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          If you have any questions or concerns about your child using Manmitr, please don't hesitate to contact our support team.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                          © 2024 Manmitr. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          Supporting your family's mental wellness.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Parent consent OTP sent to ${parentEmail}`);
      return result;
    } catch (error) {
      logger.error("Failed to send parent consent OTP:", error);
      throw error;
    }
  }

  async sendAdminInvite(email, inviteToken) {
    try {
      const inviteUrl = `${process.env.APP_BASE_URL}/api/auth/admin/verify-invite?token=${inviteToken}`;

      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: emailConfig.templates.adminInviteSubject,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Account Invitation</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header with logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <img src="${emailConfig.logoUrl}" alt="Manmitr Logo" style="max-width: 150px; height: auto; margin-bottom: 10px; display: inline-block;" />
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Manmitr</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Manmitr Support Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">👋 You're Invited!</h2>
                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Congratulations! You have been invited to join Manmitr as an <strong style="color: #667eea;">Administrator</strong>.
                        </p>
                        
                        <div style="background-color: #ebf4ff; border-left: 4px solid #4299e1; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 20px;">
                            ℹ️ <strong>Admin Responsibilities:</strong><br/>
                            As an administrator, you'll have access to manage users, psychologists, content, and oversee platform operations.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 30px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Click the button below to accept your invitation and complete your registration:
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                            Accept Invitation
                          </a>
                        </div>
                        
                        <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 8px 0 0 0; color: #667eea; font-size: 12px; word-break: break-all;">
                          ${inviteUrl}
                        </p>
                        
                        <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #742a2a; font-size: 14px; line-height: 20px;">
                            ⏱️ <strong>Note:</strong> This invitation will expire in 24 hours for security reasons.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          If you didn't expect this invitation, please ignore this email or contact our support team.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                          © 2024 Manmitr. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          Your journey of Manmitr starts here.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Admin invite sent to ${email}`);
      return result;
    } catch (error) {
      logger.error("Failed to send admin invite:", error);
      throw error;
    }
  }

  async sendPsychologistCredentials(toEmail, fullName, temporaryPassword) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: toEmail,
        subject: "Your Psychologist Account Details - Manmitr",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Psychologist Account</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header with logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <img src="${emailConfig.logoUrl}" alt="Manmitr Logo" style="max-width: 150px; height: auto; margin-bottom: 10px; display: inline-block;" />
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Manmitr</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Manmitr Support Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">🎉 Welcome to Manmitr!</h2>
                        <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Hi <strong style="color: #667eea;">${fullName || "Psychologist"}</strong>,
                        </p>
                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Your psychologist account has been successfully created by our administration team. We're excited to have you join our community of Manmitr health professionals!
                        </p>
                        
                        <div style="background-color: #f0fff4; border-left: 4px solid #48bb78; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0 0 8px 0; color: #22543d; font-size: 14px; font-weight: 600;">
                            ✅ Your Account Credentials
                          </p>
                          <p style="margin: 0; color: #276749; font-size: 14px; line-height: 20px;">
                            You can use these credentials to log in through the same route as other users.
                          </p>
                        </div>
                        
                        <!-- Credentials Box -->
                        <div style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 12px; padding: 24px; margin: 30px 0;">
                          <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.1);">
                                <p style="margin: 0; color: #2d3748; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                                <p style="margin: 4px 0 0 0; color: #1a202c; font-size: 16px; font-weight: 600; word-break: break-all;">${toEmail}</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0;">
                                <p style="margin: 0; color: #2d3748; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password</p>
                                <p style="margin: 4px 0 0 0; color: #1a202c; font-size: 16px; font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 1px;">${temporaryPassword}</p>
                              </td>
                            </tr>
                          </table>
                        </div>
                        
                        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 20px;">
                            🔒 <strong>Security Notice:</strong> Please change your password immediately after logging in to ensure your account security.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          If you have any questions or need assistance getting started, our support team is here to help.
                        </p>
                        
                        <p style="margin: 24px 0 0 0; color: #4a5568; font-size: 15px; line-height: 22px;">
                          Best regards,<br/>
                          <strong style="color: #667eea;">The Manmitr Team</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                          © 2024 Manmitr. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          Empowering mental health professionals.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Psychologist credentials email sent to ${toEmail}`);
      return result;
    } catch (error) {
      logger.error("Failed to send psychologist credentials email:", error);
      throw error;
    }
  }

  async sendPasswordResetEmail(toEmail, resetToken, fullName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"
        }/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: emailConfig.from,
        to: toEmail,
        subject: "Password Reset Request - Manmitr",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Request</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
                    <!-- Header with logo -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <img src="${emailConfig.logoUrl}" alt="Manmitr Logo" style="max-width: 150px; height: auto; margin-bottom: 10px; display: inline-block;" />
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Manmitr</h1>
                        <p style="margin: 10px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Manmitr Support Platform</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1a202c; font-size: 24px; font-weight: 600;">🔐 Password Reset Request</h2>
                        <p style="margin: 0 0 16px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          Hi <strong style="color: #667eea;">${fullName || "User"}</strong>,
                        </p>
                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 24px;">
                          We received a request to reset the password for your Manmitr account. If you made this request, click the button below to create a new password:
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">
                            Reset My Password
                          </a>
                        </div>
                        
                        <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px; line-height: 20px;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 8px 0 0 0; color: #667eea; font-size: 12px; word-break: break-all;">
                          ${resetUrl}
                        </p>
                        
                        <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0 0 8px 0; color: #742a2a; font-size: 14px; line-height: 20px; font-weight: 600;">
                            ⚠️ Important Security Information:
                          </p>
                          <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #742a2a; font-size: 13px; line-height: 18px;">
                            <li style="margin-bottom: 4px;">This link will <strong>expire in 15 minutes</strong></li>
                            <li style="margin-bottom: 4px;">This link can only be used <strong>once</strong></li>
                            <li>If you request another reset, this link will become invalid</li>
                          </ul>
                        </div>
                        
                        <div style="background-color: #ebf8ff; border-left: 4px solid #4299e1; padding: 16px; border-radius: 4px; margin: 24px 0;">
                          <p style="margin: 0; color: #2c5282; font-size: 14px; line-height: 20px;">
                            ℹ️ <strong>Didn't request this?</strong><br/>
                            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                          </p>
                        </div>
                        
                        <p style="margin: 24px 0 0 0; color: #718096; font-size: 13px; line-height: 18px;">
                          <em>This is an automated security message. Please do not reply to this email. If you need assistance, please contact our support team.</em>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f7fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 8px 0; color: #718096; font-size: 13px;">
                          © 2024 Manmitr. All rights reserved.
                        </p>
                        <p style="margin: 0; color: #a0aec0; font-size: 12px;">
                          Keeping your account secure.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${toEmail}`);
      return result;
    } catch (error) {
      logger.error("Failed to send password reset email:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
