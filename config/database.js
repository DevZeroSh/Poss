const mongoose = require("mongoose");

const dbContacion = async () => {
    var dbUrl = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/subscribers_db?retryWrites=true&w=majority`;

    mongoose
        .connect(dbUrl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then((conn) => {
            console.log(`databases Connceted:${conn.connection.host}`);
        });
};

module.exports = dbContacion;
