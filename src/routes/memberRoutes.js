const express = require("express");
const { exportMembers, getMembers } = require("../controllers/memberController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.get("/members", adminAuth, getMembers);
router.get("/export", adminAuth, exportMembers);

module.exports = router;
