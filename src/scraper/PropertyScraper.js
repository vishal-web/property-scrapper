const ApiCapture = require("./ApiCapture");
const ApiReplayScraper = require("./ApiReplayScraper");
const { PropertyRepository, ProgressRepository } = require("../database");

class PropertyScraper {
  constructor(config) {
    this.config = config;
    this.propertyRepo = new PropertyRepository();
    this.progressRepo = new ProgressRepository();
  }

  async run(targetUrl) {
    console.log("🚀 Starting scraper in API mode...");

    // init progress
    await this.progressRepo.initProgress(targetUrl);

    // 1) capture API
    const capturer = new ApiCapture(this.config);
    const { capturedApi, cookies } = await capturer.capture(targetUrl);

    // 2) replay API
    const apiScraper = new ApiReplayScraper(
      this.config,
      this.propertyRepo,
      this.progressRepo
    );

    await apiScraper.scrapeWithCapturedApi(targetUrl, capturedApi, cookies);

    console.log("✅ Scraping finished!");
  }
}

module.exports = PropertyScraper;
