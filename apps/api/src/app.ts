
import express from "express";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import {
  createStoreRouter,
  type StoreConfigService,
} from "./modules/store/store.routes.js";

interface AppDependencies {
  storeSettings?: StoreConfigService;
}

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use(
    "/api/store",
    createStoreRouter(dependencies.storeSettings),
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });

  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      console.error(err);
      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong",
        },
      });
    },
  );

  return app;
}
