# Customizable category pages: backend handover

**For:** backend developer · **From:** frontend · **Status:** proposal, ready to build

## 1. Goal

Today the Fruits page is hand-coded and every other category gets one fixed layout.
With this change, **every category page is built from data the admin edits**:
- theme colour;
- hero banner;
- trust points and stats;
- the list of page sections, with their order and on/off state;
- banners, buying guide, FAQ and text blocks;
- draft → preview → publish.

The frontend gets **everything for one page in one API call**.

Decisions taken (change them here if you disagree):

| Question | Decision |
|---|---|
| Free colours or presets? | **Presets only** (`VEG`, `NON_VEG`, `EGG`, `GENERAL`), so text stays readable and the site stays consistent |
| Draft / preview from day one? | **Yes**: the admin edits a draft, previews it, publishes. Shoppers only ever see the published copy |
| Subcategory overrides? | **Yes, optional**: a subcategory with no metadata row uses defaults plus its parent's theme |
| Where does the theme live? | In `category_metadata` (replaces the earlier ask for `foodType` on `category`) |

---

## 2. The flow

### Shopper

```
Browser ──> Next.js /meat ──(1 call, cached)──> GET /api/v1/category-pages/meat
                                                 = category + published page metadata
                                                   + subcategories + counts + product rails
          (only after the shopper sets a location, live, not cached)
          ──> GET /api/v1/category-pages/meat/nearby?latitude=&longitude=
              = nearby store count + lowest price
```

The page response is **location-free**, so Next.js can cache it for every visitor.
"Stores near you" and "Prices from ₹X" depend on where the shopper is, so they come from a tiny separate call. If no location is set, those stats are simply hidden.

### Admin

```
Admin › Categories › Meat › "Edit page"
  load     GET  /admin/category-pages/{categoryId}            (draft + published + version)
  upload   POST /admin/category-pages/{categoryId}/images     (per picture, returns imageId)
  save     PUT  /admin/category-pages/{categoryId}/draft      (whole draft, with version)
  preview  GET  /admin/category-pages/{categoryId}/preview    (same shape as the public page, built from the draft)
  publish  POST /admin/category-pages/{categoryId}/publish
  discard  POST /admin/category-pages/{categoryId}/discard-draft
```

After publish, the frontend clears its cache for that page, so shoppers see the change at once.

---

## 3. Database

```sql
CREATE TABLE category_metadata (
    category_id        BIGINT PRIMARY KEY REFERENCES category(category_id),
    theme              VARCHAR(20) NOT NULL DEFAULT 'GENERAL',   -- VEG | NON_VEG | EGG | GENERAL
    draft              JSONB,            -- what the admin is editing (null = no unpublished changes)
    published          JSONB,            -- what shoppers see (null = never published -> defaults)
    schema_version     INT  NOT NULL DEFAULT 1,
    version            INT  NOT NULL DEFAULT 0,    -- +1 on every draft save / publish (optimistic lock)
    published_at       TIMESTAMPTZ,
    published_by       BIGINT REFERENCES users,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by         BIGINT REFERENCES users
);

-- Pictures uploaded for pages (public bucket, like category images)
CREATE TABLE category_page_image (
    image_id      UUID PRIMARY KEY,
    category_id   BIGINT NOT NULL REFERENCES category(category_id),
    storage_key   VARCHAR(300) NOT NULL,
    purpose       VARCHAR(20) NOT NULL,   -- HERO | HERO_MOBILE | BANNER | GUIDE | OG
    width INT, height INT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    BIGINT REFERENCES users
);

-- Phase 3: history for "restore an older version"
CREATE TABLE category_metadata_history (
    history_id    BIGSERIAL PRIMARY KEY,
    category_id   BIGINT NOT NULL REFERENCES category(category_id),
    version       INT NOT NULL,
    theme         VARCHAR(20) NOT NULL,
    published     JSONB NOT NULL,
    published_at  TIMESTAMPTZ NOT NULL,
    published_by  BIGINT
);
```

Notes:
- **`theme` is a column, not part of the JSON.** It's needed for listings and checks without parsing JSON. Theme changes go through the draft too: store the draft theme inside `draft` as `draftTheme`, and copy it to the column on publish.
- **Subcategories:** same table, keyed by the subcategory's `category_id`. A subcategory **always uses its parent's theme** (its `theme` is ignored).
- **Unused pictures:** a nightly job may delete images that aren't referenced by `draft` or `published` and are older than 7 days.

---

## 4. The page metadata JSON (`draft` / `published`), schema v1

```jsonc
{
  "schemaVersion": 1,
  "theme": "NON_VEG",                         // in draft only; column on publish
  "hero": {
    "headline": "Meat",                       // ≤ 60, optional (default: category name)
    "accentLine": "from stores near you",     // ≤ 60, optional (default shown when null)
    "intro": "**Fresh cuts** from local butchers\n- Cut on order",  // rich text ≤ 600
    "imageId": "uuid-or-null",                // HERO image (default: category picture)
    "mobileImageId": "uuid-or-null",          // HERO_MOBILE, optional
    "imageAlt": "Fresh chicken and mutton",   // ≤ 125
    "badge": "Trending",                      // ≤ 30, optional
    "trustPoints": [                          // 0–3
      { "icon": "store", "text": "Sold by meat shops near you" }   // text ≤ 60
    ],
    "stats": ["PRODUCTS", "TYPES", "STORES_NEARBY", "PRICES_FROM"]  // 0–4, ordered, no repeats
  },
  "sections": [                               // 0–12, shown in this order
    { "id": "types", "type": "SUBCATEGORIES", "enabled": true,
      "title": "Shop by type", "subtitle": "Pick a cut", "layout": "TILES" },
    { "id": "season", "type": "PRODUCT_RAIL", "enabled": true,
      "title": "In season now", "subtitle": null, "source": "IN_SEASON", "limit": 8 },
    { "id": "picks", "type": "PRODUCT_RAIL", "enabled": true,
      "title": "Our picks", "source": "MANUAL", "productIds": [12, 18, 7], "limit": 8 },
    { "id": "promo1", "type": "BANNER", "enabled": true,
      "imageId": "uuid", "mobileImageId": null, "imageAlt": "Weekend mutton",
      "heading": "Weekend specials", "text": "Fresh mutton every Saturday",
      "link": "/meat/mutton", "linkLabel": "Shop mutton",
      "showFrom": "2026-11-01", "showUntil": "2026-11-30" },
    { "id": "guide", "type": "GUIDE", "enabled": true, "title": "How to buy fresh meat",
      "items": [ { "icon": "thumbs-up", "title": "Check the colour", "text": "Bright pink, **no smell**" } ] },
    { "id": "faq", "type": "FAQ", "enabled": true, "title": "Questions",
      "items": [ { "question": "Is it cut on order?", "answer": "Most stores cut **on order**." } ] },
    { "id": "about", "type": "TEXT", "enabled": true, "title": "About our meat",
      "body": "Long formatted text…" }
  ],
  "seo": {
    "ogImageId": "uuid-or-null",              // picture for WhatsApp / social sharing
    "footerText": null                        // rich text ≤ 3000, shown low on the page for Google
  }
}
```

### Section types

| type | Allowed on | Fields (besides `id`, `type`, `enabled`, `title` ≤ 60, `subtitle` ≤ 120) | Limits |
|---|---|---|---|
| `SUBCATEGORIES` | top-level only | `layout`: `TILES` \| `CHIPS` | max 1 per page |
| `PRODUCT_GRID` | subcategory only | `showFilters`: boolean | exactly 1 per subcategory page (added by default) |
| `PRODUCT_RAIL` | both | `source`: `IN_SEASON` \| `FEATURED` \| `MANUAL`; `productIds` (only for MANUAL, 1–12, active products inside this category's tree); `limit` 4–12 | max 4 |
| `BANNER` | both | `imageId` (required), `mobileImageId`, `imageAlt` ≤ 125, `heading` ≤ 60, `text` ≤ 160, `link` (internal path, must start with `/`, no `//`), `linkLabel` ≤ 30, `showFrom` / `showUntil` (dates, optional) | max 3 |
| `GUIDE` | both | `items`: 1–6 of `{icon, title ≤ 40, text rich ≤ 300}` | max 1 |
| `FAQ` | both | `items`: 1–15 of `{question ≤ 150, answer rich ≤ 1000}` | max 1 |
| `TEXT` | both | `body` rich ≤ 3000 | max 3 |

- `id`: short id made by the frontend (`^[a-z0-9-]{1,20}$`), unique within the page. It lets the frontend keep track of each section while the admin reorders them.
- `BESTSELLER` rails come later, once orders exist.

### Validation rules (same style as today)

- **Text fields:** all plain text with the same `SAFE_LINE` / `SAFE_MULTILINE` rules (no `<` `>`). Fields marked *rich* use our formatting marks (`**bold**`, `*italic*`, `__underline__`, `- ` lists); they're stored as plain text and counted including the marks.
- **`icon`:** must be one of the allowed names:
  `store, scale, badge-check, leaf, sparkles, truck, clock, shield-check, heart, star, thumbs-up, snowflake, calendar, map-pin, package, tag, percent, flame, droplet, fish, beef, drumstick, egg, apple, carrot, wheat, milk, coffee, shirt, gift`.
- **`stats`:** values from `PRODUCTS, TYPES, IN_SEASON, STORES_NEARBY, PRICES_FROM`. `TYPES` is only valid on top-level pages.
- **`imageId`:** must exist in `category_page_image` **for the same category**.
- **`productIds`:** must be active products inside this category (top-level: any of its subcategories).
- **Dates:** `showUntil ≥ showFrom`.
- **Unknown keys** or an unknown `type`: return 400 VALIDATION_FAILED (don't silently drop them).
- **Field paths in errors** follow the JSON, e.g. `sections[3].items[0].question`, `hero.trustPoints[1].text`. The frontend highlights the exact field.

### Defaults when there's no row / nothing published

Build the page from defaults, so every category works without any setup:
- **theme:** `GENERAL`;
- **hero:** headline = category name, accentLine = "from stores near you", intro = category description, image = category picture, badge = category badgeLabel, no trust points, stats `["PRODUCTS", "TYPES"]`;
- **sections, top-level:** `SUBCATEGORIES` (TILES) + `PRODUCT_RAIL` IN_SEASON;
- **sections, subcategory:** `PRODUCT_GRID`.

---

## 5. Public API (no login)

### 5.1 `GET /api/v1/category-pages/{slug}` and `GET /api/v1/category-pages/{slug}/{subSlug}`

The one call per category page. Published data only; hidden categories return 404.

```jsonc
200
{
  "category": { /* the same shape as GET /categories items */ },
  "parent": null,                        // the parent category, for a subcategory page
  "theme": "NON_VEG",                    // resolved (subcategory = parent's)
  "page": { /* published metadata (section 4) with defaults filled in:
               - disabled sections removed
               - BANNERs outside showFrom/showUntil (India date) removed
               - imageId -> "imageUrl" (public URL) everywhere, imageId kept too
               - hero.headline / accentLine / intro / image defaults filled */ },
  "subcategories": [ /* top-level: its active subcategories (same shape as /subcategories);
                        subcategory page: its siblings, for chips */ ],
  "summary": {
    "productCount": 21,                  // active products with ≥ 1 active size, whole tree
    "subcategoryCount": 6,
    "inSeasonCount": 14
  },
  "rails": {                             // one entry per enabled PRODUCT_RAIL, keyed by section id
    "season": [ /* product cards, see below */ ],
    "picks":  [ /* … in the admin's order for MANUAL */ ]
  },
  "products": [ /* subcategory page only: its active products, same shape as
                   GET /categories/{subId}/products (so the frontend needs no second call) */ ],
  "version": 7,                          // published version (frontend uses it for caching)
  "publishedAt": "2026-10-22T10:00:00Z"
}
```

- **Product card in `rails`:** `productId`, `name`, `slug`, `categorySlug`, `subcategorySlug`, `imageUrl`, `foodType`, `badgeLabel`, `isInSeason`, `brand`, `shortDescription`, `variants: [{variantId, label}]`.
- **No prices.** Prices are per store and location, so they never go in a cached response.
- **Errors:** `404 CATEGORY_NOT_FOUND` (unknown or hidden slug, or a subSlug that isn't a child of slug).

### 5.2 `GET /api/v1/category-pages/{slug}/nearby?latitude=&longitude=` (and `/{slug}/{subSlug}/nearby`)

Live, never cached; called from the browser via our server only after the shopper sets a location.

```json
200 { "storeCount": 3, "lowestPrice": 32.00 }
```

- **`storeCount`:** live stores that deliver to this point and sell at least one in-stock product of this category (tree).
- **`lowestPrice`:** the lowest in-stock price among them, or `null`.
- **Errors:** `400 VALIDATION_FAILED` (coordinates out of range, outside India), `404 CATEGORY_NOT_FOUND`.

---

## 6. Admin API (role ADMIN)

| Method & path | Body | Returns |
|---|---|---|
| `GET /admin/category-pages/{categoryId}` | | `{ categoryId, isSubcategory, parentCategoryId, theme, draft, published, effectiveDraft, version, publishedAt, publishedBy, updatedAt, updatedBy, hasUnpublishedChanges, images: [{imageId, url, purpose}] }` (`effectiveDraft` = draft, or published when there's no draft, or defaults; this is what the editor opens) |
| `PUT /admin/category-pages/{categoryId}/draft` | `{ "version": 7, "page": { …section 4… } }` (whole draft, replaces it) | `{ success, message, id: "8" }` (id = new version) |
| `POST /admin/category-pages/{categoryId}/publish` | `{ "version": 8 }` | `{ success, message, id: "9" }` |
| `POST /admin/category-pages/{categoryId}/discard-draft` | `{ "version": 8 }` | `{ success, message }` |
| `GET /admin/category-pages/{categoryId}/preview` | | same shape as 5.1, built from the draft, hidden category allowed |
| `POST /admin/category-pages/{categoryId}/images` | multipart: part `image` (JPEG/PNG/WebP ≤ 2 MB), part `purpose` | `201 { imageId, url, purpose, width, height }` |
| `GET /admin/category-pages/{categoryId}/products?q=&page=&size=` | | paged `{ productId, name, imageUrl, subcategoryName, isActive }`, the product picker for MANUAL rails (the whole tree, search by name) |
| *Phase 3* `GET /admin/category-pages/{categoryId}/history` | | `[{ version, publishedAt, publishedBy }]` |
| *Phase 3* `POST /admin/category-pages/{categoryId}/restore` | `{ "version": 9, "fromVersion": 5 }` | copies that history entry into the draft |

**Optimistic lock:** every write sends the `version` it loaded. If the row has moved on (another admin saved), return `409 PAGE_VERSION_CONFLICT` and save nothing. The frontend then offers "Reload".

### Error codes (new)

| Status | code | When |
|---|---|---|
| 404 | `CATEGORY_NOT_FOUND` | unknown category / slug |
| 400 | `VALIDATION_FAILED` | any field rule, with `errors[].field` paths as in section 4 |
| 400 | `SECTION_NOT_ALLOWED` | e.g. SUBCATEGORIES on a subcategory, a second FAQ, more than the max count (field = `sections[i]`) |
| 400 | `PAGE_IMAGE_NOT_FOUND` | imageId unknown or from another category (field = its path) |
| 400 | `PRODUCT_NOT_IN_CATEGORY` | MANUAL productIds outside the tree or hidden (field = `sections[i].productIds`) |
| 409 | `PAGE_VERSION_CONFLICT` | stale `version` |
| 409 | `NOTHING_TO_PUBLISH` | publish with no draft |
| 400 / 413 | `INVALID_IMAGE` / `IMAGE_TOO_LARGE` | as today |
| 401 / 403 | `UNAUTHENTICATED` / `FORBIDDEN` | as today |

---

## 7. Also changed / unchanged

- **Unchanged:** `GET /categories` and `GET /categories/{id}/subcategories` (header, home, footer). Please **add `theme`** to these items (resolved, published), so category cards and the header can use the colour without extra calls.
- **Not needed any more:** the earlier ask for `foodType` on `category`, and the separate "category summary" endpoint. Both are covered by 5.1 and 5.2.
- **No API loops:** the public page = 1 call (+1 live `nearby` once a location is set). The admin editor = 1 load, +1 per picture upload, save, publish or product search.

---

## 8. Phases

| Phase | Backend | Frontend |
|---|---|---|
| **1** | Tables, defaults, `GET /category-pages/{slug}[/{subSlug}]` (with summary, rails IN_SEASON/FEATURED, products), admin load / draft / preview / publish / discard, images upload, `theme` on `GET /categories` | Shop pages render from the API (one section component per type); admin "Edit page" builder: theme, hero, trust points, stats, section order and on/off, SUBCATEGORIES + PRODUCT_RAIL (IN_SEASON/FEATURED), live preview, publish |
| **2** | BANNER, GUIDE, FAQ, TEXT, seo, `nearby` endpoint | Those section editors + renderers, FAQ JSON-LD, nearby stats with the shopper's location |
| **3** | MANUAL rails + product search, history + restore, nightly image cleanup | Product picker, history list, restore |

After phase 2, the Fruits page's hand-written code and sample data can go: Fruits becomes a normal category whose page the admin builds.

---

## 9. Frontend plan (for reference)

- **`lib/category-page/`:** types (this contract), validation (the same limits, checked in the browser first), service, `data.ts` (cached `getCategoryPage(slug, subSlug)`, tag `category-page:<slug>`), actions (save draft, publish, discard, upload, product search).
- **Shop:**
  - `app/[category]/page.tsx` and `app/[category]/[subcategory]/page.tsx` call `getCategoryPage` once.
  - `components/category-page/` holds one component per section: Hero, TrustPoints, Stats, Subcategories, ProductRail, ProductGrid, Banner, Guide, Faq (+ FAQPage JSON-LD), Text, plus `NearbyStats` (client, live).
  - The theme sets the colours.
- **Admin:** `/admin/categories/{id}/page`, a page builder:
  - left side: theme picker, hero form, sections list (add, move up/down, on/off, edit in a dialog), picture uploads;
  - right side: a live preview with a phone/desktop toggle;
  - Save draft / Preview / Publish / Discard, a warning about unsaved changes, and handling of version conflicts.
- **SEO:** unchanged rules (title, description, canonical, H1, breadcrumbs, JSON-LD); FAQ adds FAQPage JSON-LD; `og:image` comes from `seo.ogImageId`.

---

## 10. Update: page colours (named colours + custom colour)

The page editor now shows colours by name (Green, Red, Amber, Indigo) and has a **Custom** colour picker. Two backend changes switch the rest on:

### 10.1 Colour names as theme values
- `PageTheme` becomes `GREEN, RED, AMBER, ORANGE, PINK, PURPLE, INDIGO, BLUE, TEAL, SLATE`.
- Migrate stored values: `VEG→GREEN`, `NON_VEG→RED`, `EGG→AMBER`, `GENERAL→INDIGO`. This covers the theme columns, `theme` inside `draft` / `published` JSON, and history rows. Default `INDIGO`.
- The frontend reads both the old and the new names, so the order of deployment doesn't matter.

### 10.2 Custom colour
- **`CategoryPageDocument`:** optional `"customColour": "#RRGGBB"` (top-level pages only; ignored on subcategories, like `theme`). Null or absent means use the preset. `theme` stays required as the fallback.
- **Validation:**
  - Format: `^#[0-9a-fA-F]{6}$`, stored lower-case.
  - Readability: contrast with white must be ≥ 4.5:1 (WCAG AA). Otherwise return `VALIDATION_FAILED` with `errors[].field = "customColour"`. The colour is used as text on white and under white text.
  - Contrast = `1.05 / (L + 0.05)`, where `L = 0.2126 R + 0.7152 G + 0.0722 B` and each channel `c = v/255` is linearised: `c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)^2.4`.
- **Responses:**
  - `CategoryPageResponse.customColour` is the resolved value: a subcategory page gets its parent's.
  - `PageHistoryResponse.customColour`.
  - Optionally on `CategoryResponse` (cards could use it later).
- **Publish / restore:** copy it like `theme`.
