const fs = require('fs').promises;
const path = require('path');

class Exporter {
  constructor(exportDir = 'exports') {
    this.exportDir = exportDir;
  }

  async ensureDir() {
    await fs.mkdir(this.exportDir, { recursive: true });
  }

  async exportToJSON(data, filename = null) {
    await this.ensureDir();
    
    const fname = filename || `properties_${Date.now()}.json`;
    const filepath = path.join(this.exportDir, fname);
    
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`📁 Exported to: ${filepath}`);
    
    return filepath;
  }

  async exportToCSV(data, filename = null) {
    await this.ensureDir();
    
    if (data.length === 0) {
      console.log('⚠️  No data to export');
      return null;
    }

    const fname = filename || `properties_${Date.now()}.csv`;
    const filepath = path.join(this.exportDir, fname);

    // Get all unique keys (flattened)
    const keys = this.flattenKeys(data[0]);
    
    // Create CSV header
    const header = keys.join(',');
    
    // Create CSV rows
    const rows = data.map(item => {
      return keys.map(key => {
        const value = this.getNestedValue(item, key);
        
        // Handle special characters
        if (value === null || value === undefined) return '';
        
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',');
    });

    const csv = [header, ...rows].join('\n');
    await fs.writeFile(filepath, csv);
    
    console.log(`📁 Exported to: ${filepath}`);
    return filepath;
  }

  flattenKeys(obj, prefix = '') {
    const keys = [];
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        keys.push(...this.flattenKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

module.exports = Exporter;