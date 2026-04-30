# Shop — Product Detail API Extensions

This document describes the **new and extended API endpoints** required to power the public-facing equipment store product detail pages. These endpoints need to be implemented in the backend (Django/DRF) and made available to the frontend.

---

## New Endpoints Required

### 1. Get Single Product (Public)

```
GET /api/shop/products/{id}
```

- **Auth**: None (public)
- **Description**: Returns full product detail, including specifications, multiple images, highlights, and rating data.

#### Response Body

```json
{
  "id": 1,
  "name": "MikroTik hAP ac²",
  "description": "Full product description...",
  "price": 4500.00,
  "original_price": 5200.00,
  "stock_quantity": 18,
  "image_url": "https://example.com/image.jpg",
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg",
    "https://example.com/image3.jpg"
  ],
  "category": "Routers",
  "is_active": true,
  "created_at": "2026-03-31T00:00:00Z",
  "sku": "RBD52G-5HacD2HnD",
  "brand": "MikroTik",
  "rating": 4.8,
  "review_count": 47,
  "warranty_months": 12,
  "weight_kg": 0.231,
  "tags": ["bestseller", "dual-band"],
  "highlights": [
    "2.4 GHz + 5 GHz concurrent dual-band Wi-Fi",
    "5× Gigabit Ethernet ports (1 WAN + 4 LAN)",
    "USB port for 3G/4G modem backup",
    "RouterOS v7 — full ISP-grade control"
  ],
  "specifications": [
    { "label": "CPU", "value": "IPQ-4018 716 MHz quad-core" },
    { "label": "RAM", "value": "128 MB DDR3" },
    { "label": "Storage", "value": "16 MB NAND" },
    { "label": "Ethernet Ports", "value": "5× 10/100/1000 Mbps" },
    { "label": "Wi-Fi Standards", "value": "802.11a/b/g/n/ac" },
    { "label": "2.4 GHz Max Speed", "value": "300 Mbps" },
    { "label": "5 GHz Max Speed", "value": "867 Mbps" }
  ]
}
```

#### Extended Fields (New — Not in Current Schema)

| Field | Type | Description |
|-------|------|-------------|
| `original_price` | `number \| null` | Pre-discount price. If set, the frontend shows the discount % badge. |
| `images` | `string[]` | Array of image URLs for the photo gallery. First image is the main display image. |
| `sku` | `string \| null` | Manufacturer part number / SKU shown on product page. |
| `brand` | `string \| null` | Manufacturer name (MikroTik, TP-Link, Ubiquiti, etc.). |
| `rating` | `number \| null` | Average star rating (0.0–5.0). Can be computed from reviews or set manually. |
| `review_count` | `integer \| null` | Number of reviews. |
| `warranty_months` | `integer \| null` | Warranty duration in months. |
| `weight_kg` | `number \| null` | Product weight in kilograms. |
| `tags` | `string[]` | Array of tag strings. Reserved values: `"bestseller"`, `"new"`, `"sale"`, `"featured"`. |
| `highlights` | `string[]` | Short bullet points (max 4) shown prominently on the product page before the spec table. |
| `specifications` | `{ label: string, value: string }[]` | Technical specification rows for the spec table on the detail page. |

---

### 2. Get Related Products (Optional Enhancement)

```
GET /api/shop/products/{id}/related?limit=4
```

- **Auth**: None (public)
- **Description**: Returns products in the same category, excluding the current product.
- **Response**: Same as `GET /api/shop/products` list — array of `ShopProduct` objects.

> **Note**: If this endpoint is not implemented, the frontend falls back to filtering the product list client-side by category. This is already done in the demo.

---

### 3. Extended Product List (Optional Enhancement)

```
GET /api/shop/products?include_extended=true
```

- **Auth**: None (public)
- **Description**: Returns the product list with `brand`, `rating`, `review_count`, `original_price`, `tags`, and `highlights` included. Useful for showing ratings and discount badges on the product grid without a separate detail fetch.

> **Note**: Currently the frontend fetches the detail page separately. The list endpoint can remain lightweight, but adding `rating`, `brand`, `original_price`, and `tags` to the list response significantly improves the product grid.

---

## Admin Endpoint Extensions

### 4. Create/Update Product — Extended Fields

The existing `POST /api/shop/products` and `PUT /api/shop/admin/products/{id}` should accept (all optional):

```json
{
  "sku": "RBD52G-5HacD2HnD",
  "brand": "MikroTik",
  "original_price": 5200.00,
  "warranty_months": 12,
  "weight_kg": 0.231,
  "tags": ["bestseller"],
  "highlights": ["Feature 1", "Feature 2"],
  "specifications": [
    { "label": "CPU", "value": "716 MHz" }
  ],
  "images": [
    "https://cdn.example.com/img1.jpg",
    "https://cdn.example.com/img2.jpg"
  ]
}
```

---

## Database Schema Changes Required

The following columns (or a JSON field) need to be added to the `ShopProduct` model:

```sql
-- Option A: Individual columns (recommended for filtering/sorting)
ALTER TABLE shop_products ADD COLUMN sku VARCHAR(100) NULL;
ALTER TABLE shop_products ADD COLUMN brand VARCHAR(100) NULL;
ALTER TABLE shop_products ADD COLUMN original_price DECIMAL(10,2) NULL;
ALTER TABLE shop_products ADD COLUMN warranty_months INTEGER NULL;
ALTER TABLE shop_products ADD COLUMN weight_kg DECIMAL(6,3) NULL;
ALTER TABLE shop_products ADD COLUMN rating DECIMAL(2,1) NULL;
ALTER TABLE shop_products ADD COLUMN review_count INTEGER DEFAULT 0;

-- Option B: JSON column for flexible data
ALTER TABLE shop_products ADD COLUMN extended_data JSONB NULL;
-- extended_data stores: { tags, highlights, specifications, images }
```

---

## Image Storage Recommendations

For production, product images should be:
1. Uploaded via the admin dashboard to **Cloudinary** or **AWS S3**
2. Multiple images stored as an array in the `images` column
3. `image_url` (primary/thumbnail) kept as a separate column for list performance
4. Recommended resolution: **800×800 px** minimum, square aspect ratio

---

## Priority Order for Implementation

1. **High**: `GET /api/shop/products/{id}` with `specifications`, `images`, `highlights`, `brand`, `sku`
2. **Medium**: `original_price`, `tags` (for discount badges and featured labels)
3. **Low**: `rating`/`review_count` (can be hardcoded initially), `GET /api/shop/products/{id}/related`

---

*Generated: April 2026 — Bitwave ISP Billing Platform*
