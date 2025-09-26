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
    const { specialization, page = 1, limit = 10, search } = req.query;
    
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
      .select('-reviews') // Exclude reviews for list view
      .sort({ rating: -1, name: 1 })
      .limit(limit * 1)
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
    const psychologist = new Psychologist(req.body);
    await psychologist.save();

    return successResponse(res, { psychologist }, 'Psychologist created successfully', 201);
  } catch (error) {
    logger.error('Create psychologist error:', error);
    return errorResponse(res, 'Failed to create psychologist', 500);
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