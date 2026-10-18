
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import { prisma } from "../../lib/prisma.js";
import { createCatalogRepository } from "./catalog.repository.js";
import type { ProductQuery } from "./catalog.schemas.js";

const testUrl = process.env.TEST_DATABASE_URL;
const suffix = "catalog-integration-test";
const parentSlug = `${suffix}-parent`;
const childSlug = `${suffix}-child`;
const inactiveCategorySlug = `${suffix}-inactive-category`;

const productSlugs = [
  `${suffix}-alpha`,
  `${suffix}-beta`,
  `${suffix}-gamma`,
  `${suffix}-inactive`,
];

const skuPrefix = `${suffix}-sku`;

const baseQuery: ProductQuery = {
  q: undefined,
  category: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  inStock: undefined,
  sort: "newest",
  page: 1,
  pageSize: 12,
};

describe("Catalog repository integration", () => {
  beforeAll(async () => {
    if (!testUrl) {
      throw new Error("TEST_DATABASE_URL is required");
    }

    const databaseName = new URL(testUrl).pathname.replace(/^\//, "");

    if (!databaseName.endsWith("_test")) {
      throw new Error(
        `Refusing to run integration tests against "${databaseName}"`,
      );
    }

    const database = await prisma.$queryRaw<
      Array<{ database_name: string }>
    >`SELECT current_database() AS database_name`;

    expect(database[0]?.database_name).toBe(databaseName);

    // Remove leftovers from a previous interrupted run.
    await cleanup();

    const parent = await prisma.category.create({
      data: {
        slug: parentSlug,
        name: "Integration Parent",
      },
    });

    const child = await prisma.category.create({
      data: {
        slug: childSlug,
        name: "Integration Child",
        parentId: parent.id,
      },
    });

    await prisma.category.create({
      data: {
        slug: inactiveCategorySlug,
        name: "Integration Inactive Category",
        isActive: false,
      },
    });

    const products = [
      {
        slug: productSlugs[0]!,
        name: "Alpha Cotton Shirt",
        description: "Blue cotton shirt",
        price: 1000,
        categoryId: parent.id,
        isActive: true,
        stock: 5,
      },
      {
        slug: productSlugs[1]!,
        name: "Beta Cotton Shirt",
        description: "Red cotton shirt",
        price: 2000,
        categoryId: child.id,
        isActive: true,
        stock: 0,
      },
      {
        slug: productSlugs[2]!,
        name: "Gamma Wool Coat",
        description: "Warm winter coat",
        price: 3000,
        categoryId: parent.id,
        isActive: true,
        stock: 2,
      },
      {
        slug: productSlugs[3]!,
        name: "Inactive Hidden Item",
        description: "Should not appear in catalog",
        price: 500,
        categoryId: parent.id,
        isActive: false,
        stock: 10,
      },
    ];

    for (const [index, item] of products.entries()) {
      const product = await prisma.product.create({
        data: {
          slug: item.slug,
          name: item.name,
          description: item.description,
          price: item.price,
          categoryId: item.categoryId,
          isActive: item.isActive,
        },
      });

      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: `${skuPrefix}-${index}`,
          label: "Default",
          stock: item.stock,
          isActive: true,
        },
      });

      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: `https://example.test/${item.slug}.png`,
          alt: item.name,
          position: 0,
        },
      });
    }
  }, 20_000);

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("lists active categories only", async () => {
    const repository = createCatalogRepository();
    const categories = await repository.listCategories();

    expect(categories.some((category) => category.slug === parentSlug)).toBe(true);
    expect(categories.some((category) => category.slug === childSlug)).toBe(true);
    expect(
      categories.some((category) => category.slug === inactiveCategorySlug),
    ).toBe(false);
  });

  it("returns active products and excludes inactive products", async () => {
    const repository = createCatalogRepository();
    const result = await repository.listProducts(baseQuery);
    const slugs = result.items.map((item) => item.slug);

    expect(slugs).toContain(productSlugs[0]);
    expect(slugs).toContain(productSlugs[1]);
    expect(slugs).toContain(productSlugs[2]);
    expect(slugs).not.toContain(productSlugs[3]);
  });

  it("searches by words in the product name or description", async () => {
    const repository = createCatalogRepository();

    const result = await repository.listProducts({
      ...baseQuery,
      q: "cotton shirt",
    });

    expect(result.items.map((item) => item.slug).sort()).toEqual(
      [productSlugs[0]!, productSlugs[1]!].sort(),
    );
  });

  it("includes products in a selected parent category and its children", async () => {
    const repository = createCatalogRepository();

    const result = await repository.listProducts({
      ...baseQuery,
      category: parentSlug,
    });

    const slugs = result.items.map((item) => item.slug);

    expect(slugs).toContain(productSlugs[0]);
    expect(slugs).toContain(productSlugs[1]);
    expect(slugs).toContain(productSlugs[2]);
    expect(slugs).not.toContain(productSlugs[3]);
  });

  it("filters by minimum and maximum price", async () => {
    const repository = createCatalogRepository();

    const result = await repository.listProducts({
      ...baseQuery,
      minPrice: 1500,
      maxPrice: 2500,
    });

    expect(result.items.map((item) => item.slug)).toEqual([productSlugs[1]]);
  });

  it("filters products by stock availability", async () => {
    const repository = createCatalogRepository();

    const inStock = await repository.listProducts({
      ...baseQuery,
      inStock: true,
    });

    const outOfStock = await repository.listProducts({
      ...baseQuery,
      inStock: false,
    });

    expect(inStock.items.map((item) => item.slug)).toContain(productSlugs[0]);
    expect(inStock.items.map((item) => item.slug)).toContain(productSlugs[2]);
    expect(inStock.items.map((item) => item.slug)).not.toContain(productSlugs[1]);

    expect(outOfStock.items.map((item) => item.slug)).toContain(productSlugs[1]);
    expect(outOfStock.items.map((item) => item.slug)).not.toContain(productSlugs[0]);
  });

  it("sorts products by ascending and descending price", async () => {
    const repository = createCatalogRepository();

    const ascending = await repository.listProducts({
      ...baseQuery,
      sort: "price_asc",
    });

    const descending = await repository.listProducts({
      ...baseQuery,
      sort: "price_desc",
    });

    expect(ascending.items.slice(0, 3).map((item) => item.price)).toEqual([
      1000, 2000, 3000,
    ]);

    expect(descending.items.slice(0, 3).map((item) => item.price)).toEqual([
      3000, 2000, 1000,
    ]);
  });

  it("supports pagination and returns the total count", async () => {
    const repository = createCatalogRepository();

    const firstPage = await repository.listProducts({
      ...baseQuery,
      sort: "price_asc",
      page: 1,
      pageSize: 2,
    });

    const secondPage = await repository.listProducts({
      ...baseQuery,
      sort: "price_asc",
      page: 2,
      pageSize: 2,
    });

    expect(firstPage.total).toBe(3);
    expect(firstPage.items).toHaveLength(2);
    expect(secondPage.total).toBe(3);
    expect(secondPage.items).toHaveLength(1);
    expect(
      firstPage.items.map((item) => item.slug),
    ).not.toEqual(secondPage.items.map((item) => item.slug));
  });

  it("returns product detail with active variants only", async () => {
    const repository = createCatalogRepository();

    const product = await prisma.product.findUniqueOrThrow({
      where: { slug: productSlugs[0] },
    });

    await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: `${skuPrefix}-inactive`,
        label: "Inactive variant",
        stock: 100,
        isActive: false,
      },
    });

    const detail = await repository.findProductBySlug(productSlugs[0]!);

    expect(detail).not.toBeNull();
    expect(detail?.slug).toBe(productSlugs[0]);
    expect(detail?.variants).toHaveLength(1);
    expect(detail?.variants[0]?.sku).toBe(`${skuPrefix}-0`);
  });

  it("returns null for missing and inactive product slugs", async () => {
    const repository = createCatalogRepository();

    expect(
      await repository.findProductBySlug(`${suffix}-missing`),
    ).toBeNull();

    expect(
      await repository.findProductBySlug(productSlugs[3]!),
    ).toBeNull();
  });
});

async function cleanup() {
  await prisma.product.deleteMany({
    where: { slug: { in: productSlugs } },
  });

  await prisma.productVariant.deleteMany({
    where: { sku: { startsWith: skuPrefix } },
  });

  await prisma.category.deleteMany({
    where: {
      slug: {
        in: [childSlug, parentSlug, inactiveCategorySlug],
      },
    },
  });
}
