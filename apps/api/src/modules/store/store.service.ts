
import { storeDefaults } from "../../config/store.defaults.js";
import { storeConfigSchema } from "./store.config.js";
import type { StoreConfig } from "./store.config.js";
import { storeRepository } from "./store.repository.js";

function withDefaults(saved: Partial<StoreConfig>) {
  return {
    ...storeDefaults,
    ...saved,
    contact: {
      ...storeDefaults.contact,
      ...saved.contact,
    },
    theme: {
      ...storeDefaults.theme,
      ...saved.theme,
    },
    features: {
      ...storeDefaults.features,
      ...saved.features,
    },
  };
}

export function createStoreService(repository = storeRepository) {
  return {
    async getConfig(): Promise<StoreConfig> {
      try {
        const savedConfig = await repository.getConfig();

        if (!savedConfig) {
          return storeConfigSchema.parse(storeDefaults);
        }

        return storeConfigSchema.parse(withDefaults(savedConfig));
      } catch (error) {
        console.error(
          "Could not load valid store settings; using defaults.",
          error instanceof Error ? error.message : "unknown error",
        );

        return storeConfigSchema.parse(storeDefaults);
      }
    },

    async updateConfig(input: unknown): Promise<StoreConfig> {
      const config = storeConfigSchema.parse(input);
      return repository.saveConfig(config);
    },
  };
}

export const storeService = createStoreService();
