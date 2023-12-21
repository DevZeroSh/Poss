const mongoose = require("mongoose");

const dbContacion = async (req, res, next) => {
    if (req.body.databaseName) {
        var dbUrl = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/${req.body.databaseName}?retryWrites=true&w=majority`;
    } else {
        var dbUrl = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/?retryWrites=true&w=majority`;
    }

    mongoose
        .connect(dbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then((conn) => {
            console.log(`databases Connceted:${conn.connection.host}`);
        });
    next();
};

module.exports = dbContacion;
