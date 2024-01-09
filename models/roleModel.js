const mongoose = require("mongoose");

const rolesShcema = new mongoose.Schema({
    name: {
        type: String,
        require: [true, " Role name is require"],
        unique: true,
    },
    description: {
        type: String,
    },
    rolesDashboard: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "RoleDashboard",
        },
    ],
    rolesPos: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "RolePos",
        },
    ],
});

module.exports = rolesShcema;
