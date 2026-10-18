
import { AppError } from "../../lib/errors.js";
import { createCatalogRepository } from "./catalog.repository.js";
import { productQuerySchema, slugSchema } from "./catalog.schemas.js";
import type { ProductQuery } from "./catalog.schemas.js";
import type {
  CatalogRepository,
  ProductDetail,
  ProductSummary,
} from "./catalog.types.js";

function toSummary(
  product: Awaited<
    ReturnType<CatalogRepository["findProductBySlug"]>
  >,
): ProductSummary {
  if (!product) {
    throw new Error("Cannot map a missing product");
  }

  const firstImage = product.images[0] ?? null;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    inStock: product.variants.some((variant) => variant.stock > 0),
    createdAt: product.createdAt,
    category: product.category,
    image: firstImage,
  };
}

export function createCatalogService(
  repository: CatalogRepository = createCatalogRepository(),
) {
  return {
    async listCategories() {
      return repository.listCategories();
    },

    async listProducts(rawQuery: unknown) {
      const query = productQuerySchema.parse(rawQuery);
      const result = await repository.listProducts(query);

      return {
        items: result.items.map((product) => ({
          id: product.id,
          slug: product.slug,
          name: product.name,
          description: product.description,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          inStock: product.variants.some((variant) => variant.stock > 0),
          createdAt: product.createdAt,
          category: product.category,
          image: product.images[0] ?? null,
        })),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / query.pageSize),
        },
      };
    },

    async getProductBySlug(rawSlug: unknown): Promise<ProductDetail> {
      const slug = slugSchema.parse(rawSlug);
      const product = await repository.findProductBySlug(slug);

      if (!product) {
        throw new AppError(
          404,
          "PRODUCT_NOT_FOUND",
          "Product not found",
        );
      }

      return {
        ...toSummary(product),
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          label: variant.label,
          inStock: variant.stock > 0,
        })),
      };
    },
  };
}

export type CatalogService = ReturnType<typeof createCatalogService>;
export type { ProductQuery };
