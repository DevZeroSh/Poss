const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema({
    currencyCode: {
        type: String,
        require: [true, "Currency code is require"],
        unique: [true, "Currency code is unique"],
    },
    currencyName: {
        type: String,
        require: [true, "Currency name is require"],
    },
    exchangeRate: {
        type: Number,
        require: [true, "Currency exchange rate is require"],
    },
    is_primary: {
        type: String,
        default: "false",
        unique: {
            is_primary: "true",
        },
    },
});
const currencyModel = mongoose.model("Currency", currencySchema);
module.exports = currencyModel;
