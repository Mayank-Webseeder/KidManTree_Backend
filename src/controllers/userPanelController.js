const User = require("../models/User");
const bcrypt = require("bcrypt");
const { successResponse, errorResponse } = require("../utils/response");
const {
  userPanelCreateSchema,
  userPanelUpdateSchema,
  moduleUpdateSchema,
} = require("../utils/validators");
const logger = require("../utils/logger");

class UserPanelController {
  // Create a new user-panel account
  async createUserPanel(req, res) {
    try {
      const { error } = userPanelCreateSchema.validate(req.body);
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }));
        return errorResponse(res, "Validation failed", 400, errors);
      }

      const { name, email, password, contact, age, modules } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, "Email already exists", 400);
      }

      // Check if contact already exists
      const existingContact = await User.findOne({ contact });
      if (existingContact) {
        return errorResponse(res, "Contact number already exists", 400);
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user-panel account
      const userPanel = new User({
        name,
        email,
        password: hashedPassword,
        contact,
        age,
        role: "user-panel",
        isEmailVerified: true, // No need to verify email for user-panel
        isContactVerified: true, // No need to verify contact for user-panel
        modules,
        createdBy: req.user.id,
      });

      await userPanel.save();

      // Remove password from response
      const userResponse = userPanel.toObject();
      delete userResponse.password;

      return successResponse(
        res,
        { userPanel: userResponse },
        "User-panel account created successfully",
        201
      );
    } catch (error) {
      logger.error("Create user-panel error:", error);
      return errorResponse(res, "Failed to create user-panel account", 500);
    }
  }

  // Get all user-panel accounts
  async getUserPanels(req, res) {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;

      const query = { role: "user-panel" };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      const userPanels = await User.find(query)
        .select("-password")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await User.countDocuments(query);

      return successResponse(
        res,
        {
          userPanels,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalItems: total,
          },
        },
        "User-panel accounts retrieved successfully"
      );
    } catch (error) {
      logger.error("Get user-panels error:", error);
      return errorResponse(res, "Failed to retrieve user-panel accounts", 500);
    }
  }

  // Get a specific user-panel account
  async getUserPanel(req, res) {
    try {
      const userPanel = await User.findOne({
        _id: req.params.id,
        role: "user-panel",
      })
        .select("-password")
        .populate("createdBy", "name email");

      if (!userPanel) {
        return errorResponse(res, "User-panel account not found", 404);
      }

      return successResponse(
        res,
        { userPanel },
        "User-panel account retrieved successfully"
      );
    } catch (error) {
      logger.error("Get user-panel error:", error);
      return errorResponse(res, "Failed to retrieve user-panel account", 500);
    }
  }

  // Update user-panel account
  async updateUserPanel(req, res) {
    try {
      const { error } = userPanelUpdateSchema.validate(req.body);
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }));
        return errorResponse(res, "Validation failed", 400, errors);
      }

      const userPanelId = req.params.id;
      const { name, email, password, contact, age, modules, isActive } = req.body;

      const userPanel = await User.findOne({
        _id: userPanelId,
        role: "user-panel",
      });

      if (!userPanel) {
        return errorResponse(res, "User-panel account not found", 404);
      }

      // Check if email is being changed and if it already exists
      if (email && email !== userPanel.email) {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          return errorResponse(res, "Email already exists", 400);
        }
        userPanel.email = email;
      }

      // Check if contact is being changed and if it already exists
      if (contact && contact !== userPanel.contact) {
        const existingContact = await User.findOne({ contact });
        if (existingContact) {
          return errorResponse(res, "Contact number already exists", 400);
        }
        userPanel.contact = contact;
      }

      if (name) userPanel.name = name;
      if (age) userPanel.age = age;
      if (modules) userPanel.modules = modules;
      if (isActive !== undefined) userPanel.isActive = isActive;

      // Hash new password if provided
      if (password) {
        const saltRounds = 10;
        userPanel.password = await bcrypt.hash(password, saltRounds);
      }

      await userPanel.save();

      // Remove password from response
      const userResponse = userPanel.toObject();
      delete userResponse.password;

      return successResponse(
        res,
        { userPanel: userResponse },
        "User-panel account updated successfully"
      );
    } catch (error) {
      logger.error("Update user-panel error:", error);
      return errorResponse(res, "Failed to update user-panel account", 500);
    }
  }

  // Update modules for user-panel account
  async updateModules(req, res) {
    try {
      const { error } = moduleUpdateSchema.validate(req.body);
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path[0],
          message: detail.message,
        }));
        return errorResponse(res, "Validation failed", 400, errors);
      }

      const userPanelId = req.params.id;
      const { modules } = req.body;

      const userPanel = await User.findOne({
        _id: userPanelId,
        role: "user-panel",
      });

      if (!userPanel) {
        return errorResponse(res, "User-panel account not found", 404);
      }

      userPanel.modules = modules;
      await userPanel.save();

      // Remove password from response
      const userResponse = userPanel.toObject();
      delete userResponse.password;

      return successResponse(
        res,
        { userPanel: userResponse },
        "Modules updated successfully"
      );
    } catch (error) {
      logger.error("Update modules error:", error);
      return errorResponse(res, "Failed to update modules", 500);
    }
  }

  // Delete user-panel account
  async deleteUserPanel(req, res) {
    try {
      const userPanelId = req.params.id;

      const userPanel = await User.findOne({
        _id: userPanelId,
        role: "user-panel",
      });

      if (!userPanel) {
        return errorResponse(res, "User-panel account not found", 404);
      }

      await User.findByIdAndDelete(userPanelId);

      return successResponse(
        res,
        null,
        "User-panel account deleted successfully"
      );
    } catch (error) {
      logger.error("Delete user-panel error:", error);
      return errorResponse(res, "Failed to delete user-panel account", 500);
    }
  }

  // Toggle active status
  async toggleActiveStatus(req, res) {
    try {
      const userPanelId = req.params.id;

      const userPanel = await User.findOne({
        _id: userPanelId,
        role: "user-panel",
      });

      if (!userPanel) {
        return errorResponse(res, "User-panel account not found", 404);
      }

      userPanel.isActive = !userPanel.isActive;
      await userPanel.save();

      // Remove password from response
      const userResponse = userPanel.toObject();
      delete userResponse.password;

      return successResponse(
        res,
        { userPanel: userResponse },
        `User-panel account ${
          userPanel.isActive ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      logger.error("Toggle active status error:", error);
      return errorResponse(res, "Failed to toggle active status", 500);
    }
  }

  // Get available modules
  async getAvailableModules(req, res) {
    try {
      const availableModules = [
        {
          name: "Dashboard",
          route: "/dashboard",
          description: "Main dashboard overview",
        },
        {
          name: "User Management",
          route: "/user-management",
          description: "Manage regular users",
        },
        {
          name: "Categories",
          route: "/categories",
          description: "Manage content categories",
        },
        {
          name: "Anonymous Users",
          route: "/anonymous-users",
          description: "Manage anonymous user interactions",
        },
        {
          name: "Psychologists",
          route: "/psychologists",
          description: "Manage psychologist accounts",
        },
        {
          name: "Sessions",
          route: "/sessions",
          description: "Manage therapy sessions",
        },
        {
          name: "Content",
          route: "/content",
          description: "Manage platform content",
        },
        {
          name: "Reports",
          route: "/reports",
          description: "View and generate reports",
        },
        {
          name: "Support",
          route: "/support",
          description: "Manage support tickets",
        },
      ];

      return successResponse(
        res,
        { modules: availableModules },
        "Available modules retrieved successfully"
      );
    } catch (error) {
      logger.error("Get available modules error:", error);
      return errorResponse(res, "Failed to retrieve available modules", 500);
    }
  }
}

module.exports = new UserPanelController();
