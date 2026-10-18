
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { createCatalogService } from "./catalog.service.js";
import { AppError } from "../../lib/errors.js";

function createService() {
  return {
    listCategories: vi.fn().mockResolvedValue([
      {
        id: "cat-1",
        slug: "stationery",
        name: "Stationery",
        parentId: null,
        sortOrder: 0,
      },
    ]),

    listProducts: vi.fn().mockResolvedValue({
      items: [
        {
          id: "product-1",
          slug: "notebook-a5",
          name: "A5 Notebook",
          description: "A ruled notebook",
          price: 450,
          compareAtPrice: null,
          inStock: true,
          createdAt: new Date("2026-01-01T10:00:00.000Z"),
          category: {
            slug: "stationery",
            name: "Stationery",
          },
          image: null,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
    }),

    getProductBySlug: vi.fn().mockResolvedValue({
      id: "product-1",
      slug: "notebook-a5",
      name: "A5 Notebook",
      description: "A ruled notebook",
      price: 450,
      compareAtPrice: null,
      inStock: true,
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      category: {
        slug: "stationery",
        name: "Stationery",
      },
      image: null,
      variants: [
        {
          id: "variant-1",
          sku: "NOTEBOOK-A5",
          label: "A5",
          inStock: true,
        },
      ],
    }),
  };
}

describe("Catalog routes", () => {
  it("GET /api/categories returns category data", async () => {
    const catalog = createService();

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        slug: "stationery",
        name: "Stationery",
      }),
    ]);
  });

  it("GET /api/products returns items and pagination", async () => {
    const catalog = createService();

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get(
      "/api/products?page=1&pageSize=12",
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    });
  });

  it("GET /api/products rejects an invalid sort value", async () => {
    const catalog = createService();

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get(
      "/api/products?sort=random",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/products rejects repeated query parameters", async () => {
    const catalog = createService();

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get(
      "/api/products?q=pen&q=book",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/products/:slug returns product details", async () => {
    const catalog = createService();

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get(
      "/api/products/notebook-a5",
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      slug: "notebook-a5",
      price: 450,
      variants: [
        {
          sku: "NOTEBOOK-A5",
          inStock: true,
        },
      ],
    });
  });

  it("GET /api/products/:slug returns 404 for a missing product", async () => {
    const catalog = createService();

    catalog.getProductBySlug.mockRejectedValue(
      new AppError(
        404,
        "PRODUCT_NOT_FOUND",
        "Product not found",
      ),
    );

    const app = createApp({
      catalog: catalog as unknown as ReturnType<
        typeof createCatalogService
      >,
    });

    const response = await request(app).get(
      "/api/products/missing-product",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PRODUCT_NOT_FOUND");
    expect(response.body.error.message).toBe("Product not found");
  });
});
