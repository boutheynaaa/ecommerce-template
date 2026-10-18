
import { Router } from "express";
import { createCatalogService } from "./catalog.service.js";
import type { CatalogService } from "./catalog.service.js";
import { productQuerySchema, slugSchema } from "./catalog.schemas.js";

export function createCatalogRouter(
  service: CatalogService = createCatalogService(),
) {
  const router = Router();

  router.get("/categories", async (_req, res, next) => {
    try {
      const items = await service.listCategories();
      res.json({ data: items });
    } catch (error) {
      next(error);
    }
  });

  router.get("/products", async (req, res, next) => {
    try {
      const query = productQuerySchema.parse(req.query);
      const result = await service.listProducts(query);

      res.json({
        data: result.items,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/products/:slug", async (req, res, next) => {
    try {
      const slug = slugSchema.parse(req.params.slug);
      const item = await service.getProductBySlug(slug);

      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
