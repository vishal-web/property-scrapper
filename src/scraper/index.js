const PropertyScraper = require("./PropertyScraper.js");
const config = require("../../config/config.js");
const MongoDB = require('../database/mongodb.js');

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="));
const url = urlArg ? urlArg.split("=")[1] : config.scraping.targetUrl;

(async () => {
  await MongoDB.connect(config);
  const scraper = new PropertyScraper(config);

  try {
    await scraper.run(url);
    process.exit(0);
  } catch (err) {
    console.error("❌ Scraper failed:", err.message);
    process.exit(1);
  }
})();
