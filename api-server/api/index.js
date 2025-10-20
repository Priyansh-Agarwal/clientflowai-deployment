// Vercel serverless entry point for ClientFlow AI Suite API
const app = require('../index-production');

// Export the Express app for Vercel
module.exports = app;