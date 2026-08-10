const express = require('express');
const cors = require('cors');
const dns = require('dns');

require('dotenv').config();

dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = require('./config/db');

const app = express();

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

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Global Rate Limiter
const { apiLimiter } = require('./middleware/rateLimiter');
app.use(apiLimiter);

// Connect to MongoDB
connectDB();

// Mount Routes (API routes come BEFORE root redirect route)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/url', require('./routes/url'));
app.use('/', require('./routes/index')); 

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));