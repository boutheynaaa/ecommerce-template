
import { Router } from "express";
import type { Request, RequestHandler } from "express";
import { AppError } from "../../lib/errors.js";
import type { AuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";
import {
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "./auth.cookies.js";
import {
  loginRateLimit,
  registerRateLimit,
} from "./auth.rate-limit.js";
import { createAuthMiddleware } from "./auth.middleware.js";

interface AuthRouteDependencies {
  auth: AuthService;
  loginLimiter?: RequestHandler;
  registerLimiter?: RequestHandler;
}

function getIp(req: Request): string | undefined {
  return req.ip;
}

export function createAuthRouter(dependencies: AuthRouteDependencies) {
  const router = Router();
  const middleware = createAuthMiddleware(dependencies.auth);

  router.post(
    "/register",
    dependencies.registerLimiter ?? registerRateLimit,
    async (req, res, next) => {
      try {
        const input = registerSchema.parse(req.body);
        const result = await dependencies.auth.register(input, getIp(req));

        setSessionCookie(res, result.token, result.expiresAt);

        res.status(201).json({ user: result.user });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/login",
    dependencies.loginLimiter ?? loginRateLimit,
    async (req, res, next) => {
      try {
        const input = loginSchema.parse(req.body);
        const result = await dependencies.auth.login(input, getIp(req));

        setSessionCookie(res, result.token, result.expiresAt);

        res.json({ user: result.user });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post("/logout", middleware.loadUser, async (req, res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];

      await dependencies.auth.logout(
        typeof token === "string" ? token : undefined,
        getIp(req),
      );

      clearSessionCookie(res);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.get(
    "/me",
    middleware.loadUser,
    middleware.requireAuth,
    (req, res) => {
      if (!req.user) {
        throw new AppError(401, "UNAUTHENTICATED", "Authentication required");
      }

      res.json({ user: req.user });
    },
  );

  return router;
}
