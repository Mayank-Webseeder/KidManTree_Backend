const nodemailer = require('nodemailer');
const emailConfig = require('../config/email');
const logger = require('../utils/logger');

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
        auth: emailConfig.auth
      });

      // Verify connection
      await this.transporter.verify();
      logger.info('✅ Email service initialized successfully');
    } catch (error) {
      logger.error('❌ Email service initialization failed:', error);
    }
  }

  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: emailConfig.templates.otpSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; text-align: center;">Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`OTP email sent to ${email}`);
      return result;
    } catch (error) {
      logger.error('Failed to send OTP email:', error);
      throw error;
    }
  }

  async sendParentConsentOTP(parentEmail, otp, childName) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: parentEmail,
        subject: 'Parent Consent Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Parent Consent Required</h2>
            <p>Your child <strong>${childName}</strong> has requested to join our Mental Health Platform.</p>
            <p>To provide consent, please enter this verification code:</p>
            <div style="text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</span>
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you have any concerns, please contact our support team.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Parent consent OTP sent to ${parentEmail}`);
      return result;
    } catch (error) {
      logger.error('Failed to send parent consent OTP:', error);
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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Admin Account Invitation</h2>
            <p>You have been invited to join as an administrator.</p>
            <p>Click the link below to complete your registration:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${inviteUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
            </div>
            <p>This invitation will expire in 24 hours.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Admin invite sent to ${email}`);
      return result;
    } catch (error) {
      logger.error('Failed to send admin invite:', error);
      throw error;
    }
  }

  async sendPsychologistInvite(email, inviteToken) {
    try {
      const inviteUrl = `${process.env.APP_BASE_URL}/api/auth/psychologist/verify-invite?token=${inviteToken}`;

      const mailOptions = {
        from: emailConfig.from,
        to: email,
        subject: 'Psychologist Account Invitation - KidmanTree',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Psychologist Account Invitation</h2>
            <p>You have been invited to join KidmanTree as a psychologist.</p>
            <p>Click the link below to complete your registration and set up your profile:</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${inviteUrl}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Accept Invitation</a>
            </div>
            <p>This invitation will expire in 24 hours.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Psychologist invite sent to ${email}`);
      return result;
    } catch (error) {
      logger.error('Failed to send psychologist invite:', error);
      throw error;
    }
  }

  async sendPsychologistCredentials(toEmail, fullName, temporaryPassword) {
    try {
      const mailOptions = {
        from: emailConfig.from,
        to: toEmail,
        subject: 'Your Psychologist Account Details - KidmanTree',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to KidmanTree</h2>
            <p>Hi ${fullName || 'Psychologist'},</p>
            <p>Your psychologist account has been created by the administration.</p>
            <p>You can log in using the same login route as other users.</p>
            <div style="margin: 16px 0; padding: 12px 16px; background: #f6f8fa; border-radius: 6px;">
              <p style="margin: 0;">Email: <strong>${toEmail}</strong></p>
              <p style="margin: 0;">Temporary Password: <strong>${temporaryPassword}</strong></p>
            </div>
            <p>Please change your password after logging in.</p>
            <p style="color: #555;">Regards,<br/>KidmanTree Team</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Psychologist credentials email sent to ${toEmail}`);
      return result;
    } catch (error) {
      logger.error('Failed to send psychologist credentials email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(toEmail, resetToken, fullName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const mailOptions = {
        from: emailConfig.from,
        to: toEmail,
        subject: 'Password Reset Request - KidmanTree',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${fullName || 'User'},</p>
            <p>We received a request to reset your password for your KidmanTree account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p><strong>This link will expire in 15 minutes.</strong></p>
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, this link can only be used once.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${toEmail}`);
      return result;
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();