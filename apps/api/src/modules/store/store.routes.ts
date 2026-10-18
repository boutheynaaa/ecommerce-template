
import { Router } from "express";
import { storeService } from "./store.service.js";
import type { StoreConfig } from "./store.config.js";

export interface StoreConfigService {
  getConfig(): Promise<StoreConfig>;
}

export function createStoreRouter(
  service: StoreConfigService = storeService,
) {
  const router = Router();

  router.get("/config", async (_req, res, next) => {
    try {
      const config = await service.getConfig();
      res.json({ data: config });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export const storeRouter = createStoreRouter();
