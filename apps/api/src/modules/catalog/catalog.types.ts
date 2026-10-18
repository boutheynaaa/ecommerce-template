
import type { ProductQuery } from "./catalog.schemas.js";

export interface CategoryRecord {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

export interface ProductListRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  createdAt: Date;
  category: {
    slug: string;
    name: string;
  } | null;
  images: Array<{
    url: string;
    alt: string;
  }>;
  variants: Array<{
    stock: number;
    isActive: boolean;
  }>;
}

export interface ProductDetailRow extends ProductListRow {
  variants: Array<{
    id: string;
    sku: string;
    label: string;
    stock: number;
    isActive: boolean;
    position: number;
  }>;
}

export interface CatalogRepository {
  listCategories(): Promise<CategoryRecord[]>;

  listProducts(
    query: ProductQuery,
  ): Promise<{ items: ProductListRow[]; total: number }>;

  findProductBySlug(slug: string): Promise<ProductDetailRow | null>;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  inStock: boolean;
  createdAt: Date;
  category: {
    slug: string;
    name: string;
  } | null;
  image: {
    url: string;
    alt: string;
  } | null;
}

export interface ProductDetail extends ProductSummary {
  variants: Array<{
    id: string;
    sku: string;
    label: string;
    inStock: boolean;
  }>;
}
