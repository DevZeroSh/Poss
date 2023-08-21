const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    require: [true, "name require"],
  },
  slug: {
    type: String,
    lowercase: true,
  },
  email: {
    type: String,
    require: [true, "email require"],
    unique: true,
    lowercase: true,
  },
  phone: String,
  password: {
    type: String,
    require: [true, "password reqired"],
    minlength: [6, "To Short password"],
  },
  passwordChangedAt: Date,
  passwordResetCode: String,
  passwordResetExpires: Date,
  passwordResetVerified: Boolean,
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
  },
});

const userModel = new mongoose.model("User", userSchema);
module.exports = userModel;
