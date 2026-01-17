# Property Scraper

Production-ready web scraper for property websites with MongoDB integration.

## Features

- ✅ Puppeteer-based scraping with pagination
- ✅ MongoDB integration with duplicate detection
- ✅ Data validation & cleaning
- ✅ JSON & CSV export
- ✅ Error logging & statistics
- ✅ Configurable via environment variables

## Setup

1. **Install dependencies:**
```bash
   npm install
```

2. **Configure environment:**
   Edit `.env` file with your settings

3. **Customize selectors:**
   Edit `config/config.js` selectors section

4. **Run:**
```bash
   npm start
```

## Project Structure

- `config/` - Configuration files
- `src/` - Source code
  - `scraper.js` - Main scraper
  - `database/` - MongoDB operations
  - `utils/` - Helper utilities
- `exports/` - Generated exports
- `logs/` - Application logs

## Usage
```bash
# Run once
npm start

# Development mode (auto-restart)
npm run dev
```

## Configuration

All settings in `.env` and `config/config.js`

Key configurations:
- Target URL
- MongoDB connection
- CSS selectors (customize for your site)
- Validation rules

## License

MIT