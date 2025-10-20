// Minimal test server to verify Node.js + Express connectivity
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Basic middleware
app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Minimal test server is working!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Test server health check',
    uptime: process.uptime()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🧪 Minimal test server running on port ${PORT}`);
  console.log(`🌐 Test URL: http://localhost:${PORT}/`);
});

module.exports = app;

