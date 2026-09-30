
export const TOKENS = {
  '--backdrop': '#d4d4d1',
  '--backdrop-hi': '#e7e7e4',
  '--backdrop-lo': '#b9b9b6',
  '--ink': '#141414',
  '--ink-soft': '#3d3d3b',
  '--chrome-hi': '#fbfbfa',
  '--chrome-mid': '#9c9c9a',
  '--chrome-lo': '#4e4e4c',
  '--ctrl-red': '#c8302a',
  '--paper': '#f3f2ee',
} as const
export const STUDIO =
  'radial-gradient(120% 70% at 50% 30%, var(--backdrop-hi) 0%, var(--backdrop) 55%, var(--backdrop-lo) 100%), var(--backdrop)'

export const GRAIN =
  "linear-gradient(rgba(0,0,0,0) 62%, rgba(255,255,255,0.22) 100%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export const CHROME =
  'linear-gradient(to bottom, var(--chrome-mid) 0%, var(--chrome-hi) 22%, #cfcfcd 40%, var(--chrome-lo) 72%, #8a8a88 100%)'

export const CHROME_SHADOW = '0 6px 10px -4px #00000059, inset 0 1px #ffffff80'
export const DISPLAY =
  'font-black uppercase leading-[0.92] tracking-[-0.01em] [font-stretch:125%]'
export const LABEL = 'font-extrabold uppercase leading-none [font-stretch:125%]'
