const mongoose = require("mongoose");

const shippingCompaniesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: [true, "Company name is required"],
      minlength: [2, "Company name is too short"],
      unique: [true, "Company name must be unique"],
    },
    contractNumber: {
      type: String,
      require: [true, "Contract number is required"],
      unique: [true, "Contract number must be unique"],
    },
    prices: [
      {
        fromWeight: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        toWeight: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
          default: 0,
        },
        _id: false,
      },
    ],
    status: Boolean,
    image: String,
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/shippingCompany/${doc.image}`;
    doc.image = imageUrl;
  }
};

shippingCompaniesSchema.post("init", function (doc) {
  setImageURL(doc);
});

shippingCompaniesSchema.post("save", (doc) => {
  setImageURL(doc);
});

module.exports = shippingCompaniesSchema;
