// Middleware for error handling
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
};

// Middleware for request logging
const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
};

// Middleware for validation
const validateRequest = (req, res, next) => {
  if (!req.body && req.method !== 'GET' && req.method !== 'DELETE') {
    return res.status(400).json({ error: 'Request body is required' });
  }
  next();
};

module.exports = {
  errorHandler,
  requestLogger,
  validateRequest
};
