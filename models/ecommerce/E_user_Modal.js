const { default: mongoose } = require("mongoose");

const E_user_Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "user Name Required"],
      minlength: [3, "Too short customar name"],
      maxlength: [100, "Too long customar name"],
    },
    phoneNumber: {
      type: String,
    },
    email: {
      type: String,
      lowercase: true,
      unique: [true, "user Email must be unique"],
      require: [true, "user Email Required"],
    },
    idNumber: {
      type: Number,
      trim: true,
    },
    iban: [
      {
        name: String,
        number: String,
      },
    ],
    sex: {
      type: String,
      enum: ["male", "female", "unknown"],
      default: "unknown",
    },
    birthData: Date,
    password: String,
    passwordResetCode: String,
    passwordResetExpires: Date,
    resetCodeVerified: Boolean,
    passwordChangedAt: Date,
    passwordResetToken: String,
    facebookId: String,
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        alias: String,
        name: String,
        phone: String,
        city: String,
        postalCode: String,
        details: String,
      },
    ],
    country: String,
    isCustomer: Boolean,
    cards: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        card_num: String,
        card_holder_name: String,
        Expiration_date: String,
        cvv: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = E_user_Schema;
