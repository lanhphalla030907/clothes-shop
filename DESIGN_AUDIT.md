# Frontend redesign — audit and implementation notes

## Routes found

- Storefront: `/`, `/shop`, `/product/:id`, `/cart`, `/checkout`, `/success`, `/about`, `/login`, `/register`, `*`
- Account (protected): `/dashboard`, `/dashboard/orders`, `/dashboard/orders/:id`, `/dashboard/wishlist`,
  `/dashboard/bag`, `/dashboard/addresses`, `/dashboard/checkout`, `/dashboard/checkout/:orderId`,
  `/dashboard/profile`
- Admin (ADMIN role): `/admin`, `/admin/products`, `/admin/products/new`,
  `/admin/products/:productId`, `/admin/categories`

## Home page identity to preserve

Black / bone / soft-grey palette, Archivo display type, wide uppercase headlines, hairline rules,
square geometry, editorial spacing and the hero rail. The home page is not being restructured.

## Main UX problems found

1. Functional screens used editorial micro-type (11px mono, wide tracking, uppercase) for labels,
   metadata and actions. It looks good on a poster and is tiring in a dashboard.
2. Navigation had no account menu, no grouped account navigation and a full-screen mobile menu of
   oversized display links that was hard to scan.
3. The account dashboard presented four equal panels with little prioritisation, no welcome heading
   that used the account, and a "Checkout" item in the persistent sidebar.
4. The profile screen contained stale copy saying sign-in was not implemented even though it now is.
5. Admin navigation advertised five disabled/“SOON” modules, making the area look unfinished.
6. Public demo bag and account bag coexist; the demo page explains it only at the bottom.
7. Form labels, error text and table metadata were below a comfortable reading size.
8. Product listing had no sorting, no result count clarity and no touch-visible quick add.

## Design decisions

- Keep the Archivo + IBM Plex Mono pairing and the existing colour tokens.
- Use Archivo for all functional UI; reserve the mono face for figures, SKUs, dates and the editorial
  marquee. Raise micro type to 12px and use a 12–15px sans scale for labels/body in account and admin.
- Keep square geometry, hairline borders and the wipe-action button. Extend the existing `Action`
  primitive instead of adding a second button system.
- Group account navigation into Account / Shopping / Delivery; remove Checkout from persistent nav.
- Add an accessible account dropdown to the storefront navbar and a compact, scrollable mobile menu.
- Rebuild the account overview around a welcome + quick actions + recent orders, then shopping and
  delivery summaries. All values remain real API data.
- Rebuild the admin shell around the modules that actually exist. Show unimplemented modules as a
  short note, not as disabled navigation.
- Improve tables to readable sans headers, 14px cells, 44px action targets and card fallbacks below md.

## Verification plan

`npm run build`, `npm run lint`, then render representative routes at 375 / 768 / 1024 / 1440 with a
headless browser and inspect screenshots plus console output.

## Verification results (final)

- `npm run lint` — pass, no warnings.
- `npm run build` (`tsc -b && vite build`) — pass.
- No frontend test script is configured in `package.json`; no tests were run.
- Automated axe WCAG A/AA audit — 40 route × viewport runs across home, shop, product, login, register,
  404, account (overview, orders, addresses, profile) and admin (dashboard, products, new, edit,
  categories) at 375 / 768 / 1024 / 1440. **0 violations, 0 horizontal overflow.**
- Interaction smoke test — **29/29**: protected-route redirect with `?from=`, form validation, mobile
  menu open/Escape/scroll lock/focus return, skip link, account menu focus return, account and admin
  drawers with focus management, non-admin forbidden state, empty demo-checkout state.
- Screenshots and JSON artifacts live outside the repo at `D:\Temp\opencode\visual\`.
- Console output: only the pre-existing Home duplicate-key warnings for `ctrl-wide-denim` and
  `ctrl-double-breasted-blazer`; no page errors and no API failures in the final capture.

## Known limits

- The Home hero intentionally keeps the navbar hidden and non-interactive until 24px of scroll (existing
  behaviour, preserved). On mobile the menu is therefore reachable after a short scroll, not at the very
  top.
- Home retains eight editorial micro-type nodes below 11px by design; functional screens have none.
- Storefront footer text links are 20px high (WCAG 2.5.8 spacing exception applies); the newsletter
  field and submit button were raised to 44px.
- Product-card wishlist buttons are 40×40 with a 2px pseudo-element expansion (44×44 hit area).
- `src/components/admin/AdminErrorStates.tsx` duplicates `AdminGuardStates.tsx` and is unused.
- The reviewing model cannot see images: visual verification is via screenshots for human review plus
  programmatic layout, axe and interaction checks — not by looking at the captures.

