const puppeteer = require("puppeteer");

class ApiCapture {
  constructor(config) {
    this.config = config;
  }

  async capture(targetUrl) {
    const browser = await puppeteer.launch({
      headless: this.config.browser.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport(this.config.browser.viewport);
    await page.setUserAgent(this.config.browser.userAgent);

    await page.setRequestInterception(true);

    let captured = null;

    page.on("request", (req) => {
      const type = req.resourceType();
      const url = req.url();

      // ✅ capture only XHR/FETCH and filter endpoints
      if ((type === "xhr" || type === "fetch") && this.isListingApi(url)) {
        if (!captured) {
          captured = {
            url,
            method: req.method(),
            headers: req.headers(),
            postData: req.postData(), // may be null for GET
          };

          console.log("✅ Captured API:", captured.method, captured.url);
        }
      }

      req.continue();
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // wait a bit so API calls happen
    await this.delay(5000);

    const cookies = await page.cookies();
    await browser.close();

    if (!captured) {
      throw new Error("❌ Could not capture listing API request. Try adjusting match rules.");
    }

    return { capturedApi: captured, cookies };
  }

  // ✅ adjust this matcher based on what you see in logs
  isListingApi(url) {
    const lower = url.toLowerCase();
    return (
      lower.includes("search") ||
      lower.includes("property") ||
      lower.includes("listing") ||
      lower.includes("api")
    );
  }

  async delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = ApiCapture;
