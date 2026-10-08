const express = require("express");

const { sendFriendRequest, getReceivedRequest, acceptFriendRequest, rejectFriendRequest, getListFriend, unFriend } = require("../controllers/friendControllers");

const protect = require("../middlewares/protect");

const router = express.Router();

router.post("/request/:userId", protect, sendFriendRequest);
router.get("/requests", protect, getReceivedRequest);
router.put("/request/:id/accept", protect, acceptFriendRequest);
router.put("/request/:id/reject", protect, rejectFriendRequest);
router.get("/", protect, getListFriend);
router.delete("/:userId", protect, unFriend);

module.exports = router;