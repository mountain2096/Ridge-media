const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation error",
      errors: Object.values(err.errors).map(
        (error) => error.message
      ),
    });
  }

  // Invalid MongoDB ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID",
    });
  }

  // Duplicate unique field
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});

    return res.status(409).json({
      message: "Duplicate value",
      fields,
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? "Internal server error"
        : err.message,
  });
};

module.exports = errorHandler;