
import rateLimit from "express-rate-limit";

function rateLimitResponse(
  _req: unknown,
  res: {
    status: (code: number) => {
      json: (body: unknown) => void;
    };
  },
) {
  res.status(429).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
  });
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitResponse,
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitResponse,
});
