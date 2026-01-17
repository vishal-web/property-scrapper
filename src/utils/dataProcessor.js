const crypto = require('crypto');

class DataProcessor {
  static extractPrice(priceString) {
    if (!priceString) return null;
    
    // Remove newlines and extra whitespace first
    const cleaned = priceString.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Extract number
    const numberMatch = cleaned.match(/[\d,]+\.?\d*/);
    if (!numberMatch) return null;
    
    const number = parseFloat(numberMatch[0].replace(/,/g, ''));
    
    // Handle different formats
    const lower = cleaned.toLowerCase();
    if (lower.includes('crore') || lower.includes('cr')) {
      return number * 10000000;
    } else if (lower.includes('lakh') || lower.includes('lac')) {
      return number * 100000;
    } else if (lower.includes('thousand') || lower.includes('k')) {
      return number * 1000;
    } else if (lower.includes('million')) {
      return number * 1000000;
    }
    
    return number || null;
  }

  static extractNumber(str) {
    if (!str) return null;
    
    // Remove newlines and clean
    const cleaned = str.replace(/\n/g, ' ').trim();
    
    // Extract first number found
    const match = cleaned.match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  }

  // Extract value after label (e.g., "BATHROOM\n1" → "1")
  static extractLabelValue(str) {
    if (!str) return '';
    
    // Split by newline and get last part (the value)
    const parts = str.split('\n').map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  }

  // Extract area with unit (e.g., "544 sqft" → 544)
  static extractArea(str) {
    if (!str) return null;
    
    const cleaned = str.replace(/\n/g, ' ').toLowerCase();
    const match = cleaned.match(/(\d+\.?\d*)\s*(sq\.?\s*ft|sqft|square feet|sq\.?\s*m|sqm|square meter)/i);
    
    if (!match) return this.extractNumber(str);
    
    let value = parseFloat(match[1]);
    
    // Convert sq meter to sq feet if needed
    if (match[2].includes('m')) {
      value = value * 10.764; // 1 sqm = 10.764 sqft
    }
    
    return value;
  }

  static generateHash(property) {
    const hashString = `${property.title}-${property.propertyUrl}`;
    return crypto.createHash('md5').update(hashString).digest('hex');
  }

  static cleanText(text) {
    if (!text) return '';
    return text
      .replace(/\n/g, ' ')       // Replace newlines with space
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();                    // Remove leading/trailing whitespace
  }

  // Clean fields that have "LABEL\nValue" format
  static cleanLabeledField(text) {
    if (!text) return '';
    
    const cleaned = this.cleanText(text);
    const parts = cleaned.split(' ');
    
    // If first part is all caps (the label), remove it
    if (parts.length > 1 && parts[0] === parts[0].toUpperCase()) {
      return parts.slice(1).join(' ');
    }
    
    return cleaned;
  }

  static processProperty(rawProperty) {
    // Extract clean values from labeled fields
    const bathroomValue = this.extractLabelValue(rawProperty.bathrooms);
    const floorValue = this.extractLabelValue(rawProperty.floor);
    const statusValue = this.extractLabelValue(rawProperty.status);
    const transactionValue = this.extractLabelValue(rawProperty.transaction);
    const furnishingValue = this.extractLabelValue(rawProperty.furnishing);
    const societyValue = this.extractLabelValue(rawProperty.society);

    return {
      // Basic fields - cleaned
      title: this.cleanText(rawProperty.title),
      price: this.cleanText(rawProperty.price),
      location: this.cleanText(rawProperty.location),
      propertyType: this.cleanText(rawProperty.propertyType),
      description: this.cleanText(rawProperty.description),
      
      // URLs and IDs
      imageUrl: rawProperty.imageUrl || '',
      propertyUrl: rawProperty.propertyUrl || '',
      listingId: rawProperty.listingId || '',
      
      // Cleaned labeled fields
      bedrooms: this.cleanText(rawProperty.bedrooms),
      bathrooms: bathroomValue,
      parking: this.cleanLabeledField(rawProperty.parking),
      area: this.cleanText(rawProperty.area),
      floor: floorValue,
      status: statusValue,
      transaction: transactionValue,
      furnishing: furnishingValue,
      facing: this.cleanLabeledField(rawProperty.facing),
      overlooking: this.cleanLabeledField(rawProperty.overlooking),
      ownership: this.cleanLabeledField(rawProperty.ownership),
      society: societyValue,
      balcony: this.cleanLabeledField(rawProperty.balcony),
      
      // Numeric extractions
      priceNumeric: this.extractPrice(rawProperty.price),
      areaNumeric: this.extractArea(rawProperty.area) || this.extractAreaFromDescription(rawProperty.description),
      bedroomsNumeric: this.extractNumber(rawProperty.bedrooms) || this.extractBedroomsFromTitle(rawProperty.title),
      bathroomsNumeric: this.extractNumber(bathroomValue),
      floorNumber: this.extractFloorNumber(floorValue),
      totalFloors: this.extractTotalFloors(floorValue),
      balconiesNumeric: this.extractNumber(rawProperty.balcony),
      
      // Metadata
      metadata: {
        hash: this.generateHash(rawProperty),
        scrapedAt: new Date(),
        lastUpdated: new Date(),
        source: rawProperty.source || 'unknown',
        isActive: true,
      },
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
    
    const match = description.match(/(\d+\.?\d*)\s*(sq\.?\s*ft|sqft|square feet)/i);
    return match ? parseFloat(match[1]) : null;
  }

  // Helper: Extract BHK from title as fallback
  static extractBedroomsFromTitle(title) {
    if (!title) return null;
    
    const match = title.match(/(\d+)\s*BHK/i);
    return match ? parseInt(match[1]) : null;
  }
}

module.exports = DataProcessor;