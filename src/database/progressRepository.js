const MongoDB = require("./mongodb");

class ProgressRepository extends MongoDB {
  constructor(config) {
    super(config);
  }

  async getProgress(baseUrl) {
    const collection = this.getCollection("scrapeProgress");
    const progress = await collection.findOne({ baseUrl });

    return progress; // Returns null if never scraped
  }

  async initProgress(baseUrl) {
    const collection = this.getCollection("scrapeProgress");

    const progressDoc = {
      url: baseUrl,
      baseUrl: baseUrl,
      lastCompletedPage: 0,
      totalPagesAttempted: 0,
      scrapedPages: [],
      totalPropertiesScraped: 0,
      newProperties: 0,
      updatedProperties: 0,
      duplicates: 0,
      startedAt: new Date(),
      completedAt: null,
      lastScrapedAt: new Date(),
      status: "in_progress",
    };

    await collection.updateOne(
      { baseUrl },
      { $setOnInsert: progressDoc },
      { upsert: true }
    );

    return progressDoc;
  }

  // Get the last scraped page for a URL
  async getLastPage(baseUrl) {
    const progress = await this.getProgress(baseUrl);
    return progress ? progress.lastCompletedPage : 0;
  }

  // Update after scraping a page
  async updatePageProgress(baseUrl, pageNumber, saveStats) {
    const collection = this.getCollection("scrapeProgress");

    await collection.updateOne(
      { baseUrl },
      {
        $set: {
          lastCompletedPage: pageNumber,
          lastScrapedAt: new Date(),
        },
        $inc: {
          totalPagesScraped: 1,
          totalPropertiesScraped: saveStats.total || 0,
          newProperties: saveStats.inserted || 0,
          updatedProperties: saveStats.updated || 0,
          duplicates: saveStats.duplicates || 0,
        },
      },
      { upsert: true }
    );
  }

  // Check if should stop (all duplicates)
  shouldStopScraping(saveStats) {
    // If NO new inserts and NO updates = all duplicates
    return saveStats.inserted === 0 && saveStats.updated === 0;
  }

  async markCompleted(baseUrl) {
    const collection = this.getCollection("scrapeProgress");

    await collection.updateOne(
      { baseUrl },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      }
    );
  }

  // Mark scraping as stopped (when all duplicates found)
  async markStopped(baseUrl, reason = "all_duplicates") {
    const collection = this.getCollection("scrapeProgress");

    await collection.updateOne(
      { baseUrl },
      {
        $set: {
          status: "stopped",
          stopReason: reason,
          completedAt: new Date(),
        },
      }
    );
  }
}

module.exports = ProgressRepository;
