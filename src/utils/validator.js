class Validator {
  constructor(config) {
    this.config = config;
  }

  validateProperty(property) {
    const errors = [];

    // Check required fields
    for (const field of this.config.validation.requiredFields) {
      if (!property[field] || property[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate price
    if (property.priceNumeric !== null) {
      if (property.priceNumeric < this.config.validation.priceMin) {
        errors.push('Price below minimum threshold');
      }
      if (property.priceNumeric > this.config.validation.priceMax) {
        errors.push('Price above maximum threshold');
      }
    }

    // Validate URL
    if (property.propertyUrl && !property.propertyUrl.startsWith('http')) {
      errors.push('Invalid property URL');
    }

    // Validate numeric fields
    if (property.bedroomsNumeric !== null && property.bedroomsNumeric < 0) {
      errors.push('Invalid bedrooms count');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  validateBatch(properties) {
    const valid = [];
    const invalid = [];

    properties.forEach(property => {
      const validation = this.validateProperty(property);
      if (validation.isValid) {
        valid.push(property);
      } else {
        invalid.push({ property, errors: validation.errors });
      }
    });

    return { valid, invalid };
  }
}

module.exports = Validator;