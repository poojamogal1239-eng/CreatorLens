const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests (running on port 3000)
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Express built-in JSON body parser
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Routes configuration
app.use('/api/auth', require('./routes/auth'));
app.use('/api/creators', require('./routes/creators'));
app.use('/api/campaigns', require('./routes/campaigns'));
app.use('/api/collaborations', require('./routes/collaborations'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/notifications', require('./routes/notifications'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`CreatorLens Backend Server running on port ${PORT}`);
});
