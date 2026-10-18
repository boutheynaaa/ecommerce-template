
import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "./catalog.service.js";
import type {
  CatalogRepository,
  ProductDetailRow,
  ProductListRow,
} from "./catalog.types.js";

const product: ProductListRow = {
  id: "product-1",
  slug: "notebook-a5",
  name: "A5 Notebook",
  description: "A ruled notebook",
  price: 450,
  compareAtPrice: 500,
  createdAt: new Date("2026-01-01T10:00:00.000Z"),
  category: { slug: "notebooks", name: "Notebooks" },
  images: [{ url: "https://example.com/notebook.jpg", alt: "Notebook" }],
  variants: [{ stock: 5, isActive: true }],
};

const detail: ProductDetailRow = {
  ...product,
  variants: [
    {
      id: "variant-1",
      sku: "NOTEBOOK-A5",
      label: "A5",
      stock: 5,
      isActive: true,
      position: 0,
    },
    {
      id: "variant-2",
      sku: "NOTEBOOK-A4",
      label: "A4",
      stock: 0,
      isActive: true,
      position: 1,
    },
  ],
};

function createRepository(
  overrides: Partial<CatalogRepository> = {},
): CatalogRepository {
  return {
    listCategories: vi.fn().mockResolvedValue([]),
    listProducts: vi.fn().mockResolvedValue({ items: [product], total: 1 }),
    findProductBySlug: vi.fn().mockResolvedValue(detail),
    ...overrides,
  };
}

describe("Catalog service", () => {
  it("returns categories from the repository", async () => {
    const categories = [
      {
        id: "cat-1",
        slug: "stationery",
        name: "Stationery",
        parentId: null,
        sortOrder: 0,
      },
    ];
    const repository = createRepository({
      listCategories: vi.fn().mockResolvedValue(categories),
    });

    const service = createCatalogService(repository);

    await expect(service.listCategories()).resolves.toEqual(categories);
  });

  it("maps products and never exposes raw stock quantities", async () => {
    const service = createCatalogService(createRepository());

    const result = await service.listProducts({});

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      slug: "notebook-a5",
      price: 450,
      inStock: true,
      image: {
        url: "https://example.com/notebook.jpg",
        alt: "Notebook",
      },
    });
    expect(result.items[0]).not.toHaveProperty("variants");
    expect(result.items[0]).not.toHaveProperty("stock");
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    });
  });

  it("passes parsed filters and pagination to the repository", async () => {
    const repository = createRepository();
    const service = createCatalogService(repository);

    await service.listProducts({
      q: "  notebook  ",
      minPrice: "100",
      maxPrice: "500",
      inStock: "true",
      sort: "price_asc",
      page: "2",
      pageSize: "6",
    });

    expect(repository.listProducts).toHaveBeenCalledWith({
      q: "notebook",
      category: undefined,
      minPrice: 100,
      maxPrice: 500,
      inStock: true,
      sort: "price_asc",
      page: 2,
      pageSize: 6,
    });
  });

  it("rejects invalid query parameters", async () => {
    const service = createCatalogService(createRepository());

    await expect(
      service.listProducts({ sort: "random" }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });

    await expect(
      service.listProducts({ minPrice: "900", maxPrice: "100" }),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });

  it("returns product details with availability but without stock counts", async () => {
    const service = createCatalogService(createRepository());

    const result = await service.getProductBySlug("notebook-a5");

    expect(result.variants).toEqual([
      {
        id: "variant-1",
        sku: "NOTEBOOK-A5",
        label: "A5",
        inStock: true,
      },
      {
        id: "variant-2",
        sku: "NOTEBOOK-A4",
        label: "A4",
        inStock: false,
      },
    ]);
    expect(result.variants[0]).not.toHaveProperty("stock");
    expect(result.inStock).toBe(true);
  });

  it("returns a 404 when a product does not exist", async () => {
    const repository = createRepository({
      findProductBySlug: vi.fn().mockResolvedValue(null),
    });
    const service = createCatalogService(repository);

    await expect(
      service.getProductBySlug("missing-product"),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PRODUCT_NOT_FOUND",
    });
  });

  it("rejects an invalid product slug", async () => {
    const service = createCatalogService(createRepository());

    await expect(
      service.getProductBySlug(""),
    ).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});
