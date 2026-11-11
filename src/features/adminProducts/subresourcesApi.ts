import {
  apiDelete,
  apiGetList,
  apiGetOne,
  apiPatch,
  apiPost,
  apiRequest,
} from "@/lib/api/client";
import { API, UPLOAD_TIMEOUT_MS } from "@/lib/api/config";
import { isApiError } from "@/lib/api/errors";
import type {
  CreateInventoryRequest,
  CreateProductImageRequest,
  CreateVariantOptionRequest,
  CreateVariantRequest,
  BulkInventoryRequest,
  BulkVariantCostRequest,
  Inventory,
  ProductImage,
  ProductOptionDraft,
  ProductOptionsConfiguration,
  ProductOptionsPreview,
  ProductVariant,
  SaveProductOptionsRequest,
  UpdateInventoryRequest,
  UpdateProductImageRequest,
  UpdateVariantOptionRequest,
  UpdateVariantRequest,
  UploadProductImageInput,
  UUID,
  VariantOptionRecord,
} from "@/types/api";

/**
 * The nested admin routes below one product.
 *
 * These are the only catalogue-management routes that need a `productId` (and,
 * for options and stock, a `variantId`) in the path. Keeping the path composition
 * here means no component invents an endpoint or forgets an ownership segment.
 * Authentication and 401 handling stay in `lib/api/client`.
 */

const productPath = (productId: UUID): string =>
  `${API.adminProducts}/${productId}`;

const variantsPath = (productId: UUID): string =>
  `${productPath(productId)}/variants`;

const variantCostPath = (productId: UUID, variantId: UUID): string =>
  `${variantsPath(productId)}/${variantId}/cost`;

const bulkVariantCostPath = (productId: UUID): string =>
  `${variantsPath(productId)}/cost/bulk`;

const optionsPath = (productId: UUID, variantId: UUID): string =>
  `${variantsPath(productId)}/${variantId}/options`;

const inventoryPath = (productId: UUID, variantId: UUID): string =>
  `${variantsPath(productId)}/${variantId}/inventory`;

const bulkInventoryPath = (productId: UUID): string =>
  `${productPath(productId)}/inventory/bulk`;

const imagesPath = (productId: UUID): string =>
  `${productPath(productId)}/images`;

const productOptionsPath = (productId: UUID): string =>
  `${productPath(productId)}/options`;

const requireEntity = <T>(entity: T | undefined, message: string): T => {
  if (entity === undefined) throw new Error(message);
  return entity;
};

/* -------------------------------- variants -------------------------------- */

export const fetchAdminProductVariants = (
  productId: UUID,
  signal?: AbortSignal,
): Promise<ProductVariant[]> =>
  apiGetList<ProductVariant>(variantsPath(productId), { signal });

export const createAdminProductVariant = async (
  productId: UUID,
  body: CreateVariantRequest,
): Promise<ProductVariant> =>
  requireEntity(
    await apiPost<ProductVariant>(variantsPath(productId), body),
    "The catalogue did not return the saved variant.",
  );

export const updateAdminProductVariant = async (
  productId: UUID,
  variantId: UUID,
  body: UpdateVariantRequest,
): Promise<ProductVariant> =>
  requireEntity(
    await apiPatch<ProductVariant>(
      `${variantsPath(productId)}/${variantId}`,
      body,
    ),
    "The catalogue did not return the saved variant.",
  );

export const updateAdminVariantCost = async (
  productId: UUID,
  variantId: UUID,
  body: { costPrice: string; costCurrency: string },
): Promise<ProductVariant> =>
  requireEntity(
    await apiPatch<ProductVariant>(variantCostPath(productId, variantId), body),
    "The catalogue did not return the saved purchase cost.",
  );

export const bulkUpdateAdminVariantCost = async (
  productId: UUID,
  body: BulkVariantCostRequest,
): Promise<ProductVariant[]> =>
  requireEntity(
    await apiPatch<ProductVariant[]>(bulkVariantCostPath(productId), body),
    "The catalogue did not return the updated purchase costs.",
  );

export const deleteAdminProductVariant = async (
  productId: UUID,
  variantId: UUID,
): Promise<void> => {
  await apiDelete<void>(`${variantsPath(productId)}/${variantId}`);
};

/* --------------------------- product option matrix ----------------------- */

export const fetchAdminProductOptions = (
  productId: UUID,
  signal?: AbortSignal,
): Promise<ProductOptionsConfiguration> =>
  apiGetOne<ProductOptionsConfiguration>(productOptionsPath(productId), {
    signal,
  });

export const previewAdminProductOptions = async (
  productId: UUID,
  options: ProductOptionDraft[],
): Promise<ProductOptionsPreview> =>
  requireEntity(
    await apiPost<ProductOptionsPreview>(
      `${productOptionsPath(productId)}/preview`,
      {
        options,
      },
    ),
    "The catalogue did not return the generated variant combinations.",
  );

export const saveAdminProductOptions = async (
  productId: UUID,
  body: SaveProductOptionsRequest,
): Promise<ProductOptionsConfiguration> =>
  requireEntity(
    await apiRequest<ProductOptionsConfiguration>(
      productOptionsPath(productId),
      {
        method: "PUT",
        body,
      },
    ),
    "The catalogue did not return the saved product option matrix.",
  );

/* ----------------------------- variant options ---------------------------- */

export const fetchAdminVariantOptions = (
  productId: UUID,
  variantId: UUID,
  signal?: AbortSignal,
): Promise<VariantOptionRecord[]> =>
  apiGetList<VariantOptionRecord>(optionsPath(productId, variantId), {
    signal,
  });

export const createAdminVariantOption = async (
  productId: UUID,
  variantId: UUID,
  body: CreateVariantOptionRequest,
): Promise<VariantOptionRecord> =>
  requireEntity(
    await apiPost<VariantOptionRecord>(optionsPath(productId, variantId), body),
    "The catalogue did not return the saved option.",
  );

export const updateAdminVariantOption = async (
  productId: UUID,
  variantId: UUID,
  optionId: UUID,
  body: UpdateVariantOptionRequest,
): Promise<VariantOptionRecord> =>
  requireEntity(
    await apiPatch<VariantOptionRecord>(
      `${optionsPath(productId, variantId)}/${optionId}`,
      body,
    ),
    "The catalogue did not return the saved option.",
  );

export const deleteAdminVariantOption = async (
  productId: UUID,
  variantId: UUID,
  optionId: UUID,
): Promise<void> => {
  await apiDelete<void>(`${optionsPath(productId, variantId)}/${optionId}`);
};

/* --------------------------------- stock ---------------------------------- */

/**
 * A variant without a stock row is a `404` on this route, not an empty record.
 * The admin screen needs to tell the two apart so it can offer "create stock"
 * rather than showing an error for the normal uncounted state.
 */
export const fetchAdminInventory = async (
  productId: UUID,
  variantId: UUID,
  signal?: AbortSignal,
): Promise<Inventory | null> => {
  try {
    return await apiGetOne<Inventory>(inventoryPath(productId, variantId), {
      signal,
    });
  } catch (error: unknown) {
    if (isApiError(error) && error.status === 404) return null;
    throw error;
  }
};

export const createAdminInventory = async (
  productId: UUID,
  variantId: UUID,
  body: CreateInventoryRequest,
): Promise<Inventory> =>
  requireEntity(
    await apiPost<Inventory>(inventoryPath(productId, variantId), body),
    "The catalogue did not return the saved stock record.",
  );

export const updateAdminInventory = async (
  productId: UUID,
  variantId: UUID,
  body: UpdateInventoryRequest,
): Promise<Inventory> =>
  requireEntity(
    await apiPatch<Inventory>(inventoryPath(productId, variantId), body),
    "The catalogue did not return the saved stock record.",
  );

export const bulkUpdateAdminInventory = async (
  productId: UUID,
  body: BulkInventoryRequest,
): Promise<Inventory[]> =>
  requireEntity(
    await apiPatch<Inventory[]>(bulkInventoryPath(productId), body),
    "The catalogue did not return the updated stock records.",
  );

/* --------------------------------- images --------------------------------- */

export const fetchAdminProductImages = (
  productId: UUID,
  signal?: AbortSignal,
): Promise<ProductImage[]> =>
  apiGetList<ProductImage>(imagesPath(productId), { signal });

export const createAdminProductImage = async (
  productId: UUID,
  body: CreateProductImageRequest,
): Promise<ProductImage> =>
  requireEntity(
    await apiPost<ProductImage>(imagesPath(productId), body),
    "The catalogue did not return the saved image.",
  );

export const uploadAdminProductImage = async (
  productId: UUID,
  input: UploadProductImageInput,
): Promise<ProductImage> => {
  const form = new FormData();
  form.append("file", input.file);
  if (input.altText !== undefined && input.altText.trim() !== "") {
    form.append("altText", input.altText.trim());
  }
  if (input.sortOrder !== undefined)
    form.append("sortOrder", String(input.sortOrder));
  if (input.isPrimary !== undefined)
    form.append("isPrimary", String(input.isPrimary));

  return requireEntity(
    await apiPost<ProductImage>(`${imagesPath(productId)}/upload`, form, {
      timeoutMs: UPLOAD_TIMEOUT_MS,
    }),
    "The catalogue did not return the uploaded image.",
  );
};

export const updateAdminProductImage = async (
  productId: UUID,
  imageId: UUID,
  body: UpdateProductImageRequest,
): Promise<ProductImage> =>
  requireEntity(
    await apiPatch<ProductImage>(`${imagesPath(productId)}/${imageId}`, body),
    "The catalogue did not return the saved image.",
  );

export const deleteAdminProductImage = async (
  productId: UUID,
  imageId: UUID,
): Promise<void> => {
  await apiDelete<void>(`${imagesPath(productId)}/${imageId}`);
};
