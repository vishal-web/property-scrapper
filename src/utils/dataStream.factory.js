const sseService = require("../services/sse.service");

class DataStreamFactory {
  create(sessionId) {
    return {
      // Stream progress updates
      sendProgress: (current, total) => {
        const percentage = total ? Math.round((current / total) * 100) : null;
        sseService.sendToClient(
          sessionId,
          "progress",
          `Scraped ${current} properties${total ? `/${total}` : ""}`,
          { current, total, percentage }
        );
      },

      // Stream checkpoint with batch of properties
      sendPartialData: (data) => {
        if (data.checkpoint) {
          sseService.sendToClient(
            sessionId,
            "checkpoint",
            `💾 Page ${data.page} complete: ${data.pageProperties} properties`,
            {
              page: data.page,
              pageProperties: data.pageProperties,
              totalScraped: data.totalScraped,
              properties: data.properties,
              stats: {
                new: data.newProperties,
                updated: data.updatedProperties,
              },
            }
          );
        } else if (data.resuming) {
          sseService.sendToClient(
            sessionId,
            "resume",
            `📊 Resuming from page ${data.fromPage}`,
            {
              fromPage: data.fromPage,
              previousTotal: data.previousTotal,
              stats: {
                new: data.newCount,
                updated: data.updatedCount,
              },
            }
          );
        } else {
          sseService.sendToClient(
            sessionId,
            "partial_data",
            "Data chunk received",
            { data }
          );
        }
      },

      // Stream log messages
      sendLog: (level, message) => {
        sseService.sendToClient(
          sessionId,
          level === "error" ? "error" : "log",
          message,
          { level }
        );
      },

      // Stream info messages
      sendInfo: (message) => {
        sseService.sendToClient(sessionId, "info", message);
      },

      // Stream error messages
      sendError: (message) => {
        sseService.sendToClient(sessionId, "error", message);
      },
    };
  }
}

module.exports = new DataStreamFactory();