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

dbConnection();

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "uploads")));
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
  console.log(`mode: ${process.env.NODE_ENV}`);
}
// Mount Routes
mountRoutes(app);
app.use(globalError);
const PORT = process.env.PORT || 8080;

const SSLCertificateKeyFile = fs.readFileSync(
  "/etc/letsencrypt/live/api2.smartinb.ai/pvt.pem",
  "utf8"
);
const SSLCertificateFile = fs.readFileSync(
  "/etc/letsencrypt/live/api2.smartinb.ai/cert.pem",
  "utf8"
);

// Include the intermediate certificate in the `ca` field
const credentials = { key: SSLCertificateKeyFile, cert: SSLCertificateFile };

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(PORT, () => {
  console.log(`App running on port ${PORT} using HTTPS`);
});
