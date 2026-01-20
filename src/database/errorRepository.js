const MongoDB = require("./mongodb");

class ErrorRepository extends MongoDB {
  constructor(config) {
    super(config);
  }

  async saveErrors(errors) {
    if (errors.length === 0) return;

    const collection = this.getCollection("errors");
    await collection.insertMany(
      errors.map((err) => ({
        ...err,
        timestamp: new Date(),
      }))
    );
  }

  async logScrapeRun(stats) {
    const collection = this.getCollection("scrapeLogs");
    await collection.insertOne({
      stats,
      timestamp: new Date(),
    });
  }
}

module.exports = ErrorRepository;
