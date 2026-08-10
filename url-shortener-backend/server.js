const express = require('express');
const cors = require('cors');
const dns = require('dns');
const useragent = require('express-useragent'); // FIXED: Added missing import

require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = require('./config/db');

const app = express();

// 1. TRUST PROXY FOR RENDER (Fixes express-rate-limit IP detection on cloud hosts)
app.set('trust proxy', 1);

// --- CORS CONFIGURATION FOR PRODUCTION & LOCAL DEV ---
const allowedOrigins = [
  'http://localhost:5173', // Vite local server
  'http://localhost:3000', // CRA / Next.js local server
  process.env.FRONTEND_URL // Live production frontend URL from Render
].filter(Boolean); // Cleans out undefined values if FRONTEND_URL isn't set yet

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, curl, or direct browser redirect links)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true
}));
// ---------------------------------------------------

// Middleware to parse incoming JSON payloads & user agent
app.use(express.json());
app.use(useragent.express());

// Global Rate Limiter
const { apiLimiter } = require('./middleware/rateLimiter');
app.use(apiLimiter);

// Connect to MongoDB
connectDB();

// 2. HEALTH CHECK ROUTE
app.get('/', (req, res) => {
  res.send('SnapLink API Server is Live & Running!');
});

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/url', require('./routes/url'));
app.use('/', require('./routes/index')); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));