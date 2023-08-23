const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      require: true,
      minlength: [3, "Too short product title"],
      maxlength: [100, "too long product title"],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    description: {
      type: String,
    },
    sold: {
      type: Number,
      default: 0,
    },

    price: {
      type: Number,
      require: [true, "product price is required"],
      trim: true,
    },

    priceAftereDiscount: {
      type: Number,
    },
    qr: {
      type: String,
      unique: [true, "Qr must be unique"],
      index: true,
    },
    sku: {
      type: String,
    },
    serialNumber: {
      type: String,
    },
    image: {
      type: String,
      require: true,
    },
    brand: {
      type: mongoose.Schema.ObjectId,
      ref: "Brand",
    },
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
    },
    variant: {
      type: mongoose.Schema.ObjectId,
      ref: "Variant",
    },
  },
  { timestamps: true }
);

const setImageURL=(doc)=>{
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/product/${doc.image}`;
    doc.image = imageUrl;
  }
}
productSchema.post("init", (doc) => {
  setImageURL(doc)
});
//Create
productSchema.post("save", (doc) => {
  setImageURL(doc)
});


const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;
