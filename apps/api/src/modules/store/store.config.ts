
import { z } from "zod";

const hexColor = z.string().regex(
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
  "Color must be a valid hex color",
);

const httpsUrl = z.string().url().refine(
  (value) => new URL(value).protocol === "https:",
  "URL must use HTTPS",
);

export const storeConfigSchema = z.object({
  name: z.string().trim().min(1).max(100),
  tagline: z.string().max(200),
  logoUrl: httpsUrl.nullable(),
  contact: z.object({
    email: z.string().max(254),
    phone: z.string().max(30),
    address: z.string().max(300),
  }),
  language: z.enum(["ar", "fr"]),
  currency: z.literal("DZD"),
  theme: z.object({
    primaryColor: hexColor,
    secondaryColor: hexColor,
    accentColor: hexColor,
    font: z.enum(["Cairo", "Tajawal", "Inter"]),
  }),
  features: z.object({
    coupons: z.boolean(),
    reviews: z.boolean(),
    wishlist: z.boolean(),
  }),
});

export type StoreConfig = z.infer<typeof storeConfigSchema>;
