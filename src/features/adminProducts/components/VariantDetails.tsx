import { useState } from "react";
import type { FormEvent } from "react";
import { Action } from "@/components/ui/Action";
import { TextField } from "@/components/account/Field";
import { ErrorState, InlineNotice } from "@/components/account/States";
import { Skeleton } from "@/components/account/Skeleton";
import {
  buildCreateInventoryRequest,
  buildUpdateInventoryRequest,
  inventoryToFormValues,
  validateInventory,
  type InventoryErrors,
  type InventoryFormValues,
} from "@/features/adminProducts/catalogueRules";
import {
  createAdminInventory,
  fetchAdminInventory,
  updateAdminInventory,
} from "@/features/adminProducts/subresourcesApi";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useMutation } from "@/hooks/useMutation";
import { useFeedback } from "@/context/feedbackContext";
import { toUserMessage } from "@/lib/api/errors";
import type { Inventory, UUID } from "@/types/api";

const InventoryEditor = ({
  inventory,
  isSaving,
  serverError,
  onSubmit,
}: {
  inventory: Inventory | null;
  isSaving: boolean;
  serverError: unknown;
  onSubmit: (values: InventoryFormValues) => Promise<Inventory | undefined>;
}) => {
  const [values, setValues] = useState<InventoryFormValues>(() =>
    inventory === null
      ? { quantity: "0", reservedQuantity: "0" }
      : inventoryToFormValues(inventory),
  );
  const [errors, setErrors] = useState<InventoryErrors>({});

  const dirty =
    inventory === null ||
    values.quantity !== String(inventory.quantity) ||
    values.reservedQuantity !== String(inventory.reservedQuantity);
  const quantity = Number(values.quantity);
  const reserved = Number(values.reservedQuantity);
  const available =
    Number.isInteger(quantity) && Number.isInteger(reserved)
      ? quantity - reserved
      : null;

  const set = (field: keyof InventoryFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      current[field] === undefined
        ? current
        : { ...current, [field]: undefined },
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateInventory(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      event.currentTarget
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    await onSubmit(values);
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {serverError !== undefined && (
        <InlineNotice message={toUserMessage(serverError)} />
      )}

      {inventory === null ? (
        <p className="text-[12.5px] leading-relaxed text-graphite">
          No stock row exists for this variant. Enter a real count to create
          one; stock is never inferred from the option matrix.
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-px border border-line bg-line">
          <div className="bg-paper-pure px-3 py-3">
            <dt className="text-[11px] text-graphite">Quantity</dt>
            <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
              {inventory.quantity}
            </dd>
          </div>
          <div className="bg-paper-pure px-3 py-3">
            <dt className="text-[11px] text-graphite">Reserved</dt>
            <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
              {inventory.reservedQuantity}
            </dd>
          </div>
          <div className="bg-paper-pure px-3 py-3">
            <dt className="text-[11px] text-graphite">Available</dt>
            <dd className="mt-1 font-mono text-[15px] tabular-nums text-ink">
              {inventory.available}
            </dd>
          </div>
        </dl>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name={`inventory-quantity-${inventory?.variantId ?? "new"}`}
          label="Total quantity"
          inputMode="numeric"
          value={values.quantity}
          onChange={(event) => set("quantity", event.target.value)}
          hint="Absolute count, not a delta."
          error={errors.quantity}
        />
        <TextField
          name={`inventory-reserved-${inventory?.variantId ?? "new"}`}
          label="Reserved quantity"
          inputMode="numeric"
          value={values.reservedQuantity}
          onChange={(event) => set("reservedQuantity", event.target.value)}
          hint="Cannot exceed total quantity."
          error={errors.reservedQuantity}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
        <p className="text-[12px] text-graphite">
          Resulting available:{" "}
          <span className="font-mono text-ink tabular-nums">
            {available === null ? "—" : available}
          </span>
        </p>
        <Action type="submit" size="sm" disabled={isSaving || !dirty}>
          {isSaving
            ? "Saving"
            : inventory === null
              ? "Create stock row"
              : "Save stock"}
        </Action>
      </div>
    </form>
  );
};

export function VariantDetails({
  productId,
  variantId,
  onInventoryChanged,
}: {
  productId: UUID;
  variantId: UUID;
  onInventoryChanged: () => void;
}) {
  const inventory = useAsyncResource<Inventory | null>(
    (signal) => fetchAdminInventory(productId, variantId, signal),
    [productId, variantId],
  );
  const { showFeedback } = useFeedback();
  const refreshInventory = () => inventory.refetch();

  const createMutation = useMutation(
    (values: InventoryFormValues) =>
      createAdminInventory(
        productId,
        variantId,
        buildCreateInventoryRequest(values),
      ),
    {
      onSuccess: () => {
        refreshInventory();
        onInventoryChanged();
        showFeedback({
          type: "success",
          title: "Inventory created",
          message: "A stock record was created for this variant.",
        });
      },
    },
  );
  const updateMutation = useMutation(
    (input: { inventory: Inventory; values: InventoryFormValues }) =>
      updateAdminInventory(
        productId,
        variantId,
        buildUpdateInventoryRequest(input.values, input.inventory),
      ),
    {
      onSuccess: () => {
        refreshInventory();
        onInventoryChanged();
        showFeedback({
          type: "success",
          title: "Inventory updated",
          message: "The stock quantities were saved.",
        });
      },
    },
  );

  const stock = inventory.data ?? null;
  return (
    <div className="border-t border-line bg-bone/40 px-4 py-4">
      <h4 className="text-[13px] font-semibold text-ink">Inventory</h4>
      <p className="mt-1 text-[12px] leading-relaxed text-graphite">
        Stock is managed separately from variant options.
      </p>

      {inventory.isLoading && (
        <div className="mt-4 space-y-2" role="status" aria-busy="true">
          <span className="sr-only">Loading stock</span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}

      {!inventory.isLoading && inventory.error !== undefined && (
        <div className="mt-4">
          <ErrorState
            message={toUserMessage(inventory.error)}
            onRetry={inventory.refetch}
          />
        </div>
      )}

      {!inventory.isLoading && inventory.error === undefined && (
        <div className="mt-4">
          <InventoryEditor
            key={stock?.updatedAt ?? "new-stock"}
            inventory={stock}
            isSaving={createMutation.isPending || updateMutation.isPending}
            serverError={
              stock === null ? createMutation.error : updateMutation.error
            }
            onSubmit={(values) => {
              if (stock === null) return createMutation.run(values);
              return updateMutation.run({ inventory: stock, values });
            }}
          />
        </div>
      )}
    </div>
  );
}
