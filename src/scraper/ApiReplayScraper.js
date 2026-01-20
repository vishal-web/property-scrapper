const axios = require("axios");
const { updatePageInUrl, updatePayloadPage } = require("./utils/apiPaginator");
const DataProcessor = require("../utils/dataProcessor");

class ApiReplayScraper {
  constructor(config, propertyRepo, progressRepo) {
    this.config = config;
    this.propertyRepo = propertyRepo;
    this.progressRepo = progressRepo;
  }

  cookiesToHeader(cookies) {
    return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  async scrapeWithCapturedApi(baseUrl, capturedApi, cookies) {
    const cookieHeader = this.cookiesToHeader(cookies);

    const maxPages = this.config.scraping.maxPages || 50;

    for (let page = 1; page <= maxPages; page++) {
      console.log(`📡 API Scraping Page ${page}...`);

      const apiUrl = capturedApi.method === "GET"
        ? updatePageInUrl(capturedApi.url, page)
        : capturedApi.url;

      const payload = capturedApi.method !== "GET"
        ? updatePayloadPage(capturedApi.postData, page)
        : undefined;

      const res = await axios({
        method: capturedApi.method,
        url: apiUrl,
        headers: {
          ...capturedApi.headers,
          cookie: cookieHeader,
        },
        data: payload,
        timeout: 60000,
      });

      const items = this.extractItems(res.data);

      if (!items.length) {
        console.log("✅ No more items found, stopping.");
        await this.progressRepo.markCompleted(baseUrl);
        break;
      }

      // ✅ normalize + process
      const processed = items.map((item) =>
        DataProcessor.processProperty({
          ...item,
          source: baseUrl,
        })
      );

      const saveStats = await this.propertyRepo.saveProperties(processed);

      await this.progressRepo.updatePageProgress(baseUrl, page, {
        total: processed.length,
        inserted: saveStats.inserted,
        updated: saveStats.updated,
        duplicates: saveStats.duplicates,
      });

      console.log(`✅ Page ${page}: saved=${processed.length}`, saveStats);

      // small delay to be safe
      await new Promise((r) => setTimeout(r, this.config.scraping.delayBetweenPages || 1000));
    }
  }

  // ✅ You need to adjust this based on actual response shape
  extractItems(apiResponse) {
    // If API returns: { data: { results: [] } }
    if (apiResponse?.data?.results) return apiResponse.data.results;

    // If API returns: { results: [] }
    if (apiResponse?.results) return apiResponse.results;

    // If API returns: [] directly
    if (Array.isArray(apiResponse)) return apiResponse;

    return [];
  }
}

module.exports = ApiReplayScraper;
