
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { originGuard } from "./middleware/origin-guard.js";

import {
  createStoreRouter,
  type StoreConfigService,
} from "./modules/store/store.routes.js";

import { createAuthRouter } from "./modules/auth/auth.routes.js";

import {
  createAuthService,
  type AuthService,
} from "./modules/auth/auth.service.js";

import { authRepository } from "./modules/auth/auth.repository.js";

import {
  createCatalogRouter,
} from "./modules/catalog/catalog.routes.js";

import {
  createCatalogService,
  type CatalogService,
} from "./modules/catalog/catalog.service.js";

import type { Request, Response, RequestHandler } from "express";

interface AppDependencies {
  storeSettings?: StoreConfigService;
  auth?: AuthService;
  catalog?: CatalogService;
  loginRateLimit?: RequestHandler;
  registerRateLimit?: RequestHandler;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  const authService =
    dependencies.auth ?? createAuthService(authRepository);

  const catalogService =
    dependencies.catalog ?? createCatalogService();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.use(originGuard);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/api/store",
    createStoreRouter(dependencies.storeSettings),
  );

  app.use(
    "/api/auth",
    createAuthRouter({
      auth: authService,
      loginLimiter: dependencies.loginRateLimit,
      registerLimiter: dependencies.registerRateLimit,
    }),
  );

  app.use("/api", createCatalogRouter(catalogService));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  app.use(errorHandler);

  return app;
}
