import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Action } from "@/components/ui/Action";
import { Panel, PanelHeader } from "@/components/account/PageHeader";
import {
  EmptyState,
  ErrorState,
  InlineNotice,
} from "@/components/account/States";
import { Skeleton } from "@/components/account/Skeleton";
import { VariantDetails } from "@/features/adminProducts/components/VariantDetails";
import {
  bulkUpdateAdminInventory,
  fetchAdminProductOptions,
  previewAdminProductOptions,
  saveAdminProductOptions,
} from "@/features/adminProducts/subresourcesApi";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useMutation } from "@/hooks/useMutation";
import { useFeedback } from "@/context/feedbackContext";
import { isApiError, toUserMessage } from "@/lib/api/errors";
import type {
  Product,
  BulkInventoryOperation,
  BulkInventoryRequest,
  ProductOptionDraft,
  ProductOptionsConfiguration,
  ProductOptionsPreview,
  SaveProductOptionsRequest,
} from "@/types/api";

type PreviewVariant = ProductOptionsPreview["variants"][number];

interface BulkStockPreviewRow {
  variantId: string;
  label: string;
  quantity: number;
  reservedQuantity: number;
  resultingQuantity: number;
  inventoryExists: boolean;
  error?: string;
}

const blankOption = (): ProductOptionDraft => ({
  name: "",
  values: [{ value: "" }],
});

const optionsFromConfiguration = (
  configuration: ProductOptionsConfiguration,
): ProductOptionDraft[] =>
  configuration.options
    .filter((option) => option.isActive)
    .map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values
        .filter((value) => value.isActive)
        .map((value) => ({ id: value.id, value: value.value })),
    }));

export function ProductVariantsSection({ product }: { product: Product }) {
  const configuration = useAsyncResource<ProductOptionsConfiguration>(
    (signal) => fetchAdminProductOptions(product.id, signal),
    [product.id],
  );
  const { showFeedback } = useFeedback();
  const [optionDraft, setOptionDraft] = useState<ProductOptionDraft[] | null>(
    null,
  );
  const [preview, setPreview] = useState<ProductOptionsPreview | null>(null);
  const [bulkPrice, setBulkPrice] = useState("");
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>([]);
  const [selectedValuesByOption, setSelectedValuesByOption] = useState<
    Record<string, string[]>
  >({});
  const [stockOperation, setStockOperation] =
    useState<BulkInventoryOperation>("SET");
  const [stockAmount, setStockAmount] = useState("");
  const [stockPreview, setStockPreview] = useState<
    BulkStockPreviewRow[] | null
  >(null);
  const options =
    optionDraft ??
    (configuration.data === undefined
      ? []
      : optionsFromConfiguration(configuration.data));

  const previewMutation = useMutation(
    (draftOptions: ProductOptionDraft[]) =>
      previewAdminProductOptions(product.id, draftOptions),
    {
      onSuccess: (result) => {
        setOptionDraft(result.options);
        setPreview(result);
        setSelectedVariantIds([]);
        setSelectedValuesByOption({});
        setStockPreview(null);
      },
    },
  );
  const saveMutation = useMutation(
    (body: SaveProductOptionsRequest) =>
      saveAdminProductOptions(product.id, body),
    {
      onSuccess: () => {
        setOptionDraft(null);
        setPreview(null);
        configuration.refetch();
        showFeedback({
          type: "success",
          title: "Variant matrix saved",
          message:
            "Variant combinations and option definitions were saved. Inventory was not changed.",
        });
      },
    },
  );
  const bulkStockMutation = useMutation(
    (body: BulkInventoryRequest) => bulkUpdateAdminInventory(product.id, body),
    {
      onSuccess: (updated) => {
        setSelectedVariantIds([]);
        setSelectedValuesByOption({});
        setStockPreview(null);
        void configuration.refetch();
        showFeedback({
          type: "success",
          title: "Bulk stock updated",
          message: `Stock was updated for ${updated.length} variants. Reserved quantities were unchanged.`,
        });
      },
      onError: (error) => {
        if (isApiError(error) && error.kind === "conflict") {
          setStockPreview(null);
          void configuration.refetch();
        }
      },
    },
  );

  const updateOptions = (
    update: (current: ProductOptionDraft[]) => ProductOptionDraft[],
  ) => {
    const configurationData = configuration.data;
    if (configurationData === undefined) return;
    setOptionDraft((current) =>
      update(current ?? optionsFromConfiguration(configurationData)),
    );
    setPreview(null);
    setSelectedVariantIds([]);
    setSelectedValuesByOption({});
    setStockPreview(null);
    bulkStockMutation.reset();
    previewMutation.reset();
    saveMutation.reset();
  };

  const updateVariant = (
    index: number,
    update: (variant: PreviewVariant) => PreviewVariant,
  ) => {
    setPreview((current) =>
      current === null
        ? null
        : {
            ...current,
            variants: current.variants.map((variant, rowIndex) =>
              rowIndex === index ? update(variant) : variant,
            ),
          },
    );
  };

  const toggleVariantSelection = (variantId: string, selected: boolean) => {
    setSelectedVariantIds((current) =>
      selected
        ? current.includes(variantId)
          ? current
          : [...current, variantId]
        : current.filter((id) => id !== variantId),
    );
    setStockPreview(null);
  };

  const matchingVariantIds = (
    selectedValues: Record<string, string[]>,
  ): string[] => {
    if (preview === null) return [];

    return preview.variants.flatMap((variant) => {
      if (variant.id === undefined) return [];
      const matches = preview.options.every((option) => {
        const selected = selectedValues[option.id] ?? [];
        return (
          selected.length === 0 ||
          selected.some((valueId) => variant.optionValueIds.includes(valueId))
        );
      });
      return matches ? [variant.id] : [];
    });
  };

  const toggleOptionValue = (
    optionId: string,
    valueId: string,
    selected: boolean,
  ) => {
    const updated = {
      ...selectedValuesByOption,
      [optionId]: selected
        ? [...(selectedValuesByOption[optionId] ?? []), valueId]
        : (selectedValuesByOption[optionId] ?? []).filter(
            (id) => id !== valueId,
          ),
    };
    setSelectedValuesByOption(updated);
    setSelectedVariantIds(matchingVariantIds(updated));
    setStockPreview(null);
  };

  const selectAllVariants = () => {
    setSelectedValuesByOption({});
    setSelectedVariantIds(
      preview?.variants.flatMap((variant) =>
        variant.id === undefined ? [] : [variant.id],
      ) ?? [],
    );
    setStockPreview(null);
  };

  const clearVariantSelection = () => {
    setSelectedValuesByOption({});
    setSelectedVariantIds([]);
    setStockPreview(null);
  };

  const makeStockPreview = () => {
    if (preview === null || configuration.data === undefined) return;
    const amount = Number(stockAmount);
    const amountIsValid =
      /^\d+$/.test(stockAmount) &&
      Number.isSafeInteger(amount) &&
      (stockOperation === "SET" ? amount >= 0 : amount > 0);
    if (!amountIsValid) return;

    const inventoryByVariant = new Map(
      configuration.data.variants.flatMap((variant) =>
        variant.inventory === null
          ? []
          : [[variant.id, variant.inventory] as const],
      ),
    );
    const variantsById = new Map(
      preview.variants.flatMap((variant) =>
        variant.id === undefined ? [] : [[variant.id, variant] as const],
      ),
    );

    setStockPreview(
      selectedVariantIds.map((variantId) => {
        const variant = variantsById.get(variantId);
        const inventory = inventoryByVariant.get(variantId);
        const label = variant?.label ?? variantId;
        const quantity = inventory?.quantity ?? 0;
        const reservedQuantity = inventory?.reservedQuantity ?? 0;

        const resultingQuantity =
          stockOperation === "SET"
            ? amount
            : stockOperation === "INCREASE"
              ? quantity + amount
              : quantity - amount;
        const error =
          resultingQuantity < 0
            ? "This change would make stock negative."
            : resultingQuantity < reservedQuantity
              ? `Cannot go below ${reservedQuantity} reserved.`
              : resultingQuantity > 2_147_483_647
                ? "This change exceeds the supported stock quantity."
                : undefined;

        return {
          variantId,
          label,
          quantity,
          reservedQuantity,
          resultingQuantity,
          inventoryExists: inventory !== undefined,
          ...(error === undefined ? {} : { error }),
        };
      }),
    );
  };

  const canConfirmStock =
    stockPreview !== null &&
    stockPreview.length > 0 &&
    stockPreview.every((row) => row.error === undefined) &&
    !bulkStockMutation.isPending;
  const parsedStockAmount = Number(stockAmount);
  const canPreviewStock =
    selectedVariantIds.length > 0 &&
    /^\d+$/.test(stockAmount) &&
    Number.isSafeInteger(parsedStockAmount) &&
    (stockOperation === "SET" ? parsedStockAmount >= 0 : parsedStockAmount > 0);

  const confirmStockUpdate = () => {
    if (!canConfirmStock || stockPreview === null) return;
    void bulkStockMutation.run({
      variantIds: stockPreview.map((row) => row.variantId),
      operation: stockOperation,
      quantity: Number(stockAmount),
      expectedInventory: stockPreview.map((row) => ({
        variantId: row.variantId,
        inventoryExists: row.inventoryExists,
        quantity: row.quantity,
        reservedQuantity: row.reservedQuantity,
      })),
    });
  };

  const save = () => {
    if (preview === null) return;

    const body: SaveProductOptionsRequest = {
      expectedRevision: preview.expectedRevision,
      options: preview.options.map((option) => ({
        id: option.id,
        name: option.name,
        values: option.values.map(({ id, value }) => ({ id, value })),
      })),
      variants: preview.variants.map((variant) => ({
        ...(variant.id === undefined ? {} : { id: variant.id }),
        optionValueIds: variant.optionValueIds,
        sku: variant.sku,
        price: variant.price,
        isActive: variant.isActive,
      })),
    };
    void saveMutation.run(body);
  };

  const canSave =
    preview !== null &&
    preview.variants.length > 0 &&
    preview.variants.every(
      (variant) =>
        variant.sku.trim().length > 0 &&
        /^\d{1,10}(?:\.\d{1,2})?$/.test(variant.price) &&
        Number(variant.price) > 0,
    );

  return (
    <Panel>
      <PanelHeader
        title="Options & variants"
        hint="Define product options, generate combinations, then review each sellable SKU."
      />

      {configuration.isLoading && (
        <div className="space-y-3 p-5" role="status" aria-busy="true">
          <span className="sr-only">Loading product options</span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!configuration.isLoading && configuration.error !== undefined && (
        <div className="p-5">
          <ErrorState
            message={toUserMessage(configuration.error)}
            onRetry={configuration.refetch}
          />
        </div>
      )}

      {!configuration.isLoading && configuration.data !== undefined && (
        <div className="space-y-6 p-5 sm:p-6">
          <section aria-labelledby={`option-definitions-${product.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3
                  id={`option-definitions-${product.id}`}
                  className="text-[13px] font-semibold text-ink"
                >
                  Product options
                </h3>
                <p className="mt-1 text-[12px] leading-relaxed text-graphite">
                  Add axes such as Color, Size or Material. Removed values
                  retire their variants; stock and order history are retained.
                </p>
              </div>
              <Action
                variant="outline"
                size="sm"
                onClick={() =>
                  updateOptions((current) => [...current, blankOption()])
                }
              >
                <Plus size={14} aria-hidden />
                Add option
              </Action>
            </div>

            {options.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  align="left"
                  eyebrow="No options"
                  title="Create a default variant or add options"
                  description="A product with no axes generates one default variant. Add options for products sold in sizes, colors or other choices."
                />
              </div>
            )}

            <div className="mt-4 space-y-3">
              {options.map((option, optionIndex) => (
                <fieldset
                  key={option.id ?? `new-option-${optionIndex}`}
                  className="grid gap-4 border border-line bg-bone/40 p-4 sm:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)]"
                >
                  <legend className="sr-only">Option {optionIndex + 1}</legend>
                  <div className="flex items-start gap-2">
                    <label className="min-w-0 flex-1 text-[11px] font-medium text-graphite">
                      Option name
                      <input
                        value={option.name}
                        onChange={(event) =>
                          updateOptions((current) =>
                            current.map((item, index) =>
                              index === optionIndex
                                ? { ...item, name: event.target.value }
                                : item,
                            ),
                          )
                        }
                        maxLength={50}
                        placeholder="e.g. Color"
                        className="mt-1 min-h-11 w-full border border-line bg-paper px-3 text-[13px] text-ink outline-none focus:border-ink"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateOptions((current) =>
                          current.filter((_, index) => index !== optionIndex),
                        )
                      }
                      className="mt-5 inline-flex size-10 shrink-0 items-center justify-center text-graphite hover:bg-signal-soft hover:text-signal"
                      aria-label={`Remove ${option.name || `option ${optionIndex + 1}`}`}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>

                  <div>
                    <div className="space-y-2">
                      {option.values.map((value, valueIndex) => (
                        <div
                          key={value.id ?? `${optionIndex}-value-${valueIndex}`}
                          className="flex gap-2"
                        >
                          <label className="sr-only">
                            {option.name || `Option ${optionIndex + 1}`} value{" "}
                            {valueIndex + 1}
                          </label>
                          <input
                            value={value.value}
                            onChange={(event) =>
                              updateOptions((current) =>
                                current.map((item, index) =>
                                  index !== optionIndex
                                    ? item
                                    : {
                                        ...item,
                                        values: item.values.map(
                                          (entry, entryIndex) =>
                                            entryIndex === valueIndex
                                              ? {
                                                  ...entry,
                                                  value: event.target.value,
                                                }
                                              : entry,
                                        ),
                                      },
                                ),
                              )
                            }
                            maxLength={100}
                            placeholder={`Value ${valueIndex + 1}`}
                            className="min-h-11 min-w-0 flex-1 border border-line bg-paper px-3 text-[13px] text-ink outline-none focus:border-ink"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateOptions((current) =>
                                current.map((item, index) =>
                                  index === optionIndex
                                    ? {
                                        ...item,
                                        values: item.values.filter(
                                          (_, entryIndex) =>
                                            entryIndex !== valueIndex,
                                        ),
                                      }
                                    : item,
                                ),
                              )
                            }
                            disabled={option.values.length <= 1}
                            className="inline-flex size-11 shrink-0 items-center justify-center text-graphite hover:bg-signal-soft hover:text-signal disabled:opacity-40"
                            aria-label={`Remove ${option.name || `option ${optionIndex + 1}`} value ${value.value || valueIndex + 1}`}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateOptions((current) =>
                          current.map((item, index) =>
                            index === optionIndex
                              ? {
                                  ...item,
                                  values: [...item.values, { value: "" }],
                                }
                              : item,
                          ),
                        )
                      }
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-[12px] font-medium text-ink underline underline-offset-4"
                    >
                      <Plus size={13} aria-hidden />
                      Add value
                    </button>
                  </div>
                </fieldset>
              ))}
            </div>

            {previewMutation.error !== undefined && (
              <div className="mt-4">
                <InlineNotice
                  message={toUserMessage(previewMutation.error)}
                  onDismiss={previewMutation.reset}
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-graphite">
                Maximum generated matrix: 500 variants. Inventory is managed
                after saving.
              </p>
              <Action
                size="sm"
                onClick={() => void previewMutation.run(options)}
                disabled={
                  previewMutation.isPending ||
                  options.some(
                    (option) =>
                      !option.name.trim() ||
                      option.values.length === 0 ||
                      option.values.some((value) => !value.value.trim()),
                  )
                }
              >
                {previewMutation.isPending
                  ? "Generating"
                  : "Generate combinations"}
              </Action>
            </div>
          </section>

          {preview !== null && (
            <section
              aria-labelledby={`variant-review-${product.id}`}
              className="border-t border-line pt-6"
            >
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3
                    id={`variant-review-${product.id}`}
                    className="text-[13px] font-semibold text-ink"
                  >
                    Review variants
                  </h3>
                  <p className="mt-1 text-[12px] text-graphite">
                    {preview.variants.length} combination
                    {preview.variants.length === 1 ? "" : "s"} selected. Remove
                    any combination you do not sell.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="text-[11px] font-medium text-graphite">
                    Set all prices
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={bulkPrice}
                      onChange={(event) => setBulkPrice(event.target.value)}
                      className="mt-1 min-h-11 w-36 border border-line bg-paper px-3 font-mono text-[13px] text-ink"
                    />
                  </label>
                  <Action
                    variant="outline"
                    size="sm"
                    disabled={
                      !/^\d{1,10}(?:\.\d{1,2})?$/.test(bulkPrice) ||
                      Number(bulkPrice) <= 0
                    }
                    onClick={() => {
                      const amount = Number(bulkPrice).toFixed(2);
                      setPreview((current) =>
                        current === null
                          ? null
                          : {
                              ...current,
                              variants: current.variants.map((variant) => ({
                                ...variant,
                                price: amount,
                              })),
                            },
                      );
                    }}
                  >
                    Apply
                  </Action>
                  <Action
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPreview((current) =>
                        current === null
                          ? null
                          : {
                              ...current,
                              variants: current.variants.map((variant) => ({
                                ...variant,
                                isActive: true,
                              })),
                            },
                      )
                    }
                  >
                    Activate all
                  </Action>
                  <Action
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPreview((current) =>
                        current === null
                          ? null
                          : {
                              ...current,
                              variants: current.variants.map((variant) => ({
                                ...variant,
                                isActive: false,
                              })),
                            },
                      )
                    }
                  >
                    Deactivate all
                  </Action>
                </div>
              </div>

              {saveMutation.error !== undefined && (
                <div className="mt-4">
                  <InlineNotice
                    message={toUserMessage(saveMutation.error)}
                    onDismiss={saveMutation.reset}
                  />
                </div>
              )}

              <section
                aria-labelledby={`bulk-stock-heading-${product.id}`}
                className="mt-5 space-y-4 border border-line bg-bone/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4
                      id={`bulk-stock-heading-${product.id}`}
                      className="text-[13px] font-semibold text-ink"
                    >
                      Bulk stock management
                    </h4>
                    <p
                      className="mt-1 text-[12px] text-graphite"
                      aria-live="polite"
                    >
                      {selectedVariantIds.length} variant
                      {selectedVariantIds.length === 1 ? "" : "s"} selected.
                      Choose option values or individual rows.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Action
                      variant="outline"
                      size="sm"
                      onClick={selectAllVariants}
                      disabled={
                        !preview.variants.some(
                          (variant) => variant.id !== undefined,
                        )
                      }
                    >
                      Select all
                    </Action>
                    <Action
                      variant="outline"
                      size="sm"
                      onClick={clearVariantSelection}
                      disabled={selectedVariantIds.length === 0}
                    >
                      Clear selection
                    </Action>
                  </div>
                </div>

                {preview.options.length > 0 && (
                  <div className="flex flex-wrap gap-4">
                    {preview.options.map((option) => (
                      <fieldset
                        key={option.id}
                        className="min-w-40 border border-line bg-paper px-3 py-2"
                      >
                        <legend className="px-1 text-[11px] font-medium text-graphite">
                          {option.name}
                        </legend>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
                          {option.values.map((value) => (
                            <label
                              key={value.id}
                              className="inline-flex items-center gap-1.5 text-[12px] text-ink"
                            >
                              <input
                                type="checkbox"
                                aria-label={`Select ${option.name} ${value.value}`}
                                checked={(
                                  selectedValuesByOption[option.id] ?? []
                                ).includes(value.id)}
                                onChange={(event) =>
                                  toggleOptionValue(
                                    option.id,
                                    value.id,
                                    event.target.checked,
                                  )
                                }
                              />
                              {value.value}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-[11px] font-medium text-graphite">
                    Stock action
                    <select
                      aria-label="Bulk stock action"
                      value={stockOperation}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
                          value === "SET" ||
                          value === "INCREASE" ||
                          value === "DECREASE"
                        ) {
                          setStockOperation(value);
                        }
                        setStockPreview(null);
                      }}
                      className="mt-1 block min-h-11 w-44 border border-line bg-paper px-3 text-[13px] text-ink"
                    >
                      <option value="SET">Set stock</option>
                      <option value="INCREASE">Increase stock</option>
                      <option value="DECREASE">Decrease stock</option>
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-graphite">
                    {stockOperation === "SET" ? "New total quantity" : "Units"}
                    <input
                      aria-label={
                        stockOperation === "SET"
                          ? "New total quantity"
                          : "Stock movement units"
                      }
                      type="number"
                      min={stockOperation === "SET" ? "0" : "1"}
                      step="1"
                      value={stockAmount}
                      onChange={(event) => {
                        setStockAmount(event.target.value);
                        setStockPreview(null);
                      }}
                      className="mt-1 block min-h-11 w-36 border border-line bg-paper px-3 font-mono text-[13px] text-ink"
                    />
                  </label>
                  <Action
                    variant="outline"
                    size="sm"
                    onClick={makeStockPreview}
                    disabled={!canPreviewStock || bulkStockMutation.isPending}
                  >
                    Preview stock changes
                  </Action>
                </div>

                <p className="text-[11px] leading-relaxed text-graphite">
                  Missing inventory records start at zero and are created when
                  the bulk change is applied. Reserved quantities are never
                  changed.
                </p>

                {bulkStockMutation.error !== undefined && (
                  <InlineNotice
                    message={toUserMessage(bulkStockMutation.error)}
                    onDismiss={bulkStockMutation.reset}
                  />
                )}

                {stockPreview !== null && (
                  <div
                    className="space-y-3 border-t border-line pt-4"
                    aria-label="Bulk stock preview"
                  >
                    <div className="overflow-x-auto border border-line bg-paper">
                      <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
                        <thead className="bg-paper-pure text-[11px] uppercase tracking-[0.06em] text-graphite">
                          <tr>
                            <th className="px-3 py-2 font-medium">Variant</th>
                            <th className="px-3 py-2 font-medium">Current</th>
                            <th className="px-3 py-2 font-medium">Result</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {stockPreview.map((row) => (
                            <tr key={row.variantId}>
                              <td className="px-3 py-2 text-ink">
                                {row.label}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-ink">
                                {row.inventoryExists
                                  ? `${row.quantity} (reserved ${row.reservedQuantity})`
                                  : "No record (starts at 0; reserved 0)"}
                              </td>
                              <td className="px-3 py-2 font-mono tabular-nums text-ink">
                                <span
                                  className={
                                    row.error === undefined
                                      ? ""
                                      : "font-sans text-signal"
                                  }
                                >
                                  {row.error ?? row.resultingQuantity}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] text-graphite">
                        Review each result, then confirm to apply the change.
                      </p>
                      <div className="flex gap-2">
                        <Action
                          variant="outline"
                          size="sm"
                          onClick={() => setStockPreview(null)}
                          disabled={bulkStockMutation.isPending}
                        >
                          Cancel
                        </Action>
                        <Action
                          size="sm"
                          onClick={confirmStockUpdate}
                          disabled={!canConfirmStock}
                        >
                          {bulkStockMutation.isPending
                            ? "Updating stock"
                            : "Confirm bulk stock update"}
                        </Action>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <div className="mt-4 overflow-x-auto border border-line">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-bone text-[11px] uppercase tracking-[0.08em] text-graphite">
                    <tr>
                      <th className="px-3 py-3 font-medium">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="px-3 py-3 font-medium">Options</th>
                      <th className="px-3 py-3 font-medium">SKU</th>
                      <th className="px-3 py-3 font-medium">Price</th>
                      <th className="px-3 py-3 font-medium">Available</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Inventory</th>
                      <th className="px-3 py-3 font-medium">
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-paper">
                    {preview.variants.map((variant, index) => (
                      <tr
                        key={
                          variant.id ??
                          (variant.optionValueIds.join("-") || "default")
                        }
                      >
                        <td className="px-3 py-3">
                          {variant.id === undefined ? (
                            <span className="text-[11px] text-graphite">—</span>
                          ) : (
                            <input
                              type="checkbox"
                              aria-label={`Select ${variant.label}`}
                              checked={selectedVariantIds.includes(variant.id)}
                              onChange={(event) => {
                                const variantId = variant.id;
                                if (variantId !== undefined) {
                                  toggleVariantSelection(
                                    variantId,
                                    event.target.checked,
                                  );
                                }
                              }}
                            />
                          )}
                        </td>
                        <td className="px-3 py-3 text-[12px] text-ink">
                          {variant.label}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            aria-label={`SKU for ${variant.label}`}
                            value={variant.sku}
                            onChange={(event) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                sku: event.target.value.toUpperCase(),
                              }))
                            }
                            maxLength={100}
                            className="min-h-10 w-44 border border-line bg-paper px-2 font-mono text-[12px] text-ink"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <input
                            aria-label={`Price for ${variant.label}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={variant.price}
                            onChange={(event) =>
                              updateVariant(index, (current) => ({
                                ...current,
                                price: event.target.value,
                              }))
                            }
                            className="min-h-10 w-28 border border-line bg-paper px-2 font-mono text-[12px] text-ink"
                          />
                        </td>
                        <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-ink">
                          {variant.id === undefined
                            ? "Not stocked"
                            : variant.available === null
                              ? "Not stocked"
                              : variant.available}
                        </td>
                        <td className="px-3 py-3">
                          <label className="inline-flex items-center gap-2 text-[12px] text-ink">
                            <input
                              type="checkbox"
                              checked={variant.isActive}
                              onChange={(event) =>
                                updateVariant(index, (current) => ({
                                  ...current,
                                  isActive: event.target.checked,
                                }))
                              }
                            />
                            {variant.isActive ? "Active" : "Inactive"}
                          </label>
                        </td>
                        <td className="px-3 py-3">
                          {variant.id === undefined ? (
                            <span className="text-[11px] text-graphite">
                              After saving
                            </span>
                          ) : (
                            <details>
                              <summary className="cursor-pointer text-[11px] font-medium text-ink underline underline-offset-4">
                                Manage stock
                              </summary>
                              <div className="min-w-[320px] pt-3">
                                <VariantDetails
                                  productId={product.id}
                                  variantId={variant.id}
                                  onInventoryChanged={() => {
                                    setStockPreview(null);
                                    void configuration.refetch();
                                  }}
                                />
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (variant.id !== undefined) {
                                toggleVariantSelection(variant.id, false);
                              }
                              setPreview((current) =>
                                current === null
                                  ? null
                                  : {
                                      ...current,
                                      variants: current.variants.filter(
                                        (_, rowIndex) => rowIndex !== index,
                                      ),
                                    },
                              );
                            }}
                            aria-label={`Remove combination ${variant.label}`}
                            className="inline-flex size-9 items-center justify-center text-graphite hover:bg-signal-soft hover:text-signal"
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-[12px] leading-relaxed text-graphite">
                  Existing combinations keep their variant IDs and stock.
                  Removed combinations are deactivated, not deleted. New
                  variants receive no inventory row until stock is entered.
                </p>
                <Action
                  onClick={save}
                  disabled={!canSave || saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Saving" : "Save variant matrix"}
                </Action>
              </div>
            </section>
          )}
        </div>
      )}
    </Panel>
  );
}
