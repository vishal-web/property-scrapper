const PropertyScraper = require("./scraper/PropertyScraper");
const config = require("./config/scraper.config");

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="));
const url = urlArg ? urlArg.split("=")[1] : config.scraping.targetUrl;

(async () => {
  const scraper = new PropertyScraper(config);

  try {
    await scraper.run(url);
    process.exit(0);
  } catch (err) {
    console.error("❌ Scraper failed:", err.message);
    process.exit(1);
  }
})();
