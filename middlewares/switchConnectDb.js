const mongoose = require("mongoose");
let isConnected = false;

// const switchConnectDb = async (req, res, next) => {
//     try {
//         if (isConnected) {
//             await mongoose.connection.close();
//             isConnected = false;
//         }
//         if (!isConnected) {
//             let dbName = req.body?.databaseName || "";
//             const dbUrl = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/${dbName}?retryWrites=true&w=majority`;

//             // Connect to the MongoDB database
//             await mongoose.connect(dbUrl, {
//                 useNewUrlParser: true,
//                 useUnifiedTopology: true,
//             });
//             isConnected = true;
//             console.log(`Connected to the database: ${dbUrl}`);
//         }
//         next();
//     } catch (error) {
//         console.error("Database connection error:", error);
//     }
// };

//const connections = {};

const createConnection = async (dbName) => {
    // Close the existing connection if it's active
    if (isConnected) {
        await mongoose.connection.close();
        isConnected = false;
    }

    const dbUrl = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    await mongoose.connect(dbUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log(`Connected to the database: ${dbUrl}`);
    //isConnected = true;
    // connections[dbName] = connection;

    // connection.on("error", (err) => {
    //     console.error(`MongoDB connection error for ${dbName}:`, err);
    // });

    // connection.on("connected", () => {
    //     console.log(`Connected to : ${dbName}`);
    // });

    //return connections[dbName];
};

//module.exports = { switchConnectDb, createConnection };
module.exports = { createConnection };
