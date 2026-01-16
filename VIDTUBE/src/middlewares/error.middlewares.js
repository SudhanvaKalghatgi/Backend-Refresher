import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // ✅ If error is not ApiError, convert it into ApiError
  if (!(error instanceof ApiError)) {
    const isMongooseError = error instanceof mongoose.Error;

    const statusCode = error.statusCode
      ? error.statusCode
      : isMongooseError
      ? 400
      : 500;

    const message = error.message || "Something went wrong!!!";

    error = new ApiError(
      statusCode,
      message,
      error?.errors || [],
      error?.stack || ""
    );
  }

  return res.status(error.statusCode).json({
    statusCode: error.statusCode,
    data: null,
    success: false,
    errors: error.errors || [],
    message: error.message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  });
};

export { errorHandler };
