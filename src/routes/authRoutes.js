const express = require('express');
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/verify-contact-otp', authController.verifyContactOTP);
router.post('/verify-email-otp', authController.verifyEmailOTP);
router.post('/resend-otp', authController.resendOTP);


router.post('/parent/init', authController.initiateParentConsent);
router.post('/parent/verify-email-otp', authController.verifyParentEmailOTP);
router.post('/parent/verify-contact-otp', authController.verifyParentContactOTP);
router.post('/parent/resend-otp', authController.resendParentOTP);


// Admin routes
router.post('/admin/invite', authenticate, authorize('admin', 'superadmin'), authController.inviteAdmin);
router.get('/admin/verify-invite', authController.verifyAdminInvite);
router.post('/admin/verify-invite', authController.verifyAdminInvite);

// Psychologist routes
router.post('/psychologist/invite', authenticate, authorize('admin', 'superadmin'), authController.invitePsychologist);
router.get('/psychologist/verify-invite', authController.verifyPsychologistInvite);
router.post('/psychologist/verify-invite', authController.verifyPsychologistInvite);

// Protected routes (require authentication)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;