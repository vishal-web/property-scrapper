const express = require('express');
const cors = require('cors');
const runScraper = require('./index');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Store active SSE connections
const clients = new Map();

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Scraper API is running' });
});

// SSE endpoint for streaming logs
app.get('/scrape/logs/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Store client connection
  clients.set(sessionId, res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clients.delete(sessionId);
    console.log(`Client disconnected: ${sessionId}`);
  });
});

// Start scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ 
      error: 'URL is required',
      example: { url: 'https://www.magicbricks.com/...' }
    });
  }
  
  // Generate unique session ID
  const sessionId = Date.now().toString();
  
  // Respond immediately with session info
  res.json({ 
    status: 'started',
    sessionId,
    logsUrl: `http://localhost:${PORT}/scrape/logs/${sessionId}`,
    url
  });
  
  // Run scraper in background with log streaming
  runScraperWithLogs(sessionId, url);
});

// Function to run scraper and stream logs
async function runScraperWithLogs(sessionId, url) {
  const client = clients.get(sessionId);
  
  // Helper to send log to client
  const sendLog = (type, message, data = {}) => {
    const activeClient = clients.get(sessionId);
    if (activeClient) {
      activeClient.write(`data: ${JSON.stringify({ type, message, ...data })}\n\n`);
    }
  };
  
  // Intercept console.log
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args) => {
    const message = args.join(' ');
    originalLog(message);
    sendLog('log', message);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    originalError(message);
    sendLog('error', message);
  };
  
  try {
    sendLog('info', `Starting scrape for: ${url}`);
    
    await runScraper(url);
    
    sendLog('success', 'Scraping completed successfully!');
    sendLog('completed', 'Done');
    
  } catch (error) {
    sendLog('error', `Scraping failed: ${error.message}`);
    sendLog('failed', error.message);
    
  } finally {
    // Restore original console methods
    console.log = originalLog;
    console.error = originalError;
    
    // Close connection after a delay
    setTimeout(() => {
      const activeClient = clients.get(sessionId);
      if (activeClient) {
        activeClient.end();
        clients.delete(sessionId);
      }
    }, 1000);
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Scraper API running on http://localhost:${PORT}`);
  console.log(`📡 SSE logs available at /scrape/logs/:sessionId`);
});