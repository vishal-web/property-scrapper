const runScraper = require("../../index");
const sseService = require("./sse.service");
const dataStreamFactory = require("../utils/dataStream.factory");

class ScrapeService {
  async runScraperWithLogs(sessionId, url) {
    // Intercept console logs
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      const message = args.join(" ");
      originalLog(message);
      sseService.sendToClient(sessionId, "log", message);
    };

    console.error = (...args) => {
      const message = args.join(" ");
      originalError(message);
      sseService.sendToClient(sessionId, "error", message);
    };

    // Create dataStream for the scraper
    const dataStream = dataStreamFactory.create(sessionId);

    // Setup heartbeat
    const heartbeat = setInterval(() => {
      const client = sseService.getClient(sessionId);
      if (client) {
        client.write(`: heartbeat\n\n`);
      }
    }, 15000);

    try {
      sseService.sendToClient(sessionId, "info", `🚀 Starting scrape for: ${url}`);

      const finalData = await runScraper(url, dataStream);

      sseService.sendToClient(
        sessionId,
        "success",
        "✅ Scraping completed successfully!",
        {
          summary: {
            totalScraped: finalData.totalScraped,
            newProperties: finalData.newProperties,
            updatedProperties: finalData.updatedProperties,
            lastPage: finalData.lastPage,
          },
        }
      );

      sseService.sendToClient(sessionId, "completed", "Done");
    } catch (error) {
      console.error("Scraper error:", error);
      sseService.sendToClient(
        sessionId,
        "error",
        `❌ Scraping failed: ${error.message}`
      );
      sseService.sendToClient(sessionId, "failed", error.message);
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;

      // Clear heartbeat
      clearInterval(heartbeat);

      // Close connection
      sseService.closeClient(sessionId);
    }
  }
}

module.exports = new ScrapeService();