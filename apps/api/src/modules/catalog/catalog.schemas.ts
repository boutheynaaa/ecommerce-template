
import { z } from "zod";

export const PRODUCT_SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "name",
] as const;

const optionalText = (maxLength: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(1).max(maxLength).optional(),
  );

export const productQuerySchema = z
  .object({
    q: optionalText(100),
    category: optionalText(150),

    minPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),

    inStock: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),

    sort: z.enum(PRODUCT_SORTS).default("newest"),
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .strict()
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    },
  );

export type ProductQuery = z.infer<typeof productQuerySchema>;

export const slugSchema = z.string().trim().min(1).max(150);
