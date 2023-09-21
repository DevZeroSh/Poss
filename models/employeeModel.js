const mongoose = require("mongoose");

const emoloyeeShcema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "employee name is require"],
    },
    email: {
      type: String,
      require: [true, "email is require"],
      unique: [true,"email is u"],
      lowercase: true,
    },
    pin: {
      type: Number,
      minlength: [4, "The PIN is wrong"],
      maxlength: [4, "The PIN is wrong"],
    },
    active: {
      type: Boolean,
      default: true,
    },
    password: String,
    selectedRoles: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Roles",
      },
    ],
    archives: {
      type: String,
      enum: ["true", "false"],
      default: "false",
    },
  },
  { timestamps: true }
);

const employeeModel = mongoose.model("Employee", emoloyeeShcema);
module.exports = employeeModel;
