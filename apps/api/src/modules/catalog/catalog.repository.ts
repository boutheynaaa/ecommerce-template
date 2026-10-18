
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CatalogRepository,
  CategoryRecord,
  ProductDetailRow,
  ProductListRow,
} from "./catalog.types.js";
import type { ProductQuery } from "./catalog.schemas.js";

const ORDER_BY = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  price_asc: [{ price: "asc" }, { id: "asc" }],
  price_desc: [{ price: "desc" }, { id: "asc" }],
  name: [{ name: "asc" }, { id: "asc" }],
} satisfies Record<
  ProductQuery["sort"],
  Prisma.ProductOrderByWithRelationInput[]
>;

function buildWhere(query: ProductQuery): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (query.q) {
    const words = query.q.split(/\s+/).filter(Boolean).slice(0, 5);

    where.AND = words.map((word) => ({
      OR: [
        { name: { contains: word, mode: "insensitive" } },
        { description: { contains: word, mode: "insensitive" } },
      ],
    }));
  }

  if (query.category) {
    where.category = {
      isActive: true,
      OR: [
        { slug: query.category },
        { parent: { slug: query.category } },
      ],
    };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    where.price = {
      ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
    };
  }

  if (query.inStock === true) {
    where.variants = {
      some: { isActive: true, stock: { gt: 0 } },
    };
  } else if (query.inStock === false) {
    where.variants = {
      none: { isActive: true, stock: { gt: 0 } },
    };
  }

  return where;
}

const productSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  price: true,
  compareAtPrice: true,
  createdAt: true,
  category: {
    select: { slug: true, name: true },
  },
  images: {
    orderBy: [{ position: "asc" }, { id: "asc" }],
    take: 1,
    select: { url: true, alt: true },
  },
  variants: {
    where: { isActive: true },
    select: { stock: true, isActive: true },
  },
} satisfies Prisma.ProductSelect;

export function createCatalogRepository(): CatalogRepository {
  return {
    async listCategories(): Promise<CategoryRecord[]> {
      return prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          slug: true,
          name: true,
          parentId: true,
          sortOrder: true,
        },
      });
    },

    async listProducts(query: ProductQuery) {
      const where = buildWhere(query);
      const skip = (query.page - 1) * query.pageSize;

      const [total, items] = await prisma.$transaction([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          orderBy: ORDER_BY[query.sort],
          skip,
          take: query.pageSize,
          select: productSelect,
        }),
      ]);

      return { items, total } as {
        items: ProductListRow[];
        total: number;
      };
    },

    async findProductBySlug(
      slug: string,
    ): Promise<ProductDetailRow | null> {
      const product = await prisma.product.findFirst({
        where: { slug, isActive: true },
        select: {
          ...productSelect,
          variants: {
            where: { isActive: true },
            orderBy: [{ position: "asc" }, { id: "asc" }],
            select: {
              id: true,
              sku: true,
              label: true,
              stock: true,
              isActive: true,
              position: true,
            },
          },
        },
      });

      return product as ProductDetailRow | null;
    },
  };
}
