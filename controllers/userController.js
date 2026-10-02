const User = require("../models/User");
const bcrypt = require("bcryptjs");

// UPDATE USER
const updateUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isAdmin = req.user.role === "Admin";

    if (req.user._id.toString() !== targetUserId && !isAdmin) {
      return res.status(403).json({
        message: "You can only update your own account",
      });
    }

    const allowedFields = [
      "username",
      "email",
      "phone",
      "fullName",
      "avatarUrl",
      "coverUrl",
      "bio",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Chỉ Admin mới được thay đổi role/status
    if (isAdmin) {
      if (req.body.role !== undefined) {
        updateData.role = req.body.role;
      }

      if (req.body.status !== undefined) {
        updateData.status = req.body.status;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      targetUserId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE USER
const deleteUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isAdmin = req.user.role === "Admin";

    if (req.user._id.toString() !== targetUserId && !isAdmin) {
      return res.status(403).json({
        message: "You can only delete your own account",
      });
    }

    const deletedUser = await User.findByIdAndDelete(targetUserId);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// GET USER
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("followers", "username fullName avatarUrl")
      .populate("followings", "username fullName avatarUrl");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// FOLLOW USER
const followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot follow yourself",
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!currentUser) {
      return res.status(404).json({
        message: "Current user not found",
      });
    }

    if (targetUser.followers.includes(currentUserId)) {
      return res.status(409).json({
        message: "You are already following this user",
      });
    }

    await targetUser.updateOne({
      $addToSet: {
        followers: currentUserId,
      },
    });

    await currentUser.updateOne({
      $addToSet: {
        followings: targetUserId,
      },
    });

    return res.status(200).json({
      message: "User followed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// UNFOLLOW USER
const unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({
        message: "You cannot unfollow yourself",
      });
    }

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!targetUser.followers.includes(currentUserId)) {
      return res.status(409).json({
        message: "You are not following this user",
      });
    }

    await targetUser.updateOne({
      $pull: {
        followers: currentUserId,
      },
    });

    await currentUser.updateOne({
      $pull: {
        followings: targetUserId,
      },
    });

    return res.status(200).json({
      message: "User unfollowed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// CHANGE PASSWORD
const changePassword = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;

    if (req.user._id.toString() !== targetUserId) {
      return res.status(403).json({
        message: "You can only change your own password",
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        message: "Old password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const passwordValid = await bcrypt.compare(
      oldPassword,
      user.password
    );

    if (!passwordValid) {
      return res.status(400).json({
        message: "Old password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateUser,
  deleteUser,
  getUser,
  followUser,
  unfollowUser,
  changePassword,
};