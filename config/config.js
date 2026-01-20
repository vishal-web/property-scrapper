require('dotenv').config();

const config = {

  isProduction: process.env.NODE_ENV === "production",

  // Scraping configuration
  scraping: {
    baseUrl: process.env.BASE_URL || 'https://www.magicbricks.com',
    targetUrl: process.env.TARGET_URL || 'https://www.magicbricks.com/listings',
    maxPages: parseInt(process.env.MAX_PAGES) || 10,
    delayBetweenPages: parseInt(process.env.DELAY_BETWEEN_PAGES) || 2000,
    delayBetweenRequests: parseInt(process.env.DELAY_BETWEEN_REQUESTS) || 1000,
    retryAttempts: 3,
    timeout: 60000,
  },

  // MongoDB configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.DB_NAME || 'property_data',
    collections: {
      properties: 'properties',
      scrapeLogs: 'scrape_logs',
      errors: 'scrape_errors',
      scrapeProgress: 'scrape_progress',
    },
  },

  // Browser configuration
  browser: {
    headless: process.env.HEADLESS,
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },

  // Data validation rules
  validation: {
    requiredFields: ['title', 'price'],
    priceMin: 0,
    priceMax: 100000000,
  },

  // CSS Selectors - CUSTOMIZE THESE FOR YOUR TARGET WEBSITE
  selectors: {
    propertyCard: '.mb-srp__list',
    title: '.mb-srp__card--title',
    price: '.mb-srp__card__price--amount',
    location: '.location, .address, .area',
    bedrooms: '.bedrooms, .beds, [data-beds]',
    bathrooms: '[data-summary="bathroom"]',
    parking: '[data-summary="parking"]',
    area: '[data-summary="carpet-area"]',
    floor: '[data-summary="floor"]',
    status: '[data-summary="status"]',
    transaction: '[data-summary="transaction"]',
    furnishing: '[data-summary="furnishing"]',
    facing: '[data-summary="facing"]',
    overlooking: '[data-summary="overlooking"]',
    ownership: '[data-summary="ownership"]',
    society: '[data-summary="society"]',
    balcony: '[data-summary="balcony"]',
    tenentPreffered: '[data-summary="tenent-preffered"] .mb-srp__card__summary--value',
    propertyType: '.type, .property-type, .category',
    image: 'img',
    link: 'a',
    description: '.mb-srp__card--desc--text',
    amenities: '.amenity, .feature',
    listingId: '[data-id], [data-listing-id]',
    agentName: '.mb-srp__card__ads--name',
    agentPhone: '.agent-phone, .contact',
    nextButton: '.mb-pagination--next',
  },
};

module.exports = config;


