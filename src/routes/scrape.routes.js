const express = require("express");
const router = express.Router();
const scrapeController = require("../controllers/scrape.controller");

// Start scraping
router.post("/", scrapeController.startScrape);

// SSE endpoint for streaming logs
router.get("/logs/:sessionId", scrapeController.streamLogs);

module.exports = router;