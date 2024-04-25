const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const globalError = require("./middlewares/errorMiddleware");
const cors = require("cors");
const morgan = require("morgan");
const https = require("https");
const fs = require("fs");
const dbConnection = require("./config/database");
const mountRoutes = require("./routes");

dotenv.config({ path: "config.env" });

dotenv.config({ path: "config.env" });

dbConnection();

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}
// Mount Routes
mountRoutes(app);

app.use(globalError);
const PORT = process.env.PORT || 8080;

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/nooncar.com/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/nooncar.com/fullchain.pem",
  "utf8"
);
const credentials = { key: privateKey, cert: certificate };

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
  console.log(`App running on port ${PORT} using HTTPS`);
});
