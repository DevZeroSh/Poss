const mongoose = require("mongoose");

const rolePosSchema = new mongoose.Schema(
    {
        title:String,
        desc:String,
    }
)

const rolePosModel = mongoose.model("rolePos",rolePosSchema);

module.exports = rolePosModel;