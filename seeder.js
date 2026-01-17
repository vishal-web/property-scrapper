const config = require("./config/config");
const PropertyJSON = require("./scraped-checkpoint-copy.json");
const MongoDB = require("./src/database/mongodb");
const Validator = require("./src/utils/validator");
const Exporter = require("./src/utils/exporter");
const DataProcessor = require("./src/utils/dataProcessor");

async function main() {
  const startTime = new Date();
  const database = new MongoDB(config);

  const validator = new Validator(config);
  const exporter = new Exporter();

  try {
    await database.connect();
    // Validate
    console.log("\n🔍 Validating data...");
    const { valid, invalid } = validator.validateBatch(PropertyJSON);
    console.log(`✅ Valid: ${valid.length}`);
    console.log(`❌ Invalid: ${invalid.length}`);

    // Save to MongoDB
    if (valid.length > 0) {
      const data = valid.map((p) =>
        DataProcessor.processProperty({
          ...p,
        })
      );

      console.log("\n💾 Saving to MongoDB...");
      const result = await database.saveProperties(data);
      console.log(`✅ Inserted: ${result.inserted}`);
      console.log(`✅ Updated: ${result.updated}`);
      console.log(`ℹ️  Duplicates: ${result.duplicates}`);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

main();
