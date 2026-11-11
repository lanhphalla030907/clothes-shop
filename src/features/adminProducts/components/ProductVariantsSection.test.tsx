import { ApiError } from "@/lib/api/errors";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductVariantsSection } from "./ProductVariantsSection";
import type {
  Product,
  ProductOptionsConfiguration,
  ProductOptionsPreview,
} from "@/types/api";

const api = vi.hoisted(() => ({
  bulkUpdateAdminInventory: vi.fn(),
  fetchAdminProductOptions: vi.fn(),
  previewAdminProductOptions: vi.fn(),
  saveAdminProductOptions: vi.fn(),
  updateAdminVariantCost: vi.fn(),
}));
const feedback = vi.hoisted(() => ({ showFeedback: vi.fn() }));

vi.mock("@/features/adminProducts/subresourcesApi", () => api);
vi.mock("@/context/feedbackContext", () => ({
  useFeedback: () => feedback,
}));
vi.mock("@/features/adminProducts/components/VariantDetails", () => ({
  VariantDetails: () => null,
}));

const product: Product = {
  id: "product-1",
  categoryId: "category-1",
  name: "Classic T-Shirt",
  slug: "classic-t-shirt",
  description: null,
  basePrice: "49.90",
  status: "DRAFT",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const configuration: ProductOptionsConfiguration = {
  productId: product.id,
  revision: 0,
  options: [],
  variants: [],
};

const preview: ProductOptionsPreview = {
  expectedRevision: 0,
  options: [
    {
      id: "option-color",
      name: "Color",
      position: 0,
      values: [
        { id: "color-black", value: "Black", position: 0 },
        { id: "color-white", value: "White", position: 1 },
      ],
    },
    {
      id: "option-size",
      name: "Size",
      position: 1,
      values: [
        { id: "size-s", value: "S", position: 0 },
        { id: "size-m", value: "M", position: 1 },
      ],
    },
  ],
  variants: [
    {
      optionValueIds: ["color-black", "size-s"],
      label: "Color: Black / Size: S",
      sku: "",
      price: "49.90",
      isActive: true,
      available: null,
    },
    {
      optionValueIds: ["color-black", "size-m"],
      label: "Color: Black / Size: M",
      sku: "",
      price: "49.90",
      isActive: true,
      available: null,
    },
    {
      optionValueIds: ["color-white", "size-s"],
      label: "Color: White / Size: S",
      sku: "",
      price: "49.90",
      isActive: true,
      available: null,
    },
    {
      optionValueIds: ["color-white", "size-m"],
      label: "Color: White / Size: M",
      sku: "",
      price: "49.90",
      isActive: true,
      available: null,
    },
  ],
};

describe("ProductVariantsSection", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.clearAllMocks();
    api.bulkUpdateAdminInventory.mockResolvedValue([]);
    api.fetchAdminProductOptions.mockResolvedValue(configuration);
    api.previewAdminProductOptions.mockResolvedValue(preview);
    api.saveAdminProductOptions.mockResolvedValue(configuration);
    api.updateAdminVariantCost.mockResolvedValue({});
  });

  it("collects product options, previews combinations and saves editable variant rows", async () => {
    render(<ProductVariantsSection product={product} />);

    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(screen.getByRole("button", { name: "Add option" }));

    let names = screen.getAllByLabelText("Option name");
    fireEvent.change(names[0], { target: { value: "Color" } });
    fireEvent.change(screen.getByPlaceholderText("Value 1"), {
      target: { value: "Black" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add value" }));
    fireEvent.change(screen.getByPlaceholderText("Value 2"), {
      target: { value: "White" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Add option" }));
    names = screen.getAllByLabelText("Option name");
    fireEvent.change(names[1], { target: { value: "Size" } });
    fireEvent.change(screen.getAllByPlaceholderText("Value 1")[1], {
      target: { value: "S" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add value" })[1]);
    fireEvent.change(screen.getAllByPlaceholderText("Value 2")[1], {
      target: { value: "M" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Generate combinations" }),
    );
    await screen.findByRole("heading", { name: "Review variants" });
    expect(api.previewAdminProductOptions).toHaveBeenCalledWith(product.id, [
      { name: "Color", values: [{ value: "Black" }, { value: "White" }] },
      { name: "Size", values: [{ value: "S" }, { value: "M" }] },
    ]);

    for (const [index, variant] of preview.variants.entries()) {
      fireEvent.change(screen.getByLabelText(`SKU for ${variant.label}`), {
        target: { value: `TSHIRT-${index + 1}` },
      });
    }

    fireEvent.click(
      screen.getByRole("button", { name: "Save variant matrix" }),
    );
    await waitFor(() => expect(api.saveAdminProductOptions).toHaveBeenCalled());

    const saved = api.saveAdminProductOptions.mock.calls[0][1];
    expect(saved).toMatchObject({
      expectedRevision: 0,
      options: [
        { id: "option-color", name: "Color" },
        { id: "option-size", name: "Size" },
      ],
    });
    expect(saved.variants).toHaveLength(4);
    expect(saved.variants[0]).toMatchObject({
      optionValueIds: ["color-black", "size-s"],
      sku: "TSHIRT-1",
      price: "49.90",
      isActive: true,
    });
  });

  it("selects by option values, previews quantities and confirms a bulk stock change", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      expectedRevision: 1,
      variants: preview.variants.map((variant, index) => ({
        ...variant,
        id: `variant-${index + 1}`,
      })),
    };
    const configurationWithStock: ProductOptionsConfiguration = {
      productId: product.id,
      revision: 1,
      options: [
        {
          id: "option-color",
          name: "Color",
          position: 0,
          isActive: true,
          values: [
            { id: "color-black", value: "Black", position: 0, isActive: true },
            { id: "color-white", value: "White", position: 1, isActive: true },
          ],
        },
        {
          id: "option-size",
          name: "Size",
          position: 1,
          isActive: true,
          values: [
            { id: "size-s", value: "S", position: 0, isActive: true },
            { id: "size-m", value: "M", position: 1, isActive: true },
          ],
        },
      ],
      variants: matrixPreview.variants.map((variant, index) => ({
        id: variant.id ?? `variant-${index + 1}`,
        sku: `SKU-${index + 1}`,
        price: "49.90",
        isActive: true,
        optionValueIds: variant.optionValueIds,
        options: [],
        inventory: {
          quantity: 10 + index,
          reservedQuantity: index,
          available: 10,
        },
      })),
    };
    api.fetchAdminProductOptions.mockResolvedValue(configurationWithStock);
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate combinations" }),
    );
    await screen.findByRole("heading", { name: "Review variants" });

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Color Black" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Size S" }));
    expect(
      screen.getByText(
        "1 variant selected. Choose option values or individual rows.",
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Select Color: Black / Size: S",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Color White" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Size M" }));
    expect(
      screen.getByText(
        "4 variants selected. Choose option values or individual rows.",
      ),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Bulk stock action"), {
      target: { value: "INCREASE" },
    });
    fireEvent.change(screen.getByLabelText("Stock movement units"), {
      target: { value: "5" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview stock changes" }),
    );
    expect(await screen.findByLabelText("Bulk stock preview")).toBeTruthy();
    expect(screen.getByText("10 (reserved 0)")).toBeTruthy();
    expect(screen.getByText("15")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Confirm bulk stock update" }),
    );
    await waitFor(() =>
      expect(api.bulkUpdateAdminInventory).toHaveBeenCalledWith(product.id, {
        variantIds: ["variant-1", "variant-2", "variant-3", "variant-4"],
        operation: "INCREASE",
        quantity: 5,
        expectedInventory: [
          {
            variantId: "variant-1",
            inventoryExists: true,
            quantity: 10,
            reservedQuantity: 0,
          },
          {
            variantId: "variant-2",
            inventoryExists: true,
            quantity: 11,
            reservedQuantity: 1,
          },
          {
            variantId: "variant-3",
            inventoryExists: true,
            quantity: 12,
            reservedQuantity: 2,
          },
          {
            variantId: "variant-4",
            inventoryExists: true,
            quantity: 13,
            reservedQuantity: 3,
          },
        ],
      }),
    );
    expect(feedback.showFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Bulk stock updated" }),
    );
  });

  it("creates missing inventory during a mixed bulk stock update", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      variants: preview.variants.map((variant, index) => ({
        ...variant,
        id: `variant-${index + 1}`,
      })),
    };
    api.fetchAdminProductOptions.mockResolvedValue({
      productId: product.id,
      revision: 1,
      options: [
        {
          id: "option-color",
          name: "Color",
          position: 0,
          isActive: true,
          values: [
            { id: "color-black", value: "Black", position: 0, isActive: true },
            { id: "color-white", value: "White", position: 1, isActive: true },
          ],
        },
        {
          id: "option-size",
          name: "Size",
          position: 1,
          isActive: true,
          values: [
            { id: "size-s", value: "S", position: 0, isActive: true },
            { id: "size-m", value: "M", position: 1, isActive: true },
          ],
        },
      ],
      variants: matrixPreview.variants.map((variant, index) => ({
        id: variant.id ?? `variant-${index + 1}`,
        sku: `SKU-${index + 1}`,
        price: "49.90",
        isActive: true,
        optionValueIds: variant.optionValueIds,
        options: [],
        inventory:
          index === 1
            ? null
            : { quantity: 10, reservedQuantity: 0, available: 10 },
      })),
    });
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(
      screen.getByRole("button", { name: "Generate combinations" }),
    );
    await screen.findByRole("heading", { name: "Review variants" });
    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.change(screen.getByLabelText("Bulk stock action"), {
      target: { value: "INCREASE" },
    });
    fireEvent.change(screen.getByLabelText("Stock movement units"), {
      target: { value: "12" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Preview stock changes" }),
    );

    expect(
      await screen.findByText("No record (starts at 0; reserved 0)"),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm bulk stock update" }),
    );
    await waitFor(() =>
      expect(api.bulkUpdateAdminInventory).toHaveBeenCalledWith(
        product.id,
        expect.objectContaining({
          operation: "INCREASE",
          quantity: 12,
          expectedInventory: expect.arrayContaining([
            {
              variantId: "variant-2",
              inventoryExists: false,
              quantity: 0,
              reservedQuantity: 0,
            },
          ]),
        }),
      ),
    );
  });

  it("shows known and unknown purchase cost states for saved variants", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      variants: preview.variants.slice(0, 2).map((variant, index) => ({
        ...variant,
        id: `variant-${index + 1}`,
      })),
    };
    api.fetchAdminProductOptions.mockResolvedValue({
      productId: product.id,
      revision: 1,
      options: [],
      variants: [
        {
          id: "variant-1",
          sku: "SKU-1",
          price: "49.90",
          isActive: true,
          optionValueIds: matrixPreview.variants[0].optionValueIds,
          options: [],
          inventory: null,
          costPrice: "12.50",
          costCurrency: "USD",
        },
        {
          id: "variant-2",
          sku: "SKU-2",
          price: "49.90",
          isActive: true,
          optionValueIds: matrixPreview.variants[1].optionValueIds,
          options: [],
          inventory: null,
          costPrice: null,
          costCurrency: null,
        },
      ],
    } as unknown as ProductOptionsConfiguration);
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(screen.getByRole("button", { name: "Generate combinations" }));
    await screen.findByRole("heading", { name: "Review variants" });

    expect(screen.getByText("Purchase cost: 12.50 USD")).toBeTruthy();
    expect(screen.getByText("Purchase cost: Unknown")).toBeTruthy();
  });

  it("updates purchase cost with currency, shows loading, and refreshes after success", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      variants: [{
        ...preview.variants[0],
        id: "variant-1",
      }],
    };
    api.fetchAdminProductOptions
      .mockResolvedValueOnce({
        productId: product.id,
        revision: 1,
        options: [],
        variants: [{
          id: "variant-1", sku: "SKU-1", price: "49.90", isActive: true,
          optionValueIds: matrixPreview.variants[0].optionValueIds, options: [], inventory: null,
          costPrice: null, costCurrency: null,
        }],
      } as unknown as ProductOptionsConfiguration)
      .mockResolvedValueOnce({
        productId: product.id,
        revision: 1,
        options: [],
        variants: [{
          id: "variant-1", sku: "SKU-1", price: "49.90", isActive: true,
          optionValueIds: matrixPreview.variants[0].optionValueIds, options: [], inventory: null,
          costPrice: "15.00", costCurrency: "KHR",
        }],
      } as unknown as ProductOptionsConfiguration);
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);
    let resolveUpdate!: (value: unknown) => void;
    api.updateAdminVariantCost.mockImplementation(
      () => new Promise((resolve) => { resolveUpdate = resolve; }),
    );

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(screen.getByRole("button", { name: "Generate combinations" }));
    await screen.findByRole("heading", { name: "Review variants" });

    fireEvent.click(screen.getByText("Purchase cost: Unknown"));
    const costInput = screen.getByLabelText("Purchase cost") as HTMLInputElement;
    const currency = screen.getByLabelText("Purchase cost currency") as HTMLSelectElement;
    fireEvent.change(costInput, { target: { value: "15" } });
    fireEvent.change(currency, { target: { value: "KHR" } });
    const save = screen.getByRole("button", { name: "Save purchase cost" });
    fireEvent.click(save);

    expect(await screen.findByRole("button", { name: "Saving purchase cost" })).toBeTruthy();
    expect(api.updateAdminVariantCost).toHaveBeenCalledTimes(1);
    expect(api.updateAdminVariantCost).toHaveBeenCalledWith(product.id, "variant-1", {
      costPrice: "15.00",
      costCurrency: "KHR",
    });
    fireEvent.click(screen.getByRole("button", { name: "Saving purchase cost" }));
    expect(api.updateAdminVariantCost).toHaveBeenCalledTimes(1);

    resolveUpdate({ id: "variant-1", costPrice: "15.00", costCurrency: "KHR" });
    await waitFor(() => expect(api.fetchAdminProductOptions.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it("shows validation error and prevents invalid purchase cost submit", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      variants: [{ ...preview.variants[0], id: "variant-1" }],
    };
    api.fetchAdminProductOptions.mockResolvedValue({
      productId: product.id, revision: 1, options: [],
      variants: [{
        id: "variant-1", sku: "SKU-1", price: "49.90", isActive: true,
        optionValueIds: matrixPreview.variants[0].optionValueIds, options: [], inventory: null,
        costPrice: null, costCurrency: null,
      }],
    } as unknown as ProductOptionsConfiguration);
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(screen.getByRole("button", { name: "Generate combinations" }));
    await screen.findByRole("heading", { name: "Review variants" });
    fireEvent.click(screen.getByText("Purchase cost: Unknown"));

    fireEvent.change(screen.getByLabelText("Purchase cost"), { target: { value: "0" } });
    expect(screen.getByText("Enter a positive amount with up to 2 decimals and select a currency.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Save purchase cost" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Save purchase cost" }));
    expect(api.updateAdminVariantCost).not.toHaveBeenCalled();
  });

  it("shows API failure when purchase cost update fails", async () => {
    const matrixPreview: ProductOptionsPreview = {
      ...preview,
      variants: [{ ...preview.variants[0], id: "variant-1" }],
    };
    api.fetchAdminProductOptions.mockResolvedValue({
      productId: product.id, revision: 1, options: [],
      variants: [{
        id: "variant-1", sku: "SKU-1", price: "49.90", isActive: true,
        optionValueIds: matrixPreview.variants[0].optionValueIds, options: [], inventory: null,
        costPrice: null, costCurrency: null,
      }],
    } as unknown as ProductOptionsConfiguration);
    api.previewAdminProductOptions.mockResolvedValue(matrixPreview);
    api.updateAdminVariantCost.mockRejectedValue(
      new ApiError("Purchase cost update failed", { kind: "conflict" }),
    );

    render(<ProductVariantsSection product={product} />);
    await screen.findByRole("heading", { name: "Product options" });
    fireEvent.click(screen.getByRole("button", { name: "Generate combinations" }));
    await screen.findByRole("heading", { name: "Review variants" });
    fireEvent.click(screen.getByText("Purchase cost: Unknown"));
    fireEvent.change(screen.getByLabelText("Purchase cost"), { target: { value: "10.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Save purchase cost" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Purchase cost update failed")).toBeTruthy();
  });
});
