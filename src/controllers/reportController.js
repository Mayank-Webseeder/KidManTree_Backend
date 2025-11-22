const { Report, REPORT_STATUSES } = require("../models/Report");
const { successResponse, errorResponse } = require("../utils/response");
const notificationEvents = require("../services/notificationEvents");
const logger = require("../utils/logger");

class ReportController {
  async create(req, res) {
    try {
      const { targetType, targetId, category, title, description } = req.body;

      const report = await Report.create({
        reporter: req.user._id,
        targetType,
        targetId,
        category,
        title,
        description,
      });

      notificationEvents.reportSubmitted(report, req.user).catch((error) =>
        logger.warn("Report notification error:", error.message)
      );

      return successResponse(res, report, "Report submitted", 201);
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const report = await Report.findById(id);

      if (!report) {
        return errorResponse(res, "Report not found", 404);
      }

      const isOwner = report.reporter.toString() === req.user._id.toString();
      const isAdmin = ["admin", "superadmin"].includes(req.user.role);

      if (!isOwner && !isAdmin) {
        return errorResponse(res, "Not allowed to delete this report", 403);
      }

      await report.deleteOne();
      return successResponse(res, null, "Report deleted", 200);
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!REPORT_STATUSES.includes(status)) {
        return errorResponse(res, "Invalid status", 400);
      }

      const report = await Report.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!report) {
        return errorResponse(res, "Report not found", 404);
      }

      return successResponse(res, report, "Status updated", 200);
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }

  async listAll(req, res) {
    try {
      const { page = 1, limit = 20, status, category, targetType } = req.query;

      const query = {};
      if (status) query.status = status;
      if (category) query.category = category;
      if (targetType) query.targetType = targetType;

      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        Report.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("reporter", "name email role"),
        Report.countDocuments(query),
      ]);

      return successResponse(
        res,
        {
          items,
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        "Reports fetched",
        200
      );
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }

  async mine(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        Report.find({ reporter: req.user._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit)),
        Report.countDocuments({ reporter: req.user._id }),
      ]);

      return successResponse(
        res,
        {
          items,
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
        "Your reports fetched",
        200
      );
    } catch (err) {
      return errorResponse(res, err.message, 500);
    }
  }
}

module.exports = new ReportController();
