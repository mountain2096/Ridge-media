const { rateLimit } = require("express-rate-limit");

const TOO_MANY_REQUESTS_MESSAGE = "Bạn thao tác quá nhiều lần, vui lòng thử lại sau.";

function createRateLimiters(overrides = {}) {
    const createLimiter = (name, windowMs, limit, options = {}) => rateLimit({
        windowMs: overrides[name]?.windowMs ?? windowMs,
        limit: overrides[name]?.limit ?? limit,
        standardHeaders: true,
        legacyHeaders: false,
        message: { message: TOO_MANY_REQUESTS_MESSAGE },
        ...options,
    });

    return {
        login: createLimiter("login", 15 * 60 * 1000, 10, { skipSuccessfulRequests: true }),
        register: createLimiter("register", 60 * 60 * 1000, 20),
        forgotPassword: createLimiter("forgotPassword", 15 * 60 * 1000, 5),
        resetPassword: createLimiter("resetPassword", 15 * 60 * 1000, 10),
    };
}

module.exports = {
    ...createRateLimiters(),
    createRateLimiters,
};
