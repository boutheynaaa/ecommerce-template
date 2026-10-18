
import type { RequestHandler } from "express";
import { env } from "../config/env.js";

const allowedOrigin = new URL(env.CORS_ORIGIN).origin;

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export const originGuard: RequestHandler = (req, res, next) => {
  if (safeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");

  if (origin && origin !== allowedOrigin) {
    res.status(403).json({
      error: {
        code: "FORBIDDEN_ORIGIN",
        message: "Request origin is not allowed",
      },
    });
    return;
  }

  next();
};
