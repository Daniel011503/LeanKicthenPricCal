const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Import route files
const ingredientRoutes = require('./routes/ingredients');
const recipeRoutes = require('./routes/recipes');
const calculationRoutes = require('./routes/calculations');
const packingRoutes = require('./routes/packing');
const vendorRoutes = require('./routes/vendors');

// Middleware
app.use(cors({
  origin: '*', // More permissive during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/calculations', calculationRoutes);
app.use('/api/packing', packingRoutes);
app.use('/api/vendors', vendorRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Recipe Cost Calculator API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});