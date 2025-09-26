const emailConfig = {
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  from: process.env.EMAIL_FROM || 'Mental Health Platform <noreply@mentalhealthplatform.com>',
  templates: {
    otpSubject: 'Your OTP Verification Code',
    adminInviteSubject: 'Admin Account Invitation'
  }
};

module.exports = emailConfig;