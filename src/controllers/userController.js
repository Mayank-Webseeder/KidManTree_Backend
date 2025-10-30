const User = require("../models/User");
const Psychologist = require("../models/Psychologist");
const Appointment = require("../models/Appointment");
const NotificationPrefs = require("../models/NotificationPrefs");
const DeletionRequest = require("../models/DeletionRequest");
const { successResponse, errorResponse } = require("../utils/response");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");

class UserController {
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id)
        .populate("notificationPrefs")
        .select("-password");

      return successResponse(res, { user }, "Profile retrieved successfully");
    } catch (error) {
      logger.error("Get profile error:", error);
      return errorResponse(res, "Failed to retrieve profile", 500);
    }
  }

  async updateProfile(req, res) {
    try {
      const { name, bio, interests, emergencyContact } = req.body;
      const userId = req.user.id;

      const updateData = {};
      if (name) updateData.name = name;
      if (bio !== undefined) updateData["profile.bio"] = bio;
      if (interests) updateData["profile.interests"] = interests;
      if (emergencyContact)
        updateData["profile.emergencyContact"] = emergencyContact;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateData },
        { new: true, select: "-password" }
      );

      return successResponse(res, { user }, "Profile updated successfully");
    } catch (error) {
      logger.error("Update profile error:", error);
      return errorResponse(res, "Failed to update profile", 500);
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword, retypePassword } = req.body;
      const userId = req.user.id;

      if (!currentPassword || !newPassword || !retypePassword) {
        return errorResponse(res, "All password fields are required", 400);
      }

      if (newPassword !== retypePassword) {
        return errorResponse(res, "New passwords do not match", 400);
      }

      if (newPassword.length < 8) {
        return errorResponse(
          res,
          "New password must be at least 8 characters long",
          400
        );
      }

      const user = await User.findById(userId);
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );

      if (!isCurrentPasswordValid) {
        return errorResponse(res, "Current password is incorrect", 400);
      }

      user.password = newPassword;
      await user.save();

      return successResponse(res, null, "Password changed successfully");
    } catch (error) {
      logger.error("Change password error:", error);
      return errorResponse(res, "Failed to change password", 500);
    }
  }

  async updateNotificationPrefs(req, res) {
    try {
      const userId = req.user.id;
      const prefs = req.body;

      let notificationPrefs = await NotificationPrefs.findOne({ user: userId });

      if (!notificationPrefs) {
        notificationPrefs = new NotificationPrefs({
          user: userId,
          ...prefs,
        });
      } else {
        Object.assign(notificationPrefs, prefs);
      }

      await notificationPrefs.save();

      // Update user reference if not exists
      await User.findByIdAndUpdate(userId, {
        notificationPrefs: notificationPrefs._id,
      });

      return successResponse(
        res,
        { preferences: notificationPrefs },
        "Notification preferences updated"
      );
    } catch (error) {
      logger.error("Update notification prefs error:", error);
      return errorResponse(res, "Failed to update preferences", 500);
    }
  }

  async requestAccountDeletion(req, res) {
    try {
      const { reason } = req.body;
      const userId = req.user.id;

      // Check if there's already a pending request
      const existingRequest = await DeletionRequest.findOne({
        user: userId,
        status: "pending",
      });

      if (existingRequest) {
        return errorResponse(
          res,
          "Account deletion request already pending",
          409
        );
      }

      const confirmationToken = uuidv4();

      const deletionRequest = new DeletionRequest({
        user: userId,
        reason,
        confirmationToken,
      });

      await deletionRequest.save();

      // Send confirmation email (implementation depends on your email service)
      // await emailService.sendDeletionConfirmation(req.user.email, confirmationToken);

      return successResponse(
        res,
        {
          requestId: deletionRequest._id,
          message:
            "Account deletion requested. Please check your email for confirmation.",
        },
        "Deletion request submitted"
      );
    } catch (error) {
      logger.error("Account deletion request error:", error);
      return errorResponse(res, "Failed to process deletion request", 500);
    }
  }

  async confirmAccountDeletion(req, res) {
    try {
      const { token } = req.query;
      const userId = req.user.id;

      const deletionRequest = await DeletionRequest.findOne({
        user: userId,
        confirmationToken: token,
        status: "pending",
      });

      if (!deletionRequest) {
        return errorResponse(res, "Invalid or expired deletion request", 400);
      }

      if (new Date() > deletionRequest.expiresAt) {
        return errorResponse(res, "Deletion request expired", 400);
      }

      // Mark request as approved (actual deletion would be handled by admin)
      deletionRequest.status = "approved";
      deletionRequest.processedAt = new Date();
      await deletionRequest.save();

      // Deactivate user account
      await User.findByIdAndUpdate(userId, { isActive: false });

      return successResponse(
        res,
        null,
        "Account deletion confirmed. Your account will be deleted within 30 days."
      );
    } catch (error) {
      logger.error("Confirm account deletion error:", error);
      return errorResponse(res, "Failed to confirm deletion", 500);
    }
  }

  async getBookingHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const query = { user: userId };
      if (status) {
        query.status = status;
      }

      const appointments = await Appointment.find(query)
        .populate("psychologist", "name specializations rating")
        .sort({ dateTime: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Appointment.countDocuments(query);

      return successResponse(
        res,
        {
          appointments,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasMore: page < Math.ceil(total / limit),
          },
        },
        "Booking history retrieved successfully"
      );
    } catch (error) {
      logger.error("Get booking history error:", error);
      return errorResponse(res, "Failed to retrieve booking history", 500);
    }
  }

  // Admin/Superadmin: List users with filters (role, isActive, search, pagination)
  async adminListUsers(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
      const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
      const limit = Math.min(Math.max(limitRaw, 1), 100);
      const { role, isActive, search } = req.query;

      const query = {};
      if (role) query.role = role;
      if (isActive !== undefined)
        query.isActive = isActive === "true" || isActive === true;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { contact: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      return successResponse(
        res,
        {
          users,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
          },
        },
        "Users retrieved successfully"
      );
    } catch (error) {
      logger.error("Admin list users error:", error);
      return errorResponse(res, "Failed to retrieve users", 500);
    }
  }

  // Admin/Superadmin: Set user active status, cascade to role-specific models
  async adminSetUserActiveStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== "boolean") {
        return errorResponse(res, "isActive (boolean) is required", 400);
      }

      const user = await User.findByIdAndUpdate(
        id,
        { isActive },
        { new: true, select: "-password" }
      );

      if (!user) {
        return errorResponse(res, "User not found", 404);
      }

      if (user.role === "psychologist") {
        await Psychologist.findOneAndUpdate(
          { email: user.email },
          { isActive }
        );
      }

      return successResponse(res, { user }, "User status updated successfully");
    } catch (error) {
      logger.error("Admin set user active status error:", error);
      return errorResponse(res, "Failed to update user status", 500);
    }
  }

  // Admin/Superadmin: Update a user's profile and related role-specific profile
  async adminUpdateUserProfile(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        email,
        contact,
        age,
        profile,
        // Psychologist fields (optional if user is psychologist)
        psychologist,
      } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (contact !== undefined) updateData.contact = contact;
      if (age !== undefined) updateData.age = age;
      if (profile !== undefined) {
        if (profile.avatar !== undefined)
          updateData["profile.avatar"] = profile.avatar;
        if (profile.bio !== undefined) updateData["profile.bio"] = profile.bio;
        if (profile.interests !== undefined)
          updateData["profile.interests"] = profile.interests;
        if (profile.emergencyContact !== undefined)
          updateData["profile.emergencyContact"] = profile.emergencyContact;
      }

      const userBefore = await User.findById(id);
      if (!userBefore) {
        return errorResponse(res, "User not found", 404);
      }

      const emailChanged = email && email !== userBefore.email;

      const user = await User.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true, select: "-password" }
      );

      if (user.role === "psychologist") {
        const targetEmail = emailChanged ? email : user.email;
        if (psychologist && typeof psychologist === "object") {
          await Psychologist.findOneAndUpdate(
            { email: userBefore.email },
            psychologist,
            { new: true, runValidators: true }
          );
        }
        if (emailChanged) {
          await Psychologist.findOneAndUpdate(
            { email: userBefore.email },
            { email: targetEmail }
          );
        }
      }

      return successResponse(res, { user }, "User updated successfully");
    } catch (error) {
      logger.error("Admin update user profile error:", error);
      const message =
        error.code === 11000
          ? "Email or contact already exists"
          : "Failed to update user";
      return errorResponse(res, message, 400);
    }
  }

  // Admin/Superadmin: Delete a user and cascade role-specific data
  async adminDeleteUserAndRole(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return errorResponse(res, "User not found", 404);
      }

      if (user.role === "psychologist") {
        await Psychologist.findOneAndDelete({ email: user.email });
      }

      await DeletionRequest.deleteMany({ user: id });
      await NotificationPrefs.deleteMany({ user: id });

      await User.deleteOne({ _id: id });

      return successResponse(res, null, "User account deleted successfully");
    } catch (error) {
      logger.error("Admin delete user error:", error);
      return errorResponse(res, "Failed to delete user", 500);
    }
  }

  // Admin/Superadmin: Get all user details, including feelings, questionnaires, support and reports
  async getUserDetails(req, res) {
    try {
      const { id } = req.params;
      const user = await User.findById(id).select("-password");
      if (!user) {
        return errorResponse(res, "User not found", 404);
      }

      // Get feelings
      const FeelingToday = require("../models/FeelingToday");
      const feelings = await FeelingToday.find({ user: id }).sort({ date: -1 });

      // Get questionnaire responses
      const { QuestionnaireResponse } = require("../models/Questionnaire");
      const questionnaireResponses = await QuestionnaireResponse.find({
        user: id,
      }).populate("questionnaire");

      // Get reports made by user
      const { Report } = require("../models/Report");
      const reports = await Report.find({ reporter: id }).sort({
        createdAt: -1,
      });

      // Get support tickets made by user
      const Support = require("../models/Support");
      const supports = await Support.find({ createdBy: id }).sort({
        createdAt: -1,
      });

      return successResponse(
        res,
        {
          user,
          feelings,
          questionnaireResponses,
          reports,
          supports,
        },
        "User details and all related data retrieved successfully"
      );
    } catch (error) {
      logger.error("Get user details error:", error);
      return errorResponse(res, "Failed to retrieve full user details", 500);
    }
  }
}

module.exports = new UserController();
