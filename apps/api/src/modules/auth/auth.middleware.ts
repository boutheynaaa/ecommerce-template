
import type { Request, RequestHandler } from "express";
import { SESSION_COOKIE_NAME } from "./auth.cookies.js";
import type { AuthService } from "./auth.service.js";
import type { AuthUser, Role } from "./auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function createAuthMiddleware(authService: AuthService) {
  const loadUser: RequestHandler = async (req, _res, next) => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];

      if (typeof token === "string" && token.length > 0) {
        req.user = (await authService.authenticate(token)) ?? undefined;
      }

      next();
    } catch (error) {
      next(error);
    }
  };

  const requireAuth: RequestHandler = (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        },
      });
      return;
    }

    next();
  };

  function requireRole(...roles: Role[]): RequestHandler {
    return (req: Request, res, next) => {
      if (!req.user) {
        res.status(401).json({
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required",
          },
        });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to access this resource",
          },
        });
        return;
      }

      next();
    };
  }

  return { loadUser, requireAuth, requireRole };
}
