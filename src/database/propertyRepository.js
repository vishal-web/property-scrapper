const MongoDB = require("./mongodb");

class PropertyRepository extends MongoDB {
  constructor(config) {
    super(config);
  }

  // Move saveProperties() here
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
              "metadata.source": metadata.source,
              "metadata.isActive": metadata.isActive,
              "metadata.lastUpdated": new Date(),
            },
            $setOnInsert: {
              "metadata.hash": metadata.hash, // ✅ Only set on new insert
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

  // Move other property methods here
}

module.exports = PropertyRepository;
