const notFound = (req, res, next) => {
  res.status(404);

  res.json({
    message: `Route not found: ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
};

module.exports = {
  notFound,
  errorHandler,
};