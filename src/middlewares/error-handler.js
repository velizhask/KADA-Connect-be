const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`,
    data: null
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  console.error(`[ERROR] ${statusCode} - ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message,
    data: null,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
