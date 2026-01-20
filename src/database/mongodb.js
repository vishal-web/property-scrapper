const { MongoClient } = require("mongodb");

class MongoDB {
  static client = null;
  static db = null;
  static config = null;

  constructor() {
    // ✅ No config parameter needed
    // Uses static config set by MongoDB.connect()
  }

  static async connect(config) {
    if (MongoDB.client && MongoDB.db) {
      console.log("✅ Already connected to MongoDB");
      return;
    }

    MongoDB.config = config; // ✅ Store config statically
    console.log("🔌 Connecting to MongoDB...");
    MongoDB.client = new MongoClient(config.database.uri);
    await MongoDB.client.connect();
    MongoDB.db = MongoDB.client.db(config.database.dbName);

    await MongoDB.createAllIndexes();
    console.log("✅ Connected to MongoDB");
  }

  static async createAllIndexes() {
    const propertiesCollection = MongoDB.db.collection(
      MongoDB.config.database.collections.properties
    );
    await propertiesCollection.createIndexes([
      { key: { "metadata.hash": 1 }, unique: true },
      { key: { "metadata.scrapedAt": -1 } },
      { key: { location: 1 } },
      { key: { priceNumeric: 1 } },
      { key: { propertyUrl: 1 } },
    ]);

    const progressCollection = MongoDB.db.collection(
      MongoDB.config.database.collections.scrapeProgress
    );
    await progressCollection.createIndexes([
      { key: { baseUrl: 1 }, unique: true },
      { key: { lastScrapedAt: -1 } },
      { key: { status: 1 } },
    ]);
  }

  getCollection(collectionName) {
    return MongoDB.db.collection(
      MongoDB.config.database.collections[collectionName]
    );
  }

  static async close() {
    if (MongoDB.client) {
      await MongoDB.client.close();
      MongoDB.client = null;
      MongoDB.db = null;
      MongoDB.config = null;
      console.log("👋 MongoDB connection closed");
    }
  }
}

module.exports = MongoDB;
