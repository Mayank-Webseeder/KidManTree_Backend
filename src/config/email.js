const emailConfig = {
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  from: process.env.EMAIL_FROM || 'Manmitr <noreply@manmitr.com>',
  logoUrl: process.env.EMAIL_LOGO_URL || `${process.env.APP_BASE_URL || 'http://localhost:8000'}/public/assets/images/manmitr-logo.png`,
  templates: {
    otpSubject: 'Your OTP Verification Code',
    adminInviteSubject: 'Admin Account Invitation'
  }
};

module.exports = emailConfig;