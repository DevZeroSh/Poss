const mongoose = require("mongoose");

const companyIfnoSchema = new mongoose.Schema({
  companyName: {
    type: String,
    unique: [true, "Name must be unique"],
    minlength: [3, "Name is too short"],
  },
  companyAddress: String,
  companyTax: String,
  companyEmail: String,
  companyTel: String,
  companyLogo: {
    type: String,
    default: `defaultLogo.png`,
  },
  pinCode: { type: Number, default: 1234 },
  color: [String],
  havePin: {
    type: Boolean,
    enum: ["true", "false"],
    default: "false",
  },
  facebookUrl: String,
  instagramUrl: String,
  linkedinUrl: String,
  xtwitterUrl: String,
});

const setImageURL = (doc) => {
  if (doc.companyLogo) {
    const imageUrl = `${process.env.BASE_URL}/companyinfo/${doc.companyLogo}`;
    doc.companyLogo = imageUrl;
  }
};

companyIfnoSchema.post("find", function (docs) {
  docs.forEach(setImageURL);
});

//Create
companyIfnoSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = companyIfnoSchema;
