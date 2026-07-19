const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },

        role: {
            type: String,
            enum: ["restaurant", "ngo", "volunteer", "admin"],
            default: "restaurant",
        },

        avatar: {
            type: String,
            default: "",
        },

        avatarPublicId: {
            type: String,
            default: "",
        },

        documents: [
            {
                url: {
                    type: String,
                    required: true,
                },

                publicId: {
                    type: String,
                    required: true,
                },

                resourceType: {
                    type: String,
                    enum: ["image", "raw"],
                    default: "image",
                },

                label: {
                    type: String,
                    default: "",
                },

                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        phone: {
            type: String,
            default: "",
        },

        isVerified: {
            type: Boolean,
            default: false,
        },

        isBlocked: {
            type: Boolean,
            default: false,
        },

        lastLogin: Date,

        emailVerificationToken: {
            type: String,
            select: false,
        },

        emailVerificationExpires: {
            type: Date,
            select: false,
        },

        resetPasswordToken: {
            type: String,
            select: false,
        },

        resetPasswordExpires: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);

    next();
});

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);