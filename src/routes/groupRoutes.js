// routes/groupRoutes.js
const express = require("express");
const { authenticate } = require("../middlewares/auth");
const groupController = require("../controllers/groupController");

const router = express.Router();

router.get("/stats", authenticate, groupController.getGroupStats);

router.post("/", authenticate, groupController.createGroup);
router.get("/", authenticate, groupController.getGroups);
router.get("/:id", authenticate, groupController.getGroup);
router.put("/:id", authenticate, groupController.updateGroup);
router.delete("/:id", authenticate, groupController.deleteGroup);

router.patch("/:id/status", authenticate, groupController.toggleStatus);

router.post("/:id/users", authenticate, groupController.addUserToGroup);
router.delete("/:id/users", authenticate, groupController.removeUserFromGroup);

module.exports = router;
