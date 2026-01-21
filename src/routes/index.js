const express = require("express");
const router = express.Router();
const scrapeRoutes = require("./scrape.routes");
const dashboardRoutes = require("./dashboard.routes");

// Health check
router.get("/", (req, res) => {
  res.json({ status: "ok", message: "Scraper API is running" });
});

router.use("/scrape", scrapeRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;