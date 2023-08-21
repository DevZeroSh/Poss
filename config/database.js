const mongoose = require("mongoose");

const dbContacion = () => {
  mongoose
    .connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((conn) => {
      console.log(`databases Connceted:${conn.connection.host}`);
    });
};

module.exports = dbContacion;
