const scrapeService = require("../services/scrape.service");
const sseService = require("../services/sse.service");

class ScrapeController {
  // Start scraping endpoint
  async startScrape(req, res) {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: "URL is required",
        example: { url: "https://www.magicbricks.com/..." },
      });
    }

    // Generate unique session ID
    const sessionId = Date.now().toString();
    const PORT = process.env.PORT || 3000;

    // Respond immediately with session info
    res.json({
      status: "started",
      sessionId,
      logsUrl: `http://localhost:${PORT}/scrape/logs/${sessionId}`,
      url,
    });

    // Run scraper in background
    scrapeService.runScraperWithLogs(sessionId, url);
  }

  // SSE endpoint for streaming logs
  streamLogs(req, res) {
    const { sessionId } = req.params;

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Store client connection
    sseService.addClient(sessionId, res);

    // Send initial connection message
    res.write(
      `data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`
    );

    // Clean up on client disconnect
    req.on("close", () => {
      sseService.removeClient(sessionId);
      console.log(`Client disconnected: ${sessionId}`);
    });
  }
}

module.exports = new ScrapeController();