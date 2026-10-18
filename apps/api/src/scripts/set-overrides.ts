
import { prisma } from "../lib/prisma.js";
import { storeConfigSchema } from "../modules/store/store.config.js";
import { storeDefaults } from "../config/store.defaults.js";

const customConfig = {
  ...storeDefaults,
  name: "Boutheyna Store",
  tagline: "Your favorite products, in one place.",
  theme: {
    ...storeDefaults.theme,
    primaryColor: "#7C3AED",
    accentColor: "#EC4899",
  },
};

async function main() {
  const config = storeConfigSchema.parse(customConfig);

  const saved = await prisma.storeSettings.upsert({
    where: { id: 1 },
    create: { id: 1, config },
    update: { config },
  });

  console.log("Store settings saved successfully.");
  console.log("Store name:", saved.config);
}

main()
  .catch((error) => {
    console.error("Failed to save store settings:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
