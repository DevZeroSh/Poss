const mongoose = require("mongoose");

const roleDashboardSchema = new mongoose.Schema({
    title: String,
    desc: String,
});

module.exports = roleDashboardSchema;
