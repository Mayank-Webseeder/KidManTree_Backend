const express = require('express');
const Psychologist = require('../models/Psychologist');
const User = require('../models/User');
const { authenticate, authorize } = require('../middlewares/auth');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const router = express.Router();

// Get all psychologists (public)
router.get('/', async (req, res) => {
  try {
    const { specialization, search } = req.query;
    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || '10', 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const query = { isActive: true };

    if (specialization) {
      query.specializations = { $in: [specialization] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specializations: { $regex: search, $options: 'i' } }
      ];
    }

    const psychologists = await Psychologist.find(query)
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Psychologist.countDocuments(query);

    return successResponse(res, {
      psychologists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    logger.error('Get psychologists error:', error);
    return errorResponse(res, 'Failed to retrieve psychologists', 500);
  }
});

// Get all psychologists without any filters (public)
router.get('/getallphycologist', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || '10', 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const query = { isActive: true };

    const psychologists = await Psychologist.find(query)
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Psychologist.countDocuments(query);

    return successResponse(res, {
      psychologists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    logger.error('Get all psychologists (no filter) error:', error);
    return errorResponse(res, 'Failed to retrieve psychologists', 500);
  }
});

// Get psychologist by ID
router.get('/:id', async (req, res) => {
  try {
    const psychologist = await Psychologist.findOne({
      _id: req.params.id,
      isActive: true
    }).populate('reviews.user', 'name profile.avatar');

    if (!psychologist) {
      return errorResponse(res, 'Psychologist not found', 404);
    }

    return successResponse(res, { psychologist });
  } catch (error) {
    logger.error('Get psychologist error:', error);
    return errorResponse(res, 'Failed to retrieve psychologist', 500);
  }
});

// Psychologist profile management (authenticated psychologist)
router.get('/profile/me', authenticate, authorize('psychologist'), async (req, res) => {
  try {
    const psychologist = await Psychologist.findOne({ email: req.user.email });

    if (!psychologist) {
      return errorResponse(res, 'Psychologist profile not found', 404);
    }

    return successResponse(res, { psychologist });
  } catch (error) {
    logger.error('Get psychologist profile error:', error);
    return errorResponse(res, 'Failed to retrieve psychologist profile', 500);
  }
});

router.put('/profile/me', authenticate, authorize('psychologist'), async (req, res) => {
  try {
    const psychologist = await Psychologist.findOneAndUpdate(
      { email: req.user.email },
      req.body,
      { new: true, runValidators: true }
    );

    if (!psychologist) {
      return errorResponse(res, 'Psychologist profile not found', 404);
    }

    return successResponse(res, { psychologist }, 'Profile updated successfully');
  } catch (error) {
    logger.error('Update psychologist profile error:', error);
    return errorResponse(res, 'Failed to update psychologist profile', 500);
  }
});

// Admin routes for managing psychologists
router.post('/', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      degree,
      experience,
      about,
      specializations,
      languages,
      sessionRate,
      city,
      contactNumber,
      role,
      aadharNumber,
      aadharDocument,
      uploadDocuments
    } = req.body;

    if (!firstName || !lastName || !email || !password || !degree || experience === undefined ||
      !city || !contactNumber || !aadharNumber || !aadharDocument) {
      return errorResponse(res, 'firstName, lastName, email, password, degree, experience, city, contactNumber, aadharNumber, aadharDocument are required', 400);
    }

    // Create user with psychologist role
    const fullName = `${firstName} ${lastName}`.trim();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User already exists with this email', 409);
    }

    // Check if contact number already exists
    const existingContact = await User.findOne({ contact: contactNumber });
    if (existingContact) {
      return errorResponse(res, 'User already exists with this contact number', 409);
    }

    // Check if aadhar number already exists
    const existingAadhar = await Psychologist.findOne({ aadharNumber });
    if (existingAadhar) {
      return errorResponse(res, 'Psychologist already exists with this Aadhar number', 409);
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: fullName,
      email,
      password: hashedPassword,
      contact: contactNumber,
      age: 25,
      role: 'psychologist',
      isEmailVerified: true,
      isContactVerified: true,
      isActive: true
    });

    // Create psychologist profile
    const psychologist = await Psychologist.create({
      name: fullName,
      email,
      degree,
      experience,
      about,
      specializations,
      languages,
      sessionRate,
      city,
      contactNumber,
      role: role || 'psychologist',
      aadharNumber,
      aadharDocument,
      uploadDocuments: uploadDocuments || [],
      isActive: true
    });

    // Send credentials via email
    const emailService = require('../services/emailService');
    await emailService.sendPsychologistCredentials(email, fullName, password);

    return successResponse(res, { user, psychologist }, 'Psychologist created and credentials emailed', 201);
  } catch (error) {
    logger.error('Create psychologist error:', error);
    return errorResponse(res, error.message || 'Failed to create psychologist', 500);
  }
});

router.put('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const psychologist = await Psychologist.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!psychologist) {
      return errorResponse(res, 'Psychologist not found', 404);
    }

    return successResponse(res, { psychologist }, 'Psychologist updated successfully');
  } catch (error) {
    logger.error('Update psychologist error:', error);
    return errorResponse(res, 'Failed to update psychologist', 500);
  }
});

router.delete('/:id', authenticate, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const psychologist = await Psychologist.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!psychologist) {
      return errorResponse(res, 'Psychologist not found', 404);
    }

    // Also deactivate the user account
    await User.findOneAndUpdate(
      { email: psychologist.email },
      { isActive: false }
    );

    return successResponse(res, null, 'Psychologist deactivated successfully');
  } catch (error) {
    logger.error('Delete psychologist error:', error);
    return errorResponse(res, 'Failed to deactivate psychologist', 500);
  }
});

// Route for psychologists to deactivate their own account
router.delete('/profile/me', authenticate, authorize('psychologist'), async (req, res) => {
  try {
    const psychologist = await Psychologist.findOneAndUpdate(
      { email: req.user.email },
      { isActive: false },
      { new: true }
    );

    if (!psychologist) {
      return errorResponse(res, 'Psychologist profile not found', 404);
    }

    // Also deactivate the user account
    await User.findByIdAndUpdate(
      req.user.id,
      { isActive: false }
    );

    return successResponse(res, null, 'Account deactivated successfully');
  } catch (error) {
    logger.error('Deactivate psychologist account error:', error);
    return errorResponse(res, 'Failed to deactivate account', 500);
  }
});

module.exports = router;