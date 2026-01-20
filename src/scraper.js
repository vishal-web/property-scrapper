const puppeteer = require("puppeteer");
const DataProcessor = require("./utils/dataProcessor");
const Validator = require("./utils/validator");
const { PropertyRepository, ProgressRepository } = require("./database");
const fs = require("fs").promises;

class PropertyScraper {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.validator = new Validator(config);
    this.stats = {
      totalScraped: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      startTime: null,
      endTime: null,
    };

    this.collected = new Map();
    this.baseUrl = null;
    this.targetUrl = null;
    this.currentPage = 1;

    this.propertyRepo = new PropertyRepository();
    this.progressRepo = new ProgressRepository();
  }

  async initBrowser() {
    console.log("🚀 Launching browser...");
    this.browser = await puppeteer.launch({
      headless: this.config.browser.headless,
      args: [
        "--no-sandbox",
        "--start-maximized",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport(this.config.browser.viewport);
    await this.page.setUserAgent(this.config.browser.userAgent);

    // Block resources for faster scraping
    await this.page.setRequestInterception(true);
    this.page.on("request", (req) => {
      const type = req.resourceType();
      if (["image", "stylesheet", "font"].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log("✅ Browser ready");
  }

  async scrapeWithPagination() {
    const allProperties = [];
    let currentPage = 1;
    let hasNextPage = true;

    while (hasNextPage && currentPage <= this.config.scraping.maxPages) {
      console.log(`\n📄 Scraping page ${currentPage}...`);

      try {
        const pageUrl = this.buildPageUrl(currentPage);
        console.log("scraping started");
        const properties = await this.scrapePage(pageUrl);
        console.log("scraping ended");

        if (properties.length === 0) {
          console.log("No more properties found");
          break;
        }

        allProperties.push(...properties);
        console.log(`✅ Page ${currentPage}: ${properties.length} properties`);

        hasNextPage = await this.hasNextPage();

        if (hasNextPage) {
          currentPage++;
          await this.delay(this.config.scraping.delayBetweenPages);
        }
      } catch (error) {
        console.error(`❌ Error on page ${currentPage}:`, error.message);
        break;
      }
    }

    return allProperties;
  }

  buildPageUrl(customeUrl = null, pageNumber = 0) {
    // CUSTOMIZE based on website pagination
    let url = customeUrl || `${this.config.scraping.targetUrl}`;

    this.baseUrl = url;

    if (pageNumber > 1) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}page=${pageNumber}`;
    }

    this.targetUrl = url;

    return url;
  }

  async scrapePage(targetUrl = null) {
    const { startPage, progress } = await this.determineStartPage(targetUrl);
    const pageNumber = startPage;

    this.currentPage = pageNumber;

    const url = this.buildPageUrl(targetUrl, pageNumber);

    await this.page.goto(url, {
      waitUntil: "networkidle2",
      timeout: this.config.scraping.timeout,
    });

    try {
      await this.page.waitForSelector(this.config.selectors.propertyCard, {
        timeout: 10000,
      });
    } catch {
      return [];
    }

    console.log("✅ Initial chunk collect...", url);
    const firstChunkData = await this.collectChunk();
    await this.saveCheckpoint(firstChunkData);

    const options = {
      paginationSelector: ".mb-pagination",
      maxScrollCycles: 250,
      maxNoNewCardTries: 30,
      bottomHitTriesBeforeNext: 2,
      pageNumber,
    };

    await this.autoScrollWithPaginationIntelligence(options, async () => {
      // ✅ only save when new cards come
      const data = await this.collectChunk();
      if (data.length > 0) {
        await this.saveCheckpoint(data);
      }
      return data;
    });

    return Array.from(this.collected.values());
  }

  async extractPropertiesFromPage() {
    const selectors = this.config.selectors;

    const properties = await this.page.evaluate((selectors) => {
      const cards = document.querySelectorAll(selectors.propertyCard);
      const data = [];

      // ✅ helper: get text safely
      const getText = (root, sel) => {
        if (!sel) return "";
        const el = root.querySelector(sel);
        return el ? (el.innerText || el.textContent || "").trim() : "";
      };

      // ✅ helper: get image url safely
      const getImage = (root, sel) => {
        const imgEl = sel ? root.querySelector(sel) : null;
        if (!imgEl) return "";

        return (
          imgEl.getAttribute("src") ||
          imgEl.getAttribute("data-src") ||
          imgEl.getAttribute("data-original") ||
          imgEl.getAttribute("srcset")?.split(" ")[0] ||
          ""
        );
      };

      cards.forEach((card) => {
        try {
          const propertyUrl = card.querySelector(selectors.link)?.href || "";

          let jsonLd = null;
          const scriptTag = card.querySelector(
            'script[type="application/ld+json"]'
          );
          if (scriptTag) {
            try {
              jsonLd = JSON.parse(scriptTag.textContent);
            } catch (e) {
              console.error("JSON-LD parse error:", e);
            }
          }

          data.push({
            title: getText(card, selectors.title),
            price: getText(card, selectors.price),
            location: getText(card, selectors.location),

            bedrooms: getText(card, selectors.bedrooms),
            bathrooms: getText(card, selectors.bathrooms),
            parking: getText(card, selectors.parking),
            area: getText(card, selectors.area),
            floor: getText(card, selectors.floor),
            status: getText(card, selectors.status),
            transaction: getText(card, selectors.transaction),
            furnishing: getText(card, selectors.furnishing),
            facing: getText(card, selectors.facing),
            overlooking: getText(card, selectors.overlooking),
            ownership: getText(card, selectors.ownership),
            society: getText(card, selectors.society),
            balcony: getText(card, selectors.balcony),
            tenentPreffered: getText(card, selectors.tenentPreffered),

            propertyType: getText(card, selectors.propertyType),
            imageUrl: getImage(card, selectors.image),
            description: getText(card, selectors.description),
            listingId: card.getAttribute("data-id") || "",

            propertyUrl: jsonLd?.url || jsonLd?.["@id"] || propertyUrl,
            location: jsonLd?.address?.addressLocality,
            city: jsonLd?.address?.addressRegion || "",
            country: jsonLd?.address?.addressCountry || "",

            // 🎯 BONUS: Geographic coordinates
            latitude: jsonLd?.geo?.latitude || null,
            longitude: jsonLd?.geo?.longitude || null,

            jsonLd,
          });
        } catch (err) {}
      });

      return data;
    }, selectors);

    return properties.map((prop) =>
      DataProcessor.processProperty({
        ...prop,
        source: this.targetUrl,
      })
    );
  }

  async hasNextPage() {
    return await this.page.evaluate((selector) => {
      const btn = document.querySelector(selector);
      return btn && !btn.disabled && !btn.classList.contains("disabled");
    }, this.config.selectors.nextButton);
  }

  async delay(ms) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  getStats() {
    return this.stats;
  }

  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async isElementInViewport(selector) {
    return await this.page.evaluate((sel) => {
      console.log("isElementinViewPost", sel);
      const el = document.querySelector(sel);
      if (!el) return false;

      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;

      return rect.top < vh && rect.bottom > 0;
    }, selector);
  }

  async clickNextAndWaitForNewCards() {
    const { nextButton, propertyCard } = this.config.selectors;

    const beforeCount = await this.page
      .$$eval(propertyCard, (els) => els.length)
      .catch(() => 0);

    const nextBtn = await this.page.$(nextButton);
    if (!nextBtn) {
      console.log("❌ Next button not found");
      return false;
    }

    // check disabled
    const canClick = await this.page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (!btn) return false;
      return !(
        btn.disabled ||
        btn.classList.contains("disabled") ||
        btn.getAttribute("aria-disabled") === "true"
      );
    }, nextButton);

    if (!canClick) {
      console.log("❌ Next button disabled");
      return false;
    }

    console.log("➡️ Clicking Next page...");

    // ✅ click
    await nextBtn.click().catch(() => null);

    // ✅ wait for new cards OR navigation OR DOM refresh
    let updated = false;
    try {
      await this.page.waitForFunction(
        (sel, oldCount) => document.querySelectorAll(sel).length !== oldCount,
        { timeout: 12000 },
        propertyCard,
        beforeCount
      );
      updated = true;
    } catch (e) {}

    // some sites replace content without changing count, so wait for 1st card to exist
    try {
      await this.page.waitForSelector(propertyCard, { timeout: 10000 });
      updated = true;
    } catch (e) {}

    // small pause so DOM settles
    await this.wait(1000);

    if (updated) {
      ++this.currentPage;
    }

    console.log(
      updated
        ? "✅ Next page loaded. Page = " + this.currentPage
        : "⚠️ Next clicked but cards not clearly updated"
    );

    return updated;
  }

  async autoScrollWithPaginationIntelligence(options = {}, onChunk = null) {
    const {
      paginationSelector = ".mb-pagination",
      maxScrollCycles = 200, // total scroll cycles allowed
      maxNoNewCardTries = 20, // allow a LOT before stopping
      bottomHitTriesBeforeNext = 2, // bottom hits before trying "Next"
    } = options;

    const { propertyCard } = this.config.selectors;

    let noNewCardTries = 0;
    let bottomHits = 0;

    console.log("🧠 Smart scroll started...");

    for (let cycle = 1; cycle <= maxScrollCycles; cycle++) {
      const beforeCount = await this.page
        .$$eval(propertyCard, (els) => els.length)
        .catch(() => 0);

      // ✅ stop scrolling if pagination is visible
      const paginationVisible = await this.isElementInViewport(
        paginationSelector
      );

      if (paginationVisible) {
        console.log(
          `✅ Pagination visible (${paginationSelector}). Trying Next...`
        );

        const moved = await this.clickNextAndWaitForNewCards();

        if (moved) {
          console.log("✅ Next page loaded. Continue scrolling...");
          noNewCardTries = 0;
          bottomHits = 0;

          // small human pause after page switch
          await this.wait(Math.floor(Math.random() * 1200) + 800);
          continue;
        } else {
          console.log("❌ Next not possible (disabled/not found). Ending.");
          return;
        }
      }

      // ✅ scroll humanly
      await this.page.evaluate(() => {
        const distance = Math.floor(Math.random() * 350) + 650; // 250–600px
        window.scrollBy({ top: distance, left: 0, behavior: "smooth" });
      });

      // ✅ gap after each scroll
      await this.wait(Math.floor(Math.random() * 100) + 100); // 600–1300ms

      // ✅ sometimes longer pause
      if (Math.random() < 0.18) {
        await this.wait(Math.floor(Math.random() * 100) + 100);
      }

      // ✅ check if new cards appeared
      let newCardsLoaded = false;
      try {
        await this.page.waitForFunction(
          (sel, oldCount) => document.querySelectorAll(sel).length > oldCount,
          { timeout: 4500 },
          propertyCard,
          beforeCount
        );
        newCardsLoaded = true;
      } catch (e) {}

      const afterCount = await this.page
        .$$eval(propertyCard, (els) => els.length)
        .catch(() => 0);

      if (afterCount > beforeCount || newCardsLoaded) {
        ++this.currentPage;

        // ✅ extract and save chunk periodically
        if (typeof onChunk === "function") {
          await onChunk();
        }

        noNewCardTries = 0;
      } else {
        noNewCardTries++;
      }

      // ✅ detect near bottom
      const nearBottom = await this.page.evaluate(() => {
        return (
          window.innerHeight + window.scrollY >= document.body.scrollHeight - 30
        );
      });

      if (nearBottom) bottomHits++;
      else bottomHits = 0;

      console.log(
        `[Cycle ${cycle}] cards: ${beforeCount} → ${afterCount} | noNewTries=${noNewCardTries} | nearBottom=${nearBottom}`
      );

      // ✅ If bottom hit too many times, try clicking NEXT
      // This handles cases where pagination never becomes visible
      if (bottomHits >= bottomHitTriesBeforeNext) {
        console.log("📌 Bottom reached multiple times. Trying Next button...");
        const moved = await this.clickNextAndWaitForNewCards();

        if (moved) {
          // reset counters after moving to next page
          bottomHits = 0;
          noNewCardTries = 0;
          console.log("✅ Continued after Next page.");
          continue;
        } else {
          console.log("❌ Next not possible. Ending scroll.");
          return;
        }
      }

      // ✅ Final stop if NOTHING loads for too long
      if (noNewCardTries >= maxNoNewCardTries) {
        console.log("⚠️ No new cards for a long time. Stopping scroll.");
        return;
      }
    }

    console.log("⚠️ Max scroll cycles reached. Stopping.");
  }

  async saveCheckpoint(properties) {
    if (properties.length === 0) {
      console.log("❌ No properties found. Ending scrape.");
      await this.progressRepo.markCompleted(this.baseUrl);
      return;
    }

    const saveStats = await this.savePropertiesWithStats(properties);

    // ✅ Update progress after each page
    await this.progressRepo.updatePageProgress(this.baseUrl, this.currentPage, {
      total: properties.length,
      inserted: saveStats.inserted,
      updated: saveStats.updated,
      duplicates: saveStats.duplicates,
    });

    const arr = Array.from(this.collected.values());
    console.log(
      `💾 Checkpoint saved: ${arr.length} total properties`,
      saveStats
    );
  }

  async collectChunk() {
    const newlyAdded = [];
    const items = await this.extractPropertiesFromPage();

    for (const item of items) {
      const key = item.metadata.hash;
      if (!key) continue;

      if (!this.collected.has(key)) {
        this.collected.set(key, item);
        newlyAdded.push(item);
      }
    }

    return newlyAdded;
  }

  async savePropertiesWithStats(properties) {
    // Assuming you have propertyRepo available
    const result = await this.propertyRepo.saveProperties(properties);

    return {
      total: properties.length,
      inserted: result.inserted,
      updated: result.updated,
      duplicates: result.duplicates,
    };
  }

  async determineStartPage(baseUrl) {
    const progress = await this.progressRepo.getProgress(baseUrl);

    if (progress) {
      console.log(`📊 Found previous scrape:`);
      console.log(`   Last page: ${progress.lastCompletedPage}`);
      console.log(`   Total scraped: ${progress.totalPropertiesScraped}`);
      console.log(
        `   New: ${progress.newProperties}, Updated: ${progress.updatedProperties}`
      );

      const startPage = progress.lastCompletedPage + 1;
      console.log(`🔄 Resuming from page ${startPage}...`);

      return { startPage, progress };
    }

    console.log(`🆕 First time scraping this URL`);
    await this.progressRepo.initProgress(baseUrl);

    return { startPage: 1, progress: null };
  }
}

module.exports = PropertyScraper;
