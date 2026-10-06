const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username:{
            type: String,
            required: true,
            trim: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        password:{
            type: String,
            required: true
        },
        rofilePicture:{
            type: String,
            default: ""
        },
        coverPicture:{
            type: String,
            default:""
        },
        bio:{
            type: String,
            maxlength: 255,
            default:""
        },
        isAdmin:{
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema);

module.exports = User;
