
import { prisma } from "../../lib/prisma.js";
import type { StoreConfig } from "./store.config.js";

export const storeRepository = {
  async getConfig(): Promise<StoreConfig | null> {
    const record = await prisma.storeSettings.findUnique({
      where: { id: 1 },
    });

    if (!record) return null;

    return record.config as StoreConfig;
  },

  async saveConfig(config: StoreConfig): Promise<StoreConfig> {
    const record = await prisma.storeSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        config,
      },
      update: {
        config,
      },
    });

    return record.config as StoreConfig;
  },
};