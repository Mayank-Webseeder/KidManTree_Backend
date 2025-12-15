// controllers/groupController.js
const Group = require("../models/Group");
const { successResponse, errorResponse } = require("../utils/response");

// Create group
exports.createGroup = async (req, res) => {
  try {
    const { name, description, questionCount = 0, isActive = true } = req.body;

    if (!name) {
      return errorResponse(res, "Name is required", 400);
    }

    const group = await Group.create({
      name,
      description,
      questionCount,
      isActive,
      createdBy: req.user.id,
    });

    return successResponse(res, { group }, "Group created", 201);
  } catch (err) {
    return errorResponse(res, "Failed to create group", 500);
  }
};

// Get all groups (with filters & search, like screenshot)
exports.getGroups = async (req, res) => {
  try {
    const { status, search } = req.query; // status: 'active' | 'inactive' | undefined

    const query = {};
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;
    if (search) query.name = new RegExp(search, "i");

    const groups = await Group.find(query).sort({ createdAt: -1 });

    return successResponse(res, { groups }, "Groups retrieved");
  } catch (err) {
    return errorResponse(res, "Failed to get groups", 500);
  }
};

// Get single group
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      "users",
      "name email"
    );
    if (!group) return errorResponse(res, "Group not found", 404);

    return successResponse(res, { group }, "Group retrieved");
  } catch (err) {
    return errorResponse(res, "Failed to get group", 500);
  }
};

// Update group
exports.updateGroup = async (req, res) => {
  try {
    const { name, description, questionCount, isActive } = req.body;

    const group = await Group.findById(req.params.id);
    if (!group) return errorResponse(res, "Group not found", 404);

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (questionCount !== undefined) group.questionCount = questionCount;
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();
    return successResponse(res, { group }, "Group updated");
  } catch (err) {
    return errorResponse(res, "Failed to update group", 500);
  }
};

// Delete group
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return errorResponse(res, "Group not found", 404);

    await group.deleteOne();
    return successResponse(res, null, "Group deleted");
  } catch (err) {
    return errorResponse(res, "Failed to delete group", 500);
  }
};

// Toggle active / inactive (status switch in UI)
exports.toggleStatus = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return errorResponse(res, "Group not found", 404);

    group.isActive = !group.isActive;
    await group.save();

    return successResponse(res, { group }, "Group status updated");
  } catch (err) {
    return errorResponse(res, "Failed to update status", 500);
  }
};

// Add user to group (to track number of users using it)
exports.addUserToGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return errorResponse(res, "Group not found", 404);

    if (!group.users.includes(userId)) {
      group.users.push(userId);
      await group.save();
    }

    return successResponse(res, { group }, "User added to group");
  } catch (err) {
    return errorResponse(res, "Failed to add user", 500);
  }
};

// Remove user from group
exports.removeUserFromGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return errorResponse(res, "Group not found", 404);

    group.users = group.users.filter(
      (u) => u.toString() !== String(userId)
    );
    await group.save();

    return successResponse(res, { group }, "User removed from group");
  } catch (err) {
    return errorResponse(res, "Failed to remove user", 500);
  }
};

// Dashboard stats (top cards in screenshot)
exports.getGroupStats = async (req, res) => {
  try {
    const total = await Group.countDocuments();
    const active = await Group.countDocuments({ isActive: true });
    const inactive = await Group.countDocuments({ isActive: false });

    const groups = await Group.find();
    const totalQuestions = groups.reduce(
      (sum, g) => sum + (g.questionCount || 0),
      0
    );
    const avgQuestions = total ? totalQuestions / total : 0;

    return successResponse(
      res,
      {
        total,
        active,
        inactive,
        avgQuestions: Number(avgQuestions.toFixed(1)),
      },
      "Group stats"
    );
  } catch (err) {
    return errorResponse(res, "Failed to get stats", 500);
  }
};
