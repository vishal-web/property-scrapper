const { MongoClient } = require("mongodb");

class MongoDB {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.db = null;
  }

  async connect() {
    console.log("🔌 Connecting to MongoDB...");
    this.client = new MongoClient(this.config.database.uri);
    await this.client.connect();
    this.db = this.client.db(this.config.database.dbName);

    await this.createIndexes();
    console.log("✅ Connected to MongoDB");
  }

  async createIndexes() {
    const propertiesCollection = this.getCollection("properties");

    await propertiesCollection.createIndexes([
      { key: { "metadata.hash": 1 }, unique: true },
      { key: { "metadata.scrapedAt": -1 } },
      { key: { location: 1 } },
      { key: { priceNumeric: 1 } },
      { key: { propertyUrl: 1 } },
    ]);
  }

  getCollection(collectionName) {
    return this.db.collection(this.config.database.collections[collectionName]);
  }

  async saveProperties(properties) {
    if (properties.length === 0)
      return { inserted: 0, updated: 0, duplicates: 0 };

    const collection = this.getCollection("properties");

    const bulkOps = properties.map((property) => {
      const { metadata, ...rest } = property;

      return {
        updateOne: {
          filter: { "metadata.hash": metadata.hash },
          update: {
            $set: {
              ...rest,

              // ✅ update metadata fields individually (NO conflicts)
              "metadata.hash": metadata.hash,
              "metadata.scrapedAt": new Date(metadata.scrapedAt),
              "metadata.source": metadata.source,
              "metadata.isActive": metadata.isActive,
              "metadata.lastUpdated": new Date(),
            },
            $setOnInsert: {
              "metadata.firstScrapedAt": new Date(),
            },
          },
          upsert: true,
        },
      };
    });

    const result = await collection.bulkWrite(bulkOps);

    return {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      duplicates: result.matchedCount - result.modifiedCount,
    };
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

  async close() {
    if (this.client) {
      await this.client.close();
      console.log("👋 MongoDB connection closed");
    }
  }
}

module.exports = MongoDB;
