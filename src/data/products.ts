import { IMG } from '@/lib/images'
import type { Product, ProductCategory } from '@/types'

export const categories: ProductCategory[] = [
  'Tops',
  'Bottoms',
  'Outerwear',
  'Accessories',
]

export const products: Product[] = [
  {
    id: 'ctrl-knit',
    name: 'CTRL Knit',
    category: 'Tops',
    price: 245,
    tagline: 'Ribbed merino crewneck',
    description:
      'A dense rib-knit crewneck cut from brushed merino. Warm without weight, structured without stiffness.',
    details:
      'Knitted in a 12-gauge rib using traceable merino, then washed for a soft, broken-in hand. The shoulder is set slightly wide to give the silhouette an easy, dropped line. Ribbed cuffs and hem hold their shape through the season.',
    images: [
      IMG.plate(12944791),
      IMG.plate(9594677),
      IMG.plate(28888096),
      IMG.plate(30675215),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Onyx', hex: '#111111' },
      { name: 'Bone', hex: '#E8E3D9' },
      { name: 'Slate', hex: '#4A4A4C' },
    ],
    release: '01',
    featured: true,
    cutout: '/garments/image.png',
    cutoutFilter: 'none',
  },
  {
    id: 'ctrl-oversized-hoodie',
    name: 'CTRL Oversized Hoodie',
    category: 'Tops',
    price: 210,
    tagline: 'Loopback cotton, dropped shoulder',
    description:
      'Heavyweight loopback cotton with a double-layer hood and a shoulder engineered to fall past the arm.',
    details:
      'Built from 480gsm loopback cotton, garment-dyed for depth of colour. The hood is double-layered and self-lined, the drawcord is tipped with a matte metal ferrule, and the body is cut with a dropped shoulder for a deliberate, generous volume.',
    images: [
      IMG.plate(9594669),
      IMG.plate(9594946),
      IMG.plate(30095407),
      IMG.plate(9594671),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Ash Grey', hex: '#9A9A97' },
      { name: 'Onyx', hex: '#111111' },
      { name: 'Bone', hex: '#E8E3D9' },
    ],
    release: '02',
    featured: true,
    cutout: '/garments/image.png',
    cutoutFilter: 'none',
  },
  {
    id: 'ctrl-wide-denim',
    name: 'CTRL Wide Denim',
    category: 'Bottoms',
    price: 198,
    tagline: 'Rigid selvedge, wide fall',
    description:
      'Rigid Japanese selvedge denim cut wide from the hip with a full-length break.',
    details:
      'Woven on shuttle looms from long-staple cotton, then left rigid so the fabric breaks in around the wearer. A hidden hook closure, chain-stitched hem and twin-needle finishing keep the construction honest. Cut wide through the leg for a floor-skimming fall.',
    images: [
      IMG.plate(1235692),
      IMG.plate(1082528),
      IMG.plate(16390576),
      IMG.plate(1082526),
    ],
    sizes: ['26', '28', '30', '32', '34', '36'],
    colors: [
      { name: 'Ice Wash', hex: '#B9C7D6' },
      { name: 'Raw Indigo', hex: '#31435C' },
    ],
    release: '03',
    featured: true,
    cutout: '/garments/denim.png',
    cutoutFilter: 'none',
  },
  {
    id: 'ctrl-double-breasted-blazer',
    name: 'CTRL Double Breasted Blazer',
    category: 'Outerwear',
    price: 640,
    tagline: 'Unstructured wool, dropped shoulder',
    description:
      'An unlined, unstructured blazer cut long and low with a double-breasted closure.',
    details:
      'Tailored from a dry wool-crepe and left partially unlined so the jacket moves and creases like a cardigan. The double-breasted closure sits low on the body, the lapel is hand-pressed, and the back is cut with a single deep vent.',
    images: [
      IMG.plate(35564328),
      IMG.plate(31280402),
      IMG.plate(20428090),
      IMG.plate(6764954),
    ],
    sizes: ['46', '48', '50', '52', '54'],
    colors: [
      { name: 'Pitch Black', hex: '#0A0A0A' },
      { name: 'Graphite', hex: '#3C3C3E' },
    ],
    release: '04',
    featured: true,
    cutout: '/garments/blazer.png',
    cutoutFilter: 'none',
  },
  {
    id: 'ctrl-heavy-tee',
    name: 'CTRL Heavy Tee',
    category: 'Tops',
    price: 88,
    tagline: '260gsm compact jersey',
    description:
      'A dense, dry-hand jersey tee with a boxy body and a ribbed collar that holds.',
    details:
      'Knitted on a slow-running vintage machine at 260gsm for a compact, opaque hand. The body is boxy with a slightly dropped shoulder, the neckline is bound in 2x2 rib, and the hem is double-stitched to resist curling after washing.',
    images: [
      IMG.plate(8532638),
      IMG.plate(14920934),
      IMG.plate(18758192),
      IMG.plate(7319172),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Onyx', hex: '#111111' },
      { name: 'Bone', hex: '#E8E3D9' },
      { name: 'Ash Grey', hex: '#9A9A97' },
    ],
    release: '05',
  },
  {
    id: 'ctrl-cargo-pants',
    name: 'CTRL Cargo Pants',
    category: 'Bottoms',
    price: 265,
    tagline: 'Washed cotton ripstop, articulated knee',
    description:
      'Utility trousers in washed ripstop with a pleated front and articulated knee.',
    details:
      'Cut from a cotton ripstop that has been garment-washed to a soft, matte finish. Two deep bellowed thigh pockets sit flush to the seam, the knee is articulated for movement, and the hem is finished with a hidden drawcord.',
    images: [
      IMG.plate(11716436),
      IMG.plate(10341113),
      IMG.plate(35043249),
      IMG.plate(27097137),
    ],
    sizes: ['28', '30', '32', '34', '36'],
    colors: [
      { name: 'Onyx', hex: '#111111' },
      { name: 'Clay', hex: '#9A7B62' },
      { name: 'Ash Grey', hex: '#9A9A97' },
    ],
    release: '06',
  },
  {
    id: 'ctrl-minimal-shirt',
    name: 'CTRL Minimal Shirt',
    category: 'Tops',
    price: 175,
    tagline: 'Washed poplin, soft collar',
    description:
      'A clean poplin shirt with a softened collar and a deliberately generous sleeve.',
    details:
      'Woven from long-staple cotton poplin and garment-washed for softness. The collar is unfused so it sits and breaks naturally, the placket is single-stitched for a cleaner front, and the sleeve is cut long with a single-button cuff.',
    images: [
      IMG.plate(22441295),
      IMG.plate(28576622),
      IMG.plate(22441292),
      IMG.plate(7671168),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Optic White', hex: '#F7F6F3' },
      { name: 'Pale Grey', hex: '#C9C9C5' },
    ],
    release: '07',
  },
  {
    id: 'ctrl-essential-cap',
    name: 'CTRL Essential Cap',
    category: 'Accessories',
    price: 62,
    tagline: 'Unstructured six-panel',
    description:
      'An unstructured six-panel cap in washed cotton twill with a matte metal adjuster.',
    details:
      'Built from washed cotton twill with a soft, unstructured front and a pre-curved brim. Brass eyelets are set into each panel and the rear closure is a matte metal slider, so the fit can be dialled in precisely.',
    images: [
      IMG.plate(26956138),
      IMG.plate(12005662),
      IMG.plate(13876038),
      IMG.plate(171940),
    ],
    sizes: ['One Size'],
    colors: [
      { name: 'Onyx', hex: '#111111' },
      { name: 'Bone', hex: '#E8E3D9' },
    ],
    release: '08',
  },
  {
    id: 'ctrl-essentials-white-tee',
    name: 'CTRL Essentials Tee',
    category: 'Tops',
    price: 82,
    tagline: 'Optic white, everyday weight',
    description:
      'The same dry-hand jersey as the Heavy Tee, cut in optic white with a clean edge.',
    details:
      'Knitted at 240gsm for an everyday weight that still holds its shape. Fully taped at the neck and shoulder, with a slightly shortened body so it sits clean at the waist.',
    images: [
      IMG.plate(11671964),
      IMG.plate(14867670),
      IMG.plate(2112651),
      IMG.plate(18257675),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Optic White', hex: '#F7F6F3' },
      { name: 'Ash Grey', hex: '#9A9A97' },
    ],
    release: '09',
  },
  {
    id: 'ctrl-denim-jacket',
    name: 'CTRL Denim Jacket',
    category: 'Outerwear',
    price: 390,
    tagline: 'Rigid denim, boxy trucker',
    description:
      'A boxy trucker cut from rigid denim that starts stiff and earns its character.',
    details:
      'Cut from the same shuttle-loom denim as the Wide Denim so the two pieces wear in together. Boxy through the body, with a two-piece chest pocket, copper hardware and a clean, uncuffed hem.',
    images: [
      IMG.plate(11096066),
      IMG.plate(7679722),
      IMG.plate(16390573),
      IMG.plate(36548644),
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Ice Wash', hex: '#B9C7D6' },
      { name: 'Raw Indigo', hex: '#31435C' },
    ],
    release: '10',
  },
]

export const featuredProducts = products.filter((p) => p.featured)

export const getProductById = (id: string | undefined): Product | undefined =>
  products.find((p) => p.id === id)

/** Same-category pieces, excluding the one passed in. */
export const getRelatedProducts = (product: Product, limit = 3): Product[] =>
  products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, limit)

export const filterProducts = (filter: string, source: Product[] = products): Product[] =>
  filter === 'All' ? source : source.filter((p) => p.category === filter)
