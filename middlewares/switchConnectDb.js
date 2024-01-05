const { MongoClient } = require("mongodb");

// Add more companies as needed
const companyConnectionMap = {};
// Create a pool for each company
const companyPools = {};
const switchConnectionPool = async (dbName) => {
    let dbUri = companyConnectionMap[dbName];
    if (!dbUri) {
        const url = `mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/${dbName}?retryWrites=true&w=majority`;
        //add the url to  companyConnectionMap the property is dbName and the value is  url text
        companyConnectionMap[dbName] = url;
        dbUri = url;
    }

    if (!companyPools[dbName]) {
        const client = new MongoClient(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        const pool = client.db();

        companyPools[dbName] = pool;
    }

    return companyPools[dbName];
};

// Middleware to handle database connection based on company name
const companyDatabaseMiddleware = async (req, res, next) => {
    const companyName = req.query.databaseName; // Assuming the company name is in the request parameters

    try {
        const companyPool = await switchConnectionPool(companyName);
        req.companyPool = companyPool;

        // Now you can use req.companyPool in your route handlers to interact with the specific company's database
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

//const connections = {};
let connectionPool = null;
const createConnection = async (dbName) => {
    try {
        // Close the existing connection if it's active
        if (connectionPool) {
            await connectionPool.close();
            connectionPool = null;
        }

        // Create a new connection pool
        const client = new MongoClient(`mongodb+srv://boss:1234@pos.jsfduqc.mongodb.net/${dbName}?retryWrites=true&w=majority`, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000,
        });
        await client.connect();
        connectionPool = client; // Use the default database from the connection string

        const db = connectionPool.db(dbName);
        return db;
    } catch (error) {
        console.error("Error creating database connection:", error);
        throw error;
    }
};

//module.exports = { switchConnectDb, createConnection };
module.exports = { createConnection, switchConnectionPool, companyDatabaseMiddleware };
