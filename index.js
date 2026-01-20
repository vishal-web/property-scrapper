const config = require("./config/config");
const PropertyScraper = require("./src/scraper");
const MongoDB = require("./src/database/mongodb");
const Validator = require("./src/utils/validator");
const Exporter = require("./src/utils/exporter");
const {
  PropertyRepository,
  ProgressRepository,
  ErrorRepository,
} = require("./src/database");

async function main(targetUrl = null) {
  const startTime = new Date();

  const url = targetUrl || config.scraping.targetUrl;

  console.log("🎯 Starting Property Scraper\n");
  console.log("Configuration:");
  console.log(`  Target: ${url}`);
  console.log(`  Max Pages: ${config.scraping.maxPages}`);
  console.log(`  Database: ${config.database.dbName}\n`);

  const scraper = new PropertyScraper(config);

  const validator = new Validator(config);
  const exporter = new Exporter();

  try {
    // Initialize
    await scraper.initBrowser();
    await MongoDB.connect(config);

    const propertyRepo = new PropertyRepository();
    const progressRepo = new ProgressRepository();
    const errorRepo = new ErrorRepository();

    // Scrape properties
    console.log("Starting scrape...\n");
    const properties = await scraper.scrapePage(url);
    console.log(`\n📊 Total scraped: ${properties.length} properties`);

    // Validate
    console.log("\n🔍 Validating data...");
    const { valid, invalid } = validator.validateBatch(properties);
    console.log(`✅ Valid: ${valid.length}`);
    console.log(`❌ Invalid: ${invalid.length}`);

    // Save to MongoDB
    if (valid.length > 0) {
      // console.log("\n💾 Saving to MongoDB...");
      // const result = await propertyRepo.saveProperties(valid);
      // console.log(`✅ Inserted: ${result.inserted}`);
      // console.log(`✅ Updated: ${result.updated}`);
      // console.log(`ℹ️  Duplicates: ${result.duplicates}`);
    }

    // Save errors
    if (invalid.length > 0) {
      await errorRepo.saveErrors(invalid);
      console.log(`⚠️  Logged ${invalid.length} invalid entries`);
    }

    // Export data
    console.log("\n📁 Exporting data...");
    await exporter.exportToJSON(valid);
    await exporter.exportToCSV(valid);

    // Log run
    const endTime = new Date();
    const stats = {
      ...scraper.getStats(),
      totalScraped: properties.length,
      successful: valid.length,
      failed: invalid.length,
      startTime,
      endTime,
      duration: (endTime - startTime) / 1000,
    };

    await errorRepo.logScrapeRun(stats);

    // Print summary
    printSummary(stats);

    console.log("\n✅ Scraping completed successfully!");
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await scraper.close();
    await MongoDB.close();
  }
}

function printSummary(stats) {
  console.log("\n" + "=".repeat(50));
  console.log("📊 SCRAPING SUMMARY");
  console.log("=".repeat(50));
  console.log(`⏱️  Duration: ${stats.duration.toFixed(2)}s`);
  console.log(`📄 Total: ${stats.totalScraped}`);
  console.log(`✅ Valid: ${stats.successful}`);
  console.log(`❌ Invalid: ${stats.failed}`);
  console.log("=".repeat(50));
}

// Parse command line arguments
const args = process.argv.slice(2);
const urlArg = args.find((arg) => arg.startsWith("--url="));
const targetUrl = urlArg ? urlArg.replace("--url=", "") : null;

// Run
// main(targetUrl);

module.exports = main;