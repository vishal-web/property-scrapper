const express = require("express");
const cors = require("cors");
const config = require("./config/config.js");
const MongoDB = require("./src/database/mongodb.js");
const routes = require("./src/routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount routes
app.use("/", routes);

// Start server
MongoDB.connect(config).then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Scraper API running on http://localhost:${PORT}`);
    console.log(`📡 SSE logs available at /scrape/logs/:sessionId`);
  });
});