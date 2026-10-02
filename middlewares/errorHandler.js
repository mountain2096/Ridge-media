const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation error",
      errors: Object.values(err.errors).map((error) => error.message),
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID",
    });
  }

  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});

    return res.status(409).json({
      message: `Duplicate value for: ${fields.join(", ")}`,
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    message: err.message || "Internal server error",
  });
};

module.exports = errorHandler;