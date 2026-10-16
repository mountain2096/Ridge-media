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
        resetPasswordToken:{
            type: String,
            default: null,
        },
        resetPasswordExpires:{
            type:Date,
            default:null,
        },
        profilePicture:{
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
        friend:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"User"
            },
        ],
        blockList:[
            {
                type: mongoose.Schema.Types.ObjectId,
                ref:"User"
            }
        ]
    },
    {
        timestamps: true
    }
)

const User = mongoose.model("User", userSchema);

module.exports = User;
