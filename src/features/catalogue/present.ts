import type {
  CatalogueVariant,
  Category,
  Product as ApiProduct,
  ProductImage,
  ProductStatus,
  UUID,
} from '@/types/api'
import type {
  CatalogueAxis,
  CatalogueAxisValue,
  CatalogueDetail,
  CataloguePiece,
  OptionSelection,
} from '@/types'

/**
 * The one place catalogue records become something the storefront can draw.
 *
 * Two jobs, both about not lying to the shopper:
 *
 * - **Presentation.** A product record carries no images and no variants, so the
 *   shape the components take is assembled here from four endpoints rather than
 *   being re-derived in each component.
 * - **Selection.** A variant is a set of option values, not a row with a size
 *   column. Turning "Black / M" into a variant id — and knowing which options
 *   still lead somewhere buyable once one of them changes — is matrix logic, and
 *   it belongs in one tested place rather than inside a render.
 *
 * Nothing here computes money: every figure is a server string, passed through.
 */

/** The only lifecycle state a shopper may buy from. */
export const SELLABLE_STATUS: ProductStatus = 'ACTIVE'

export const isSellable = (product: ApiProduct): boolean =>
  product.status === SELLABLE_STATUS && product.isActive

/**
 * `null` stock means the catalogue has never said how many exist, which is not
 * the same as none being left — so only a real zero reads as sold out.
 */
export const isBuyable = (variant: CatalogueVariant): boolean => variant.available !== 0

/** Primary image first, then declared order. */
export const imageUrls = (images: readonly ProductImage[]): string[] =>
  [...images]
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)
    .map((image) => image.imageUrl)

const HEX_TOKEN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * A swatch is drawn only when the catalogue value is itself a colour.
 *
 * `Color: Onyx` carries no hex, and reading one off the word would put a shade on
 * screen that the studio never chose. Those values fall back to text chips.
 */
export const hexFor = (value: string): string | undefined => {
  const candidate = value.trim()
  return HEX_TOKEN.test(candidate) ? candidate : undefined
}

const COLOUR_AXIS = /colou?r/i
const SIZE_AXIS = /size|fit/i

/** Colour and size first, because that is the order a shopper reads them in. */
const axisRank = (name: string): number =>
  COLOUR_AXIS.test(name) ? 0 : SIZE_AXIS.test(name) ? 1 : 2

const sameAxis = (optionName: string, axis: string): boolean =>
  optionName.toLowerCase() === axis.toLowerCase()

/** The value a variant carries on an axis, if it declares one at all. */
export const valueOn = (variant: CatalogueVariant, axis: string): string | undefined =>
  variant.options.find((option) => sameAxis(option.optionName, axis))?.optionValue

/**
 * Every axis across a variant set, ordered colour → size → the rest.
 *
 * Only axes that at least one variant declares exist — a product sold in a single
 * size has no size picker, which is the honest rendering of a single-size cap.
 */
export const axesOf = (variants: readonly CatalogueVariant[]): CatalogueAxis[] => {
  const names: string[] = []
  for (const variant of variants) {
    for (const option of variant.options) {
      if (!names.some((name) => sameAxis(name, option.optionName))) names.push(option.optionName)
    }
  }

  return [...names]
    .sort((a, b) => axisRank(a) - axisRank(b))
    .map((name) => {
      const values: CatalogueAxisValue[] = []
      for (const variant of variants) {
        const value = valueOn(variant, name)
        if (value === undefined || values.some((entry) => entry.value === value)) continue
        values.push({ value, hex: hexFor(value), isAvailable: true })
      }
      return { name, values }
    })
}

/**
 * The variant a selection names.
 *
 * A variant qualifies only when it declares a value for every chosen axis *and*
 * agrees with every axis it declares, so a size that exists solely in another
 * colour can never be reached by changing one control at a time.
 */
export const variantFor = (
  variants: readonly CatalogueVariant[],
  selection: OptionSelection,
): CatalogueVariant | undefined =>
  variants.find((variant) => {
    const chosen = Object.entries(selection)
    if (
      chosen.some(
        ([axis, value]) => value !== '' && valueOn(variant, axis) !== value,
      )
    ) {
      return false
    }
    return variant.options.every((option) => selection[option.optionName] === option.optionValue)
  })

/**
 * Axis values still reachable from the current selection.
 *
 * Each axis is filtered by the *other* axes only, so choosing a colour never hides
 * the sizes that colour comes in — while a size that exists solely in a colour
 * already ruled out does disappear. `candidates` is the set that has to satisfy
 * the match, which the caller narrows to buyable variants: an option that leads
 * only to sold-out stock is shown, but disabled.
 */
export const reachableAxes = (
  candidates: readonly CatalogueVariant[],
  axes: readonly CatalogueAxis[],
  selection: OptionSelection,
): CatalogueAxis[] =>
  axes.map((axis) => ({
    ...axis,
    values: axis.values.map((entry) => ({
      ...entry,
      isAvailable: candidates.some(
        (variant) =>
          othersMatch(variant, axes, selection, axis.name) &&
          valueOn(variant, axis.name) === entry.value,
      ),
    })),
  }))

const othersMatch = (
  variant: CatalogueVariant,
  axes: readonly CatalogueAxis[],
  selection: OptionSelection,
  except: string,
): boolean =>
  axes.every((axis) => {
    if (axis.name === except) return true
    const chosen = selection[axis.name]
    return chosen === undefined || chosen === '' || valueOn(variant, axis.name) === chosen
  })

/**
 * The opening selection: the first reachable value on each axis.
 *
 * Narrowed axis by axis so the combination it produces is one the catalogue
 * actually sells. Without the narrowing, a product whose first size exists only
 * in a later colour would open on a pair that cannot be bought.
 */
export const initialSelection = (
  variants: readonly CatalogueVariant[],
  axes: readonly CatalogueAxis[],
): OptionSelection => {
  let candidates = variants
  const selection: OptionSelection = {}

  for (const axis of axes) {
    for (const entry of axis.values) {
      const narrowed = candidates.filter((variant) => valueOn(variant, axis.name) === entry.value)
      if (narrowed.length === 0) continue
      selection[axis.name] = entry.value
      candidates = narrowed
      break
    }
  }

  return selection
}

/** Everything one product needs, before it becomes a drawable piece. */
export interface CatalogueSource {
  product: ApiProduct
  category: Category | undefined
  images: readonly ProductImage[]
  /** Omitted when a screen has not read them — see `toPiece`. */
  variants?: readonly CatalogueVariant[]
}

/** Cheapest first, so the headline figure and the quick add agree with each other. */
const byPrice = (a: CatalogueVariant, b: CatalogueVariant): number =>
  Number(a.price) - Number(b.price) || a.sku.localeCompare(b.sku)

export const toPiece = ({
  product,
  category,
  images,
  variants,
}: CatalogueSource): CataloguePiece => {
  const buyable = (variants ?? []).filter(isBuyable).sort(byPrice)

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: category?.name ?? '',
    categorySlug: category?.slug ?? '',
    categoryId: product.categoryId,
    // With no variants in hand the base price is the only figure the API gave us,
    // and it is the catalogue's own — not a guess. With them, the cheapest
    // buyable variant is what the shopper would actually be charged.
    price: buyable[0]?.price ?? product.basePrice,
    images: imageUrls(images),
    // Variants unread means unknown, not sold out: only a variant set that was
    // read and held nothing buyable can retire the piece.
    isAvailable: isSellable(product) && (variants === undefined || buyable.length > 0),
  }
}

/** The product page's view of a product, axes and stock included. */
export const toDetail = (
  source: CatalogueSource & { variants: readonly CatalogueVariant[] },
): CatalogueDetail => {
  const variants = [...source.variants].sort(byPrice)
  const axes = axesOf(variants)

  return {
    ...toPiece(source),
    description: source.product.description,
    status: source.product.status,
    variants,
    // Reachability is seeded here so the controls are never briefly wrong while
    // the shopper's first selection is still being applied.
    axes: reachableAxes(variants.filter(isBuyable), axes, {}),
  }
}

/** The collection, mapped in one pass. */
export const toPieces = (
  products: readonly ApiProduct[],
  categories: readonly Category[],
  images: ReadonlyMap<UUID, ProductImage[]>,
): CataloguePiece[] =>
  products
    .filter(isSellable)
    .map((product) =>
      toPiece({
        product,
        category: categories.find((category) => category.id === product.categoryId),
        images: images.get(product.id) ?? [],
      }),
    )
