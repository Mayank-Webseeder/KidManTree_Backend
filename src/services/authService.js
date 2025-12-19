const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const ParentConsent = require('../models/ParentConsent');
const jwtConfig = require('../config/jwt');
const emailService = require('./emailService');
const smsService = require('./smsService');
const { generateOTP, generateOTPExpiry } = require('../utils/otpGenerator');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const notificationEvents = require('./notificationEvents');

class AuthService {
  async generateToken(user, roleId) {
    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      roleId: roleId,
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
  }

  async verifyToken(token) {
    try {
      return jwt.verify(token, jwtConfig.secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async register(userData) {
    const { name, email, password, contact, age, city, state } = userData;

    // Check if user already exists in main User collection
    const existingUser = await User.findOne({
      $or: [{ email }, { contact }]
    });

    if (existingUser) {
      throw new Error('User with this email or contact already exists');
    }

    // Check if pending user already exists
    const existingPendingUser = await PendingUser.findOne({
      $or: [{ email }, { contact }]
    });

    if (existingPendingUser) {
      // Delete existing pending user to allow re-registration
      await PendingUser.deleteOne({ _id: existingPendingUser._id });
    }

    // Hash password
    console.log(password);
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Hashed password:', hashedPassword);

    // Generate temporary token for verification process
    const tempToken = uuidv4();

    // Create pending user
    const pendingUser = new PendingUser({
      name,
      email,
      password: hashedPassword,
      contact,
      age,
      city,
      state,
      tempToken,
    });

    await pendingUser.save();
    logger.info(`User registered: ${email}`);

    // Send verification OTPs
    await this.sendContactOTP(pendingUser);
    await this.sendEmailOTP(pendingUser);

    return {
      tempToken,
      message: 'Registration initiated. Please verify your contact and email.',
      email,
      contact,
      requiresParentConsent: age < 18
    };
  }

  async login(email, password) {

    const user = await User.findOne({ email, isActive: true }).select("+password");

    if (!user) {
      console.log('User not found or inactive');
      throw new Error('Invalid credentials');
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch (bcryptError) {
    }

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified || !user.isContactVerified) {
      throw new Error('Please verify your email and contact number first');
    }

    if (user.age < 18 && !user.parentConsent) {
      throw new Error('Parent consent required for users under 18');
    }

    if (!user.isActive) {
      return errorResponse(res, "Account is not active", 401);
    }
    let roleId = null;
    let roleData = null;
    try {
      if (user.role === "psychologist") {
        const Psychologist = require("../models/Psychologist");
        roleData = await Psychologist.findOne({ email: user.email });
        roleId = roleData?._id || null;
      } else if (user.role === "admin" || user.role === "superadmin") {
        roleData = null;
        roleId = null;
      } else if (user.role === "user-panel") {
        const UserPanel = require("../models/UserPanel");
        roleData = await UserPanel.findOne({ email: user.email });
        roleId = roleData?._id || null;
      }
    } catch (roleError) {
      logger.error(`Role fetch error for ${user.role}:`, roleError);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = await this.generateToken(user, roleId);

    let userObj = user.toObject();
    delete userObj.password;

    const responseData = {
      token,
      user: {
        ...userObj,
        roleId: roleId
      }
    };


    if (roleData) {
      responseData.roleData = roleData;
    }
    
    logger.info(`User logged in: ${email}`);

    return responseData;
  }

  async sendContactOTP(pendingUser) {
    const otp = generateOTP();
    const expiresAt = generateOTPExpiry();

    // Store OTP in pending user document
    await PendingUser.findByIdAndUpdate(pendingUser._id, {
      $set: {
        'verification.contact.otp': otp,
        'verification.contact.expiresAt': expiresAt,
        'verification.contact.attempts': 0
      }
    });

    // Send SMS
    await smsService.sendOTP(pendingUser.contact, otp);

    return true;
  }

  async sendEmailOTP(pendingUser) {
    const otp = generateOTP();
    const expiresAt = generateOTPExpiry();

    // Store OTP in pending user document
    await PendingUser.findByIdAndUpdate(pendingUser._id, {
      $set: {
        'verification.email.otp': otp,
        'verification.email.expiresAt': expiresAt,
        'verification.email.attempts': 0
      }
    });

    // Send email
    await emailService.sendOTP(pendingUser.email, otp);

    return true;
  }

  async verifyContactOTP(tempToken, otp) {
    const pendingUser = await PendingUser.findOne({ tempToken });

    if (!pendingUser) {
      throw new Error('Invalid verification session');
    }

    const verification = pendingUser.verification?.contact;

    if (!verification || verification.otp !== otp) {
      throw new Error('Invalid OTP');
    }

    if (new Date() > verification.expiresAt) {
      throw new Error('OTP expired');
    }

    // Mark contact as verified
    await PendingUser.findByIdAndUpdate(pendingUser._id, {
      $set: { 'verification.contact.verified': true },
      $unset: {
        'verification.contact.otp': 1,
        'verification.contact.expiresAt': 1
      }
    });

    return { success: true, message: 'Contact verified successfully' };
  }


  async verifyEmailOTP(tempToken, otp) {
    const pendingUser = await PendingUser.findOne({ tempToken });

    if (!pendingUser) {
      throw new Error('Invalid verification session');
    }

    const verification = pendingUser.verification?.email;

    if (!verification || verification.otp !== otp) {
      throw new Error('Invalid OTP');
    }

    if (new Date() > verification.expiresAt) {
      throw new Error('OTP expired');
    }

    // Mark email as verified
    await PendingUser.findByIdAndUpdate(pendingUser._id, {
      $set: { 'verification.email.verified': true },
      $unset: {
        'verification.email.otp': 1,
        'verification.email.expiresAt': 1
      }
    });

    // Check if both contact and email are verified
    const updatedPendingUser = await PendingUser.findById(pendingUser._id);

    if (updatedPendingUser.verification.contact.verified && updatedPendingUser.verification.email.verified) {
      // Create actual user account
      const userDoc = {
        name: updatedPendingUser.name,
        email: updatedPendingUser.email,
        password: updatedPendingUser.password, // Already hashed
        contact: updatedPendingUser.contact,
        age: updatedPendingUser.age,
        city: updatedPendingUser.city,
        state: updatedPendingUser.state,
        isEmailVerified: true,
        isContactVerified: true,
        isActive: updatedPendingUser.age >= 18, // If under 18, will need parent consent
      };

      // Store tempToken for users under 18 for parent consent process
      if (updatedPendingUser.age < 18) {
        userDoc.tempToken = uuidv4();
      }

      const user = new User(userDoc);
      await user.save();

      notificationEvents
        .newPatientOnboarded(user)
        .catch((eventError) =>
          logger.warn(
            "Failed to send onboarding notifications:",
            eventError.message
          )
        );

      // Clean up pending user
      await PendingUser.deleteOne({ _id: pendingUser._id });

      logger.info(`User account created: ${user.email}`);

      // For users 18 and above, auto-login
      if (user.age >= 18) {
        const token = await this.generateToken(user);

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        return {
          accountCreated: true,
          autoLogin: true,
          token,
          user: user,
          message: 'Account created and logged in successfully'
        };
      } else {
        // For users under 18, require parent consent
        return {
          accountCreated: true,
          autoLogin: false,
          user: user,
          needsParentConsent: true,
          tempToken: user.tempToken, // Return tempToken for parent consent process
          message: 'Account created. Parent consent required to activate account.'
        };
      }
    }

    return { success: true, message: 'Email verified successfully' };
  }

  async resendOTP(tempToken, type) {
    const pendingUser = await PendingUser.findOne({ tempToken });

    if (!pendingUser) {
      throw new Error('Invalid verification session');
    }

    if (type === 'email') {
      await this.sendEmailOTP(pendingUser);
    } else if (type === 'contact') {
      await this.sendContactOTP(pendingUser);
    } else {
      throw new Error('Invalid OTP type');
    }

    return true;
  }

  async initiateParentConsent(tempToken, parentEmail, parentContact) {
    // Find user by tempToken (assuming you store tempToken in User model after account creation)
    // You might need to modify this based on how you store tempToken for users under 18
    let user = await User.findOne({ tempToken });

    if (!user) {
      // If tempToken is not in User model, find by other means or store it there
      throw new Error('Invalid temporary token');
    }

    if (user.age >= 18) {
      throw new Error('Parent consent not required for users 18 and above');
    }

    if (user.isActive) {
      throw new Error('User account is already active');
    }

    // Check if parent consent already exists
    let parentConsent = await ParentConsent.findOne({ userId: user._id });

    if (!parentConsent) {
      parentConsent = new ParentConsent({
        userId: user._id,
        parentEmail,
        parentContact,
        tempToken // Store tempToken in ParentConsent for verification
      });
    } else {
      // Update parent details if changed
      parentConsent.parentEmail = parentEmail;
      parentConsent.parentContact = parentContact;
      parentConsent.tempToken = tempToken;
      parentConsent.isVerified = false;
    }

    // Generate OTPs for both email and contact
    const emailOtp = generateOTP();
    const contactOtp = generateOTP();
    const expiresAt = generateOTPExpiry();

    parentConsent.emailOtp = {
      code: emailOtp,
      expiresAt,
      attempts: 0,
      verified: false
    };

    parentConsent.contactOtp = {
      code: contactOtp,
      expiresAt,
      attempts: 0,
      verified: false
    };

    await parentConsent.save();

    // Send OTPs to parent
    await emailService.sendParentConsentOTP(parentEmail, emailOtp, user.name);
    await smsService.sendOTP(parentContact, contactOtp);

    return {
      success: true,
      message: 'Parent consent initiated. OTPs sent to parent email and contact.',
      parentEmail,
      parentContact: parentContact.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2'), // Mask contact for security
      tempToken
    };
  }

  async verifyParentEmailOTP(tempToken, otp) {
    const parentConsent = await ParentConsent.findOne({ tempToken });

    if (!parentConsent) {
      throw new Error('Parent consent session not found');
    }

    if (!parentConsent.emailOtp || parentConsent.emailOtp.code !== otp) {
      throw new Error('Invalid email OTP');
    }

    if (new Date() > parentConsent.emailOtp.expiresAt) {
      throw new Error('Email OTP expired');
    }

    // Mark email as verified
    parentConsent.emailOtp.verified = true;
    await parentConsent.save();

    return { success: true, message: 'Parent email verified successfully' };
  }

  async verifyParentContactOTP(tempToken, otp) {
    const parentConsent = await ParentConsent.findOne({ tempToken });

    if (!parentConsent) {
      throw new Error('Parent consent session not found');
    }

    if (!parentConsent.contactOtp || parentConsent.contactOtp.code !== otp) {
      throw new Error('Invalid contact OTP');
    }

    if (new Date() > parentConsent.contactOtp.expiresAt) {
      throw new Error('Contact OTP expired');
    }

    // Mark contact as verified
    parentConsent.contactOtp.verified = true;
    await parentConsent.save();

    // Check if both email and contact are verified
    if (parentConsent.emailOtp.verified && parentConsent.contactOtp.verified) {
      // Mark parent consent as complete and activate user
      parentConsent.isVerified = true;
      parentConsent.verifiedAt = new Date();
      await parentConsent.save();

      const user = await User.findByIdAndUpdate(
        parentConsent.userId,
        {
          $set: {
            isActive: true,
            parentConsent: parentConsent._id
          },
          $unset: {
            tempToken: 1 // Remove tempToken after successful verification
          }
        },
        { new: true }
      );

      // Auto-login the user
      const token = await this.generateToken(user);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return {
        success: true,
        accountActivated: true,
        autoLogin: true,
        token,
        user: user,
        message: 'Parent consent completed. Account activated and logged in successfully.'
      };
    }

    return { success: true, message: 'Parent contact verified successfully' };
  }

  async resendParentOTP(tempToken, type) {
    const parentConsent = await ParentConsent.findOne({ tempToken });

    if (!parentConsent) {
      throw new Error('Parent consent session not found');
    }

    const user = await User.findById(parentConsent.userId);

    if (type === 'email') {
      await this.sendParentEmailOTP(parentConsent, user.name);
    } else if (type === 'contact') {
      await this.sendParentContactOTP(parentConsent);
    } else {
      throw new Error('Invalid OTP type');
    }

    return true;
  }

  async sendParentEmailOTP(parentConsent, userName) {
    const otp = generateOTP();
    const expiresAt = generateOTPExpiry();

    // Update OTP in parent consent document
    await ParentConsent.findByIdAndUpdate(parentConsent._id, {
      $set: {
        'emailOtp.code': otp,
        'emailOtp.expiresAt': expiresAt,
        'emailOtp.attempts': 0
      }
    });

    // Send email
    await emailService.sendParentConsentOTP(parentConsent.parentEmail, otp, userName);

    return true;
  }

  async sendParentContactOTP(parentConsent) {
    const otp = generateOTP();
    const expiresAt = generateOTPExpiry();

    // Update OTP in parent consent document
    await ParentConsent.findByIdAndUpdate(parentConsent._id, {
      $set: {
        'contactOtp.code': otp,
        'contactOtp.expiresAt': expiresAt,
        'contactOtp.attempts': 0
      }
    });

    // Send SMS
    await smsService.sendOTP(parentConsent.parentContact, otp);

    return true;
  }

  async createAdminUser(email, password, role = 'admin') {
    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      throw new Error('Admin user already exists with this email');
    }

    const randomContact = "+100000" + Math.floor(100000 + Math.random() * 900000);

    const admin = new User({
      name: 'Admin User',
      email,
      password,
      contact: randomContact, // Placeholder for admin
      age: 25,
      role,
      isEmailVerified: true,
      isContactVerified: true,
      isActive: true
    });

    await admin.save();
    logger.info(`Admin user created: ${email}`);

    return {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
    };

  }

  async createPsychologistUser(email, password, psychologistData) {
    const existingPsychologist = await User.findOne({ email });

    if (existingPsychologist) {
      throw new Error('Psychologist user already exists with this email');
    }

    const psychologist = new User({
      name: psychologistData.name || 'Psychologist',
      email,
      password,
      contact: psychologistData.contact || '+1234567890',
      age: psychologistData.age || 25,
      role: 'psychologist',
      isEmailVerified: true,
      isContactVerified: true,
      isActive: true
    });

    await psychologist.save();
    logger.info(`Psychologist user created: ${email}`);

    return psychologist.toSafeObject();
  }

  // Forgot Password functionality
  async initiateForgotPassword(email) {
    const user = await User.findOne({ email, isActive: true });

    if (!user) {
      throw new Error('User not found with this email address');
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset token in user document
    await User.findByIdAndUpdate(user._id, {
      $set: {
        resetToken,
        resetExpires
      }
    });

    // Send reset email
    await emailService.sendPasswordResetEmail(email, resetToken, user.name);

    logger.info(`Password reset initiated for: ${email}`);

    return {
      success: true,
      message: 'Password reset instructions sent to your email address'
    };
  }

  async resetPassword(resetToken, newPassword) {
    const user = await User.findOne({
      resetToken,
      resetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await User.findByIdAndUpdate(user._id, {
      $set: {
        password: hashedPassword
      },
      $unset: {
        resetToken: 1,
        resetExpires: 1
      }
    });

    logger.info(`Password reset completed for: ${user.email}`);

    // Trigger notification
    notificationEvents.passwordChanged(user).catch(err =>
      logger.warn(`Failed to send password reset notification: ${err.message}`)
    );

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await User.findByIdAndUpdate(userId, {
      $set: {
        password: hashedPassword
      }
    });

    logger.info(`Password changed for user: ${user.email}`);

    // Trigger notification
    notificationEvents.passwordChanged(user).catch(err =>
      logger.warn(`Failed to send password change notification: ${err.message}`)
    );

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  // Forgot Password with OTP
  async initiateForgotPasswordOTP(email) {
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      throw new Error('User not found with this email address');
    }

    const otp = generateOTP();
    const expiresAt = generateOTPExpiry(); // e.g., 10 mins validity

    await User.findByIdAndUpdate(user._id, {
      $set: {
        'reset.otp': otp,
        'reset.expiresAt': expiresAt,
        'reset.attempts': 0
      }
    });

    // Send OTP via email
    await emailService.sendOTP(email, otp);

    logger.info(`Password reset OTP sent to: ${email}`);

    return {
      success: true,
      message: 'OTP has been sent to your email address'
    };
  }

  // // Reset password using OTP
  // async resetPasswordWithOTP(email, otp, newPassword, confirmPassword) {
  //   if (newPassword !== confirmPassword) {
  //     throw new Error('New password and confirm password do not match');
  //   }

  //   const user = await User.findOne({ email, isActive: true });
  //   if (!user) {
  //     throw new Error('User not found');
  //   }

  //   const resetData = user.reset || {};
  //   if (!resetData.otp || resetData.otp !== otp) {
  //     throw new Error('Invalid OTP');
  //   }
  //   if (new Date() > resetData.expiresAt) {
  //     throw new Error('OTP expired');
  //   }

  //   // Hash new password
  //   const hashedPassword = await bcrypt.hash(newPassword, 12);

  //   await User.findByIdAndUpdate(user._id, {
  //     $set: { password: hashedPassword },
  //     $unset: { reset: 1 }
  //   });

  //   logger.info(`Password reset successfully for: ${email}`);

  //   return {
  //     success: true,
  //     message: 'Password has been reset successfully'
  //   };
  // }

  async resetPasswordWithOTP(email, otp, newPassword, confirmPassword) {
    if (newPassword !== confirmPassword) {
      throw new Error('New password and confirm password do not match');
    }

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      throw new Error('User not found');
    }

    const resetData = user.reset || {};
    console.log("Stored OTP:", resetData.otp, "Received OTP:", otp);

    if (!resetData.otp || resetData.otp != otp) {
      throw new Error('Invalid OTP');
    }
    if (new Date() > resetData.expiresAt) {
      throw new Error('OTP expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword },
      $unset: { reset: 1 }
    });

    logger.info(`Password reset successfully for: ${email}`);

    // Trigger notification
    notificationEvents.passwordChanged(user).catch(err =>
      logger.warn(`Failed to send password reset notification: ${err.message}`)
    );

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  }

}

module.exports = new AuthService();