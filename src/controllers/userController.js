const User = require("../models/User");
const Psychologist = require("../models/Psychologist");
const Appointment = require("../models/Appointment");
const NotificationPrefs = require("../models/NotificationPrefs");
const DeletionRequest = require("../models/DeletionRequest");
const { successResponse, errorResponse } = require("../utils/response");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const logger = require("../utils/logger");
const path = require("path");

class UserController {
  async adminUpdateDocxVerification(req, res) {
    try {
      const { id } = req.params;
      const { isDocxVerified } = req.body;

      if (typeof isDocxVerified !== "boolean") {
        return errorResponse(res, "isDocxVerified (boolean) is required", 400);
      }

      const user = await User.findByIdAndUpdate(
        id,
        { isDocxVerified },
        { new: true, select: "-password" }
      );

      if (!user) {
        return errorResponse(res, "User not found", 404);
      }

      return successResponse(
        res,
        { user },
        "Docx verification status updated successfully"
      );
    } catch (error) {
      logger.error("Admin update docx verification error:", error);
      return errorResponse(
        res,
        "Failed to update docx verification status",
        500
      );
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
  // async getUserDetails(req, res) {
  //   try {
  //     const { id } = req.params;
  //     const user = await User.findById(id).select("-password");
  //     if (!user) {
  //       return errorResponse(res, "User not found", 404);
  //     }

  //     // Get feelings
  //     const FeelingToday = require("../models/FeelingToday");
  //     const feelings = await FeelingToday.find({ user: id }).sort({ date: -1 });

  //     // Get questionnaire responses
  //     const { QuestionnaireResponse } = require("../models/Questionnaire");
  //     const questionnaireResponses = await QuestionnaireResponse.find({
  //       user: id,
  //     }).populate("questionnaire");

  //     // Get reports made by user
  //     const { Report } = require("../models/Report");
  //     const reports = await Report.find({ reporter: id }).sort({
  //       createdAt: -1,
  //     });

  //     // Get support tickets made by user
  //     const Support = require("../models/Support");
  //     const supports = await Support.find({ createdBy: id }).sort({
  //       createdAt: -1,
  //     });

  //     return successResponse(
  //       res,
  //       {
  //         user,
  //         feelings,
  //         questionnaireResponses,
  //         reports,
  //         supports,
  //       },
  //       "User details and all related data retrieved successfully"
  //     );
  //   } catch (error) {
  //     logger.error("Get user details error:", error);
  //     return errorResponse(res, "Failed to retrieve full user details", 500);
  //   }
  // }

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

      let psychologistDetails = null;
      if (user.role === "psychologist") {
        psychologistDetails = await Psychologist.findOne({ email: user.email });
      }

      return successResponse(
        res,
        {
          user,
          feelings,
          questionnaireResponses,
          reports,
          supports,
          psychologist: psychologistDetails,
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
