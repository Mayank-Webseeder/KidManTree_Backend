// const Support = require("../models/Support");
// const { successResponse, errorResponse } = require("../utils/response");
// const logger = require("../utils/logger");

// class SupportController {
//   async createSupport(req, res) {
//     try {
//       const { subject, description, priority } = req.body;

//       if (!subject || !description) {
//         return errorResponse(res, "Subject and description are required", 400);
//       }

//       const support = await Support.create({
//         subject,
//         description,
//         priority: priority || "medium",
//         createdBy: req.user._id,
//       });

//       await support.populate("createdBy", "name email");

//       return successResponse(
//         res,
//         { support },
//         "Support ticket created successfully",
//         201
//       );
//     } catch (error) {
//       logger.error("Create support error:", error);
//       return errorResponse(res, "Failed to create support ticket", 500);
//     }
//   }

//   // Get user's own support tickets
//   async getMyTickets(req, res) {
//     try {
//       const { status, page = 1, limit = 10 } = req.query;
//       const query = { createdBy: req.user._id };

//       if (status) query.status = status;

//       const skip = (page - 1) * limit;

//       const supports = await Support.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate("assignedTo", "name email")
//         .populate("resolvedBy", "name email");

//       const total = await Support.countDocuments(query);

//       return successResponse(
//         res,
//         {
//           supports,
//           pagination: {
//             current: parseInt(page),
//             total: Math.ceil(total / limit),
//             count: total,
//           },
//         },
//         "Support tickets retrieved successfully"
//       );
//     } catch (error) {
//       logger.error("Get my tickets error:", error);
//       return errorResponse(res, "Failed to retrieve support tickets", 500);
//     }
//   }

//   // Get specific support ticket by ID
//   async getSupportById(req, res) {
//     try {
//       const { id } = req.params;
//       const support = await Support.findById(id)
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email")
//         .populate("resolvedBy", "name email");

//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       // Check if user owns the ticket or is admin/superadmin
//       if (
//         support.createdBy._id.toString() !== req.user._id.toString() &&
//         !["admin", "superadmin"].includes(req.user.role)
//       ) {
//         return errorResponse(res, "Access denied", 403);
//       }

//       return successResponse(
//         res,
//         { support },
//         "Support ticket retrieved successfully"
//       );
//     } catch (error) {
//       logger.error("Get support by ID error:", error);
//       return errorResponse(res, "Failed to retrieve support ticket", 500);
//     }
//   }

//   // Update support ticket (user can only update their own)
//   async updateSupport(req, res) {
//     try {
//       const { id } = req.params;
//       const { subject, description, priority } = req.body;

//       const support = await Support.findById(id);
//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       // Check if user owns the ticket
//       if (support.createdBy.toString() !== req.user._id.toString()) {
//         return errorResponse(
//           res,
//           "You can only update your own support tickets",
//           403
//         );
//       }

//       // Don't allow updating resolved tickets
//       if (support.status === "resolved") {
//         return errorResponse(
//           res,
//           "Cannot update resolved support tickets",
//           400
//         );
//       }

//       const updates = {};
//       if (subject !== undefined) updates.subject = subject;
//       if (description !== undefined) updates.description = description;
//       if (priority !== undefined) updates.priority = priority;

//       const updatedSupport = await Support.findByIdAndUpdate(
//         id,
//         { $set: updates },
//         { new: true, runValidators: true }
//       )
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email");

//       return successResponse(
//         res,
//         { support: updatedSupport },
//         "Support ticket updated successfully"
//       );
//     } catch (error) {
//       logger.error("Update support error:", error);
//       return errorResponse(res, "Failed to update support ticket", 500);
//     }
//   }

//   // Delete support ticket (user can only delete their own)
//   async deleteSupport(req, res) {
//     try {
//       const { id } = req.params;

//       const support = await Support.findById(id);
//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       // Check if user owns the ticket
//       if (support.createdBy.toString() !== req.user._id.toString()) {
//         return errorResponse(
//           res,
//           "You can only delete your own support tickets",
//           403
//         );
//       }

//       await Support.deleteOne({ _id: id });

//       return successResponse(res, null, "Support ticket deleted successfully");
//     } catch (error) {
//       logger.error("Delete support error:", error);
//       return errorResponse(res, "Failed to delete support ticket", 500);
//     }
//   }

//   // Admin: Get all support tickets
//   async getAllSupports(req, res) {
//     try {
//       const { status, priority, page = 1, limit = 10, assignedTo } = req.query;
//       const query = {};

//       if (status) query.status = status;
//       if (priority) query.priority = priority;
//       if (assignedTo) query.assignedTo = assignedTo;

//       const skip = (page - 1) * limit;

//       const supports = await Support.find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(parseInt(limit))
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email")
//         .populate("resolvedBy", "name email");

//       const total = await Support.countDocuments(query);

//       return successResponse(
//         res,
//         {
//           supports,
//           pagination: {
//             current: parseInt(page),
//             total: Math.ceil(total / limit),
//             count: total,
//           },
//         },
//         "Support tickets retrieved successfully"
//       );
//     } catch (error) {
//       logger.error("Get all supports error:", error);
//       return errorResponse(res, "Failed to retrieve support tickets", 500);
//     }
//   }

//   // Admin: Update support status
//   async updateStatus(req, res) {
//     try {
//       const { id } = req.params;
//       const { status, adminNotes } = req.body;

//       if (!["open", "inprogress", "resolved"].includes(status)) {
//         return errorResponse(res, "Invalid status", 400);
//       }

//       const updates = { status };
//       if (adminNotes !== undefined) updates.adminNotes = adminNotes;

//       // If resolving, add resolved timestamp and user
//       if (status === "resolved") {
//         updates.resolvedAt = new Date();
//         updates.resolvedBy = req.user._id;
//       }

//       const support = await Support.findByIdAndUpdate(
//         id,
//         { $set: updates },
//         { new: true, runValidators: true }
//       )
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email")
//         .populate("resolvedBy", "name email");

//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       return successResponse(
//         res,
//         { support },
//         "Support status updated successfully"
//       );
//     } catch (error) {
//       logger.error("Update status error:", error);
//       return errorResponse(res, "Failed to update support status", 500);
//     }
//   }

//   // Admin: Assign support ticket
//   async assignSupport(req, res) {
//     try {
//       const { id } = req.params;
//       const { assignedTo } = req.body;

//       const support = await Support.findByIdAndUpdate(
//         id,
//         { $set: { assignedTo: assignedTo || null } },
//         { new: true, runValidators: true }
//       )
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email");

//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       return successResponse(
//         res,
//         { support },
//         "Support ticket assigned successfully"
//       );
//     } catch (error) {
//       logger.error("Assign support error:", error);
//       return errorResponse(res, "Failed to assign support ticket", 500);
//     }
//   }

//   // Admin: Update any support ticket
//   async adminUpdateSupport(req, res) {
//     try {
//       const { id } = req.params;
//       const { subject, description, priority, status, adminNotes, assignedTo } =
//         req.body;

//       const updates = {};
//       if (subject !== undefined) updates.subject = subject;
//       if (description !== undefined) updates.description = description;
//       if (priority !== undefined) updates.priority = priority;
//       if (status !== undefined) updates.status = status;
//       if (adminNotes !== undefined) updates.adminNotes = adminNotes;
//       if (assignedTo !== undefined) updates.assignedTo = assignedTo;

//       // If resolving, add resolved timestamp and user
//       if (status === "resolved") {
//         updates.resolvedAt = new Date();
//         updates.resolvedBy = req.user._id;
//       }

//       const support = await Support.findByIdAndUpdate(
//         id,
//         { $set: updates },
//         { new: true, runValidators: true }
//       )
//         .populate("createdBy", "name email")
//         .populate("assignedTo", "name email")
//         .populate("resolvedBy", "name email");

//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       return successResponse(
//         res,
//         { support },
//         "Support ticket updated successfully"
//       );
//     } catch (error) {
//       logger.error("Admin update support error:", error);
//       return errorResponse(res, "Failed to update support ticket", 500);
//     }
//   }

//   // Admin: Delete any support ticket
//   async adminDeleteSupport(req, res) {
//     try {
//       const { id } = req.params;

//       const support = await Support.findById(id);
//       if (!support) {
//         return errorResponse(res, "Support ticket not found", 404);
//       }

//       await Support.deleteOne({ _id: id });

//       return successResponse(res, null, "Support ticket deleted successfully");
//     } catch (error) {
//       logger.error("Admin delete support error:", error);
//       return errorResponse(res, "Failed to delete support ticket", 500);
//     }
//   }

//   // Admin: Get support statistics
//   async getSupportStats(req, res) {
//     try {
//       const stats = await Support.aggregate([
//         {
//           $group: {
//             _id: "$status",
//             count: { $sum: 1 },
//           },
//         },
//       ]);

//       const priorityStats = await Support.aggregate([
//         {
//           $group: {
//             _id: "$priority",
//             count: { $sum: 1 },
//           },
//         },
//       ]);

//       const totalTickets = await Support.countDocuments();
//       const resolvedTickets = await Support.countDocuments({
//         status: "resolved",
//       });
//       const openTickets = await Support.countDocuments({ status: "open" });
//       const inProgressTickets = await Support.countDocuments({
//         status: "inprogress",
//       });

//       return successResponse(
//         res,
//         {
//           totalTickets,
//           resolvedTickets,
//           openTickets,
//           inProgressTickets,
//           statusBreakdown: stats,
//           priorityBreakdown: priorityStats,
//         },
//         "Support statistics retrieved successfully"
//       );
//     } catch (error) {
//       logger.error("Get support stats error:", error);
//       return errorResponse(res, "Failed to retrieve support statistics", 500);
//     }
//   }
// }

// module.exports = new SupportController();

const Support = require("../models/Support");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");
const notificationEvents = require("../services/notificationEvents");

class SupportController {
  async createSupport(req, res) {
    try {
      const { subject, description } = req.body;

      if (!subject || !description) {
        return errorResponse(res, "Subject and description are required", 400);
      }

      const support = await Support.create({
        subject,
        description,
        createdBy: req.user._id,
      });

      await support.populate("createdBy", "name email");

      notificationEvents
        .supportTicketCreated(support, support.createdBy)
        .catch((error) =>
          logger.warn("Support notification error:", error.message)
        );

      return successResponse(
        res,
        { support },
        "Support ticket created successfully",
        201
      );
    } catch (error) {
      logger.error("Create support error:", error);
      return errorResponse(res, "Failed to create support ticket", 500);
    }
  }

  // Get user's own support tickets
  async getMyTickets(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const query = { createdBy: req.user._id };

      if (status) query.status = status;

      const skip = (page - 1) * limit;

      const supports = await Support.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Support.countDocuments(query);

      return successResponse(
        res,
        {
          supports,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
          },
        },
        "Support tickets retrieved successfully"
      );
    } catch (error) {
      logger.error("Get my tickets error:", error);
      return errorResponse(res, "Failed to retrieve support tickets", 500);
    }
  }

  // Get specific support ticket by ID
  async getSupportById(req, res) {
    try {
      const { id } = req.params;
      const support = await Support.findById(id).populate(
        "createdBy",
        "name email"
      );

      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      // Check if user owns the ticket or is admin/superadmin
      if (
        support.createdBy._id.toString() !== req.user._id.toString() &&
        !["admin", "superadmin"].includes(req.user.role)
      ) {
        return errorResponse(res, "Access denied", 403);
      }

      return successResponse(
        res,
        { support },
        "Support ticket retrieved successfully"
      );
    } catch (error) {
      logger.error("Get support by ID error:", error);
      return errorResponse(res, "Failed to retrieve support ticket", 500);
    }
  }

  // Update support ticket (user can only update their own)
  async updateSupport(req, res) {
    try {
      const { id } = req.params;
      const { subject, description } = req.body;

      const support = await Support.findById(id);
      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      // Check if user owns the ticket
      if (support.createdBy.toString() !== req.user._id.toString()) {
        return errorResponse(
          res,
          "You can only update your own support tickets",
          403
        );
      }

      // Don't allow updating resolved tickets
      if (support.status === "resolved") {
        return errorResponse(
          res,
          "Cannot update resolved support tickets",
          400
        );
      }

      const updates = {};
      if (subject !== undefined) updates.subject = subject;
      if (description !== undefined) updates.description = description;

      const updatedSupport = await Support.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("createdBy", "name email");

      return successResponse(
        res,
        { support: updatedSupport },
        "Support ticket updated successfully"
      );
    } catch (error) {
      logger.error("Update support error:", error);
      return errorResponse(res, "Failed to update support ticket", 500);
    }
  }

  // Delete support ticket (user can only delete their own)
  async deleteSupport(req, res) {
    try {
      const { id } = req.params;

      const support = await Support.findById(id);
      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      // Check if user owns the ticket
      if (support.createdBy.toString() !== req.user._id.toString()) {
        return errorResponse(
          res,
          "You can only delete your own support tickets",
          403
        );
      }

      await Support.deleteOne({ _id: id });

      return successResponse(res, null, "Support ticket deleted successfully");
    } catch (error) {
      logger.error("Delete support error:", error);
      return errorResponse(res, "Failed to delete support ticket", 500);
    }
  }

  // Admin: Get all support tickets
  async getAllSupports(req, res) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const query = {};

      if (status) query.status = status;

      const skip = (page - 1) * limit;

      const supports = await Support.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("createdBy", "name email");

      const total = await Support.countDocuments(query);

      return successResponse(
        res,
        {
          supports,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
          },
        },
        "Support tickets retrieved successfully"
      );
    } catch (error) {
      logger.error("Get all supports error:", error);
      return errorResponse(res, "Failed to retrieve support tickets", 500);
    }
  }

  // Admin: Update support status
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!["open", "inprogress", "resolved"].includes(status)) {
        return errorResponse(res, "Invalid status", 400);
      }

      const updates = { status };

      // If resolving, add resolved timestamp
      if (status === "resolved") {
        updates.resolvedAt = new Date();
      }

      const support = await Support.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("createdBy", "name email");

      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      return successResponse(
        res,
        { support },
        "Support status updated successfully"
      );
    } catch (error) {
      logger.error("Update status error:", error);
      return errorResponse(res, "Failed to update support status", 500);
    }
  }

  // Admin: Update any support ticket
  async adminUpdateSupport(req, res) {
    try {
      const { id } = req.params;
      const { subject, description, status } = req.body;

      const updates = {};
      if (subject !== undefined) updates.subject = subject;
      if (description !== undefined) updates.description = description;
      if (status !== undefined) updates.status = status;

      // If resolving, add resolved timestamp
      if (status === "resolved") {
        updates.resolvedAt = new Date();
      }

      const support = await Support.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("createdBy", "name email");

      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      return successResponse(
        res,
        { support },
        "Support ticket updated successfully"
      );
    } catch (error) {
      logger.error("Admin update support error:", error);
      return errorResponse(res, "Failed to update support ticket", 500);
    }
  }

  // Admin: Delete any support ticket
  async adminDeleteSupport(req, res) {
    try {
      const { id } = req.params;

      const support = await Support.findById(id);
      if (!support) {
        return errorResponse(res, "Support ticket not found", 404);
      }

      await Support.deleteOne({ _id: id });

      return successResponse(res, null, "Support ticket deleted successfully");
    } catch (error) {
      logger.error("Admin delete support error:", error);
      return errorResponse(res, "Failed to delete support ticket", 500);
    }
  }

  // Admin: Get support statistics
  async getSupportStats(req, res) {
    try {
      const stats = await Support.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalTickets = await Support.countDocuments();
      const resolvedTickets = await Support.countDocuments({
        status: "resolved",
      });
      const openTickets = await Support.countDocuments({ status: "open" });
      const inProgressTickets = await Support.countDocuments({
        status: "inprogress",
      });

      return successResponse(
        res,
        {
          totalTickets,
          resolvedTickets,
          openTickets,
          inProgressTickets,
          statusBreakdown: stats,
        },
        "Support statistics retrieved successfully"
      );
    } catch (error) {
      logger.error("Get support stats error:", error);
      return errorResponse(res, "Failed to retrieve support statistics", 500);
    }
  }
}

module.exports = new SupportController();
