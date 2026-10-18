
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      PORT: "4000",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      CORS_ORIGIN: "http://localhost:3000",
    },
  },
});
