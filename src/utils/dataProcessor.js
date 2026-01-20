const crypto = require("crypto");

class DataProcessor {
  static extractPrice(priceString) {
    if (!priceString) return null;

    // Remove newlines and extra whitespace first
    const cleaned = priceString.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

    // Extract number
    const numberMatch = cleaned.match(/[\d,]+\.?\d*/);
    if (!numberMatch) return null;

    const number = parseFloat(numberMatch[0].replace(/,/g, ""));

    // Handle different formats
    const lower = cleaned.toLowerCase();
    if (lower.includes("crore") || lower.includes("cr")) {
      return number * 10000000;
    } else if (lower.includes("lakh") || lower.includes("lac")) {
      return number * 100000;
    } else if (lower.includes("thousand") || lower.includes("k")) {
      return number * 1000;
    } else if (lower.includes("million")) {
      return number * 1000000;
    }

    return number || null;
  }

  static extractNumber(str) {
    if (!str) return null;

    // Remove newlines and clean
    const cleaned = str.replace(/\n/g, " ").trim();

    // Extract first number found
    const match = cleaned.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  // Extract value after label (e.g., "BATHROOM\n1" → "1")
  static extractLabelValue(str) {
    if (!str) return "";

    // Split by newline and get last part (the value)
    const parts = str
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : "";
  }

  // Extract area with unit (e.g., "544 sqft" → 544)
  static extractArea(str) {
    if (!str) return null;

    const cleaned = str.replace(/\n/g, " ").toLowerCase();
    const match = cleaned.match(
      /(\d+\.?\d*)\s*(sq\.?\s*ft|sqft|square feet|sq\.?\s*m|sqm|square meter)/i
    );

    if (!match) return this.extractNumber(str);

    let value = parseFloat(match[1]);

    // Convert sq meter to sq feet if needed
    if (match[2].includes("m")) {
      value = value * 10.764; // 1 sqm = 10.764 sqft
    }

    return value;
  }

  static generateHash(property) {
    const hashString = `${property.title}-${property.propertyUrl}`;
    return crypto.createHash("md5").update(hashString).digest("hex");
  }

  static cleanText(text) {
    if (!text) return "";
    return text
      .replace(/\n/g, " ") // Replace newlines with space
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim(); // Remove leading/trailing whitespace
  }

  // Clean fields that have "LABEL\nValue" format
  static cleanLabeledField(text) {
    if (!text) return "";

    const cleaned = this.cleanText(text);
    const parts = cleaned.split(" ");

    // If first part is all caps (the label), remove it
    if (parts.length > 1 && parts[0] === parts[0].toUpperCase()) {
      return parts.slice(1).join(" ");
    }

    return cleaned;
  }

  static processProperty(rawProperty) {
    const jsonLdData = rawProperty.jsonLd
      ? this.processJsonLd(rawProperty.jsonLd)
      : {};

    const titleData = this.extractDetailsFromTitle(
      rawProperty.title || jsonLdData.title
    );

    const mergedData = {
      title: jsonLdData.title || rawProperty.title,
      propertyUrl: jsonLdData.propertyUrl || rawProperty.propertyUrl,
      imageUrl: jsonLdData.imageUrl || rawProperty.imageUrl,

      // Bedrooms: JSON-LD > Title > HTML
      bedrooms:
        jsonLdData.bedrooms || titleData.bedrooms || rawProperty.bedrooms,

      // Location: JSON-LD > Title > HTML
      location:
        jsonLdData.location || titleData.location || rawProperty.location,
      city: jsonLdData.city || titleData.city || "",
      country: jsonLdData.country || "",

      // Property Type: Title > HTML
      propertyType: titleData.propertyType || rawProperty.propertyType,

      // Transaction Type: Title > HTML
      transactionType: titleData.transactionType || rawProperty.transaction,

      // Geographic coordinates from JSON-LD
      latitude: jsonLdData.latitude || "",
      longitude: jsonLdData.longitude || "",
      propertySchemaType: jsonLdData.propertySchemaType || "",

      // Keep all HTML fields
      price: rawProperty.price,
      bathrooms: rawProperty.bathrooms,
      area: rawProperty.area,
      description: rawProperty.description,
      listingId: rawProperty.listingId,
      parking: rawProperty.parking,
      floor: rawProperty.floor,
      status: rawProperty.status,
      transaction: rawProperty.transaction,
      furnishing: rawProperty.furnishing,
      facing: rawProperty.facing,
      overlooking: rawProperty.overlooking,
      ownership: rawProperty.ownership,
      society: rawProperty.society,
      balcony: rawProperty.balcony,
    };

    // Extract clean values from labeled fields
    const bathroomValue = this.extractLabelValue(mergedData.bathrooms);
    const floorValue = this.extractLabelValue(mergedData.floor);
    const statusValue = this.extractLabelValue(mergedData.status);
    const transactionValue = this.extractLabelValue(mergedData.transaction);
    const furnishingValue = this.extractLabelValue(mergedData.furnishing);
    const societyValue = this.extractLabelValue(mergedData.society);

    return {
      // Basic fields - cleaned
      title: this.cleanText(mergedData.title),
      price: this.cleanText(mergedData.price),
      location: this.cleanText(mergedData.location),
      city: this.cleanText(mergedData.city),
      country: this.cleanText(mergedData.country),
      propertyType: this.cleanText(mergedData.propertyType),
      description: this.cleanText(mergedData.description),

      // URLs and IDs
      imageUrl: mergedData.imageUrl || "",
      propertyUrl: mergedData.propertyUrl || "",
      listingId: mergedData.listingId || "",

      // Geographic data
      latitude: mergedData.latitude,
      longitude: mergedData.longitude,
      propertySchemaType: mergedData.propertySchemaType,

      // Cleaned labeled fields
      bedrooms: this.cleanText(mergedData.bedrooms),
      bathrooms: bathroomValue,
      parking: this.cleanLabeledField(mergedData.parking),
      area: this.cleanText(mergedData.area),
      floor: floorValue,
      status: statusValue,
      transaction: mergedData.transactionType || transactionValue,
      furnishing: furnishingValue,
      facing: this.cleanLabeledField(mergedData.facing),
      overlooking: this.cleanLabeledField(mergedData.overlooking),
      ownership: this.cleanLabeledField(mergedData.ownership),
      society: societyValue,
      balcony: this.cleanLabeledField(mergedData.balcony),

      // Numeric extractions
      priceNumeric: this.extractPrice(mergedData.price),
      areaNumeric:
        this.extractArea(mergedData.area) ||
        this.extractAreaFromDescription(mergedData.description),
      bedroomsNumeric:
        this.extractNumber(mergedData.bedrooms) ||
        parseInt(titleData.bedrooms || "0") ||
        this.extractBedroomsFromTitle(mergedData.title),
      bathroomsNumeric: this.extractNumber(bathroomValue),
      floorNumber: this.extractFloorNumber(floorValue),
      totalFloors: this.extractTotalFloors(floorValue),
      balconiesNumeric: this.extractNumber(mergedData.balcony),

      // Metadata
      metadata: {
        hash: this.generateHash(mergedData),
        scrapedAt: new Date(),
        lastUpdated: new Date(),
        source: rawProperty.source || "unknown",
        isActive: true,
        hasJsonLd: !!rawProperty.jsonLd,
        extractedFromTitle: Object.keys(titleData).length > 0,
      },
    };
  }

  // Process JSON-LD data
  static processJsonLd(jsonLd) {
    if (!jsonLd) return {};

    return {
      title: jsonLd.name || "",
      propertyUrl: jsonLd.url || jsonLd["@id"] || "",
      bedrooms: jsonLd.numberOfRooms?.toString() || "",
      imageUrl: jsonLd.image || "",
      location: jsonLd.address?.addressLocality || "",
      city: jsonLd.address?.addressRegion || "",
      country: jsonLd.address?.addressCountry || "",
      latitude: jsonLd.geo?.latitude || null,
      longitude: jsonLd.geo?.longitude || null,
      propertySchemaType: jsonLd["@type"] || "",
    };
  }

  // Helper: Extract "6 out of 7" → floor: 6, totalFloors: 7
  static extractFloorNumber(floorStr) {
    if (!floorStr) return null;
    const match = floorStr.match(/(\d+)\s*out of/i);
    return match ? parseInt(match[1]) : this.extractNumber(floorStr);
  }

  static extractTotalFloors(floorStr) {
    if (!floorStr) return null;
    const match = floorStr.match(/out of\s*(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  // Helper: Extract area from description as fallback
  static extractAreaFromDescription(description) {
    if (!description) return null;

    const match = description.match(
      /(\d+\.?\d*)\s*(sq\.?\s*ft|sqft|square feet)/i
    );
    return match ? parseFloat(match[1]) : null;
  }

  // Helper: Extract BHK from title as fallback
  static extractBedroomsFromTitle(title) {
    if (!title) return null;

    const match = title.match(/(\d+)\s*BHK/i);
    return match ? parseInt(match[1]) : null;
  }

  static extractDetailsFromTitle(title) {
    if (!title) return {};

    const details = {};

    // Extract BHK (bedrooms)
    const bhkMatch = title.match(/(\d+)\s*BHK/i);
    if (bhkMatch) details.bedrooms = bhkMatch[1];

    // Extract property type
    const typeMatch = title.match(
      /(\d+\s*BHK\s+)?(Flat|Apartment|Villa|House|Plot|Shop|Office)/i
    );
    if (typeMatch) details.propertyType = typeMatch[2];

    // Extract transaction type
    const transactionMatch = title.match(/for\s+(Sale|Rent)/i);
    if (transactionMatch) details.transactionType = transactionMatch[1];

    // Extract location and city
    const locMatch = title.match(/for (?:sale|rent) in ([^,]+),\s*(.+?)$/i);
    if (locMatch) {
      details.location = locMatch[1].trim();
      details.city = locMatch[2].trim();
    }

    return details;
  }
}

module.exports = DataProcessor;
