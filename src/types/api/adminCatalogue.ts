import type {
  Inventory,
  ProductImage,
  ProductVariant,
  VariantOptionRecord,
} from "./catalogue";
import type { MoneyString, UUID } from "./common";

/**
 * Write contracts for the nested admin catalogue endpoints.
 *
 * The read models already exist in `catalogue.ts` — the same records the
 * storefront consumes. This file adds only the bodies the admin routes accept,
 * mirroring `CreateCategoryDto`, `CreateProductVariantDto`, the variant option
 * DTOs, the inventory DTOs and the product image DTOs.
 *
 * Every amount stays a two-decimal string and every counter stays a whole
 * number, because those are the shapes the server validates.
 */

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: UUID;
  isActive?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  parentId?: UUID | null;
  isActive?: boolean;
}

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  parentId: string;
  isActive: boolean;
}

export const EMPTY_CATEGORY_FORM: CategoryFormValues = {
  name: "",
  slug: "",
  description: "",
  parentId: "",
  isActive: true,
};

export interface CreateVariantRequest {
  sku: string;
  price: MoneyString;
  isActive?: boolean;
}

export interface UpdateVariantRequest {
  sku?: string;
  price?: MoneyString;
  isActive?: boolean;
}

export interface VariantFormValues {
  sku: string;
  price: string;
  isActive: boolean;
}

export interface CreateVariantOptionRequest {
  optionName: string;
  optionValue: string;
}

export interface UpdateVariantOptionRequest {
  optionName?: string;
  optionValue?: string;
}

export interface ProductOptionValueDraft {
  id?: UUID;
  value: string;
}

export interface ProductOptionDraft {
  id?: UUID;
  name: string;
  values: ProductOptionValueDraft[];
}

export interface ProductOptionValueRecord {
  id: UUID;
  value: string;
  position: number;
  isActive: boolean;
}

export interface ProductOptionRecord {
  id: UUID;
  name: string;
  position: number;
  isActive: boolean;
  values: ProductOptionValueRecord[];
}

export interface ProductVariantMatrixRecord {
  id: UUID;
  sku: string;
  price: MoneyString;
  costPrice?: MoneyString | null;
  costCurrency?: string | null;
  isActive: boolean;
  optionValueIds: UUID[];
  options: Array<{ optionName: string; optionValue: string }>;
  inventory: Pick<
    Inventory,
    "quantity" | "reservedQuantity" | "available"
  > | null;
}

export interface ProductOptionsConfiguration {
  productId: UUID;
  revision: number;
  options: ProductOptionRecord[];
  variants: ProductVariantMatrixRecord[];
}

export interface ProductOptionsPreview {
  expectedRevision: number;
  options: Array<{
    id: UUID;
    name: string;
    position: number;
    values: Array<{ id: UUID; value: string; position: number }>;
  }>;
  variants: Array<{
    id?: UUID;
    optionValueIds: UUID[];
    label: string;
    sku: string;
    price: MoneyString;
    costPrice?: MoneyString | null;
    costCurrency?: string | null;
    isActive: boolean;
    available: number | null;
  }>;
}

export interface SaveProductOptionsRequest {
  expectedRevision: number;
  options: ProductOptionDraft[];
  variants: Array<{
    id?: UUID;
    optionValueIds: UUID[];
    sku: string;
    price: MoneyString;
    isActive: boolean;
  }>;
}

export interface CreateInventoryRequest {
  quantity?: number;
  reservedQuantity?: number;
}

export interface UpdateInventoryRequest {
  quantity?: number;
  reservedQuantity?: number;
}

export type BulkInventoryOperation = "SET" | "INCREASE" | "DECREASE";

export interface BulkInventoryRequest {
  variantIds: UUID[];
  operation: BulkInventoryOperation;
  quantity: number;
  expectedInventory: Array<{
    variantId: UUID;
    inventoryExists: boolean;
    quantity: number;
    reservedQuantity: number;
  }>;
}

export interface BulkVariantCostItem {
  variantId: UUID;
  costPrice: string;
  costCurrency: string;
}

export interface BulkVariantCostRequest {
  variants: BulkVariantCostItem[];
}

export interface CreateProductImageRequest {
  productId: UUID;
  imageUrl: string;
  publicId: string;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface UpdateProductImageRequest {
  imageUrl?: string;
  publicId?: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface UploadProductImageInput {
  file: File;
  altText?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface ImageMetadataFormValues {
  imageUrl: string;
  publicId: string;
  altText: string;
  sortOrder: string;
  isPrimary: boolean;
}

export const EMPTY_IMAGE_METADATA: ImageMetadataFormValues = {
  imageUrl: "",
  publicId: "",
  altText: "",
  sortOrder: "0",
  isPrimary: false,
};

export interface UploadCategoryImageInput {
  file: File;
  altText?: string;
}

export interface ImageUploadFormValues {
  file: File | null;
  altText: string;
  sortOrder: string;
  isPrimary: boolean;
}

/** The response shapes, re-exported so a feature imports one module. */
export type { Inventory, ProductImage, ProductVariant, VariantOptionRecord };
