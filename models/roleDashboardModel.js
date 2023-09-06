const mongoose = require("mongoose");

const roleDashboardSchema = new mongoose.Schema(
    {
        title:String,
        desc:String,
    }
)

const roleDashboardModel = mongoose.model("roleDashboard",roleDashboardSchema);

module.exports = roleDashboardModel;