const mongoose = require("mongoose");

const TaxSchema = new mongoose.Schema(
    {
        name:String,
        tax:Number,
    }
)

const TaxModel = mongoose.model("Tax",TaxSchema);

module.exports = TaxModel;