# Hardware Hub

E-commerce storefront for a hardware shop — doors, PVC panels, paints, hardware
accessories, and wood hardware.

| Layer    | Stack                                                   |
| -------- | ------------------------------------------------------- |
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS v4, React Router, Zustand |
| Backend  | Node.js + TypeScript, Express, REST                     |
| Database | PostgreSQL 18 (local, port 5433) via Prisma ORM         |
| Payments | Razorpay (Phase 5)                                      |

## Layout

```
hardware-hub/
├── backend/
│   ├── prisma/schema.prisma     # User, Category, Product, Cart, Order, Payment
│   └── src/
│       ├── config/              # env validation, Prisma singleton
│       ├── controllers/         # request handlers
│       ├── middleware/          # error handler, async wrapper
│       ├── routes/              # route definitions
│       ├── app.ts               # Express app assembly
│       └── server.ts            # listen + graceful shutdown
├── frontend/
│   └── src/
│       ├── components/          # shared UI (Layout)
│       ├── pages/               # route-level screens
│       ├── hooks/               # reusable React hooks
│       ├── services/            # API call functions
│       └── store/               # Zustand stores
├── render.yaml                  # Render blueprint for the API
└── package.json                 # runs both apps together
```

## Setup

**1. Install dependencies**

```bash
npm run install:all
```

**2. Configure the backend environment**

`backend/.env` already exists (copied from `.env.example`). Replace
`YOUR_PASSWORD` with your local `postgres` password:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/hardware_hub?schema=public"
```

URL-encode special characters in the password (`@` → `%40`, `#` → `%23`, `:` → `%3A`).

**3. Create the schema and load sample data**

Prisma creates the `hardware_hub` database if it doesn't exist:

```bash
npm run db:migrate
npm run db:seed
```

**4. Run both apps**

```bash
npm run dev
```

- API → http://localhost:4000
- Web → http://localhost:5173

The home page shows a **Stack health** panel. Both pills green means React →
Vite proxy → Express → Prisma → Postgres is connected end to end.

## Troubleshooting

**`npm run dev` starts, but the page shows proxy errors / the API is unreachable**

Run:

```bash
npm run kill
```

then `npm run dev` again. This stops every dev server for the project, including
orphaned `tsx watch` supervisors. Those are the nasty ones: when a watched child
crashes, `tsx watch` keeps running while binding no port — invisible to
`netstat`, but still able to make a restart look like it worked.

`npm run dev` also runs a preflight (`scripts/preflight.mjs`) that refuses to
start if ports 4000 or 5173 are already taken, rather than failing halfway.

**Two Windows-specific gotchas baked into the scripts:**

- The root `dev` script uses `concurrently --raw`. Without it, concurrently's
  piped stdio prevents `tsx watch` from ever spawning its child on Windows — the
  watcher runs, logs nothing, and binds nothing. `--raw` is load-bearing, not
  cosmetic; the cost is losing the `[api]`/`[web]` log prefixes.
- The Vite proxy targets `127.0.0.1:4000`, not `localhost:4000`. Node resolves
  `localhost` to `::1` first, and an IPv4-only listener then fails with an
  opaque `AggregateError`.

**Edited `backend/.env` and nothing changed?** Environment variables are read
once at startup. The backend watcher includes `.env`
(`tsx watch --include .env`), so it should restart itself — if not,
`npm run kill` and start again.

## API

All responses are JSON. Errors use `{ "error": { "message": string, "details"?: unknown } }`.
Protected routes expect `Authorization: Bearer <token>`.

### Auth

| Method | Path                 | Auth   | Notes                                        |
| ------ | -------------------- | ------ | -------------------------------------------- |
| POST   | `/api/auth/register` | public | Returns `{ user, token }`. Always CUSTOMER.  |
| POST   | `/api/auth/login`    | public | Returns `{ user, token }`.                   |
| GET    | `/api/auth/me`       | user   | Re-reads the user from the database.         |

A `role` field in the register body is ignored — roles are never client-settable.
Login and register are rate-limited to 10 attempts per 15 minutes in production.

### Catalog (public)

| Method | Path                  | Notes                                    |
| ------ | --------------------- | ---------------------------------------- |
| GET    | `/api/categories`     | Nested tree with active `productCount`.  |
| GET    | `/api/products`       | Filtered, sorted, paginated.             |
| GET    | `/api/products/:slug` | Inactive products return 404.            |

`GET /api/products` query parameters:

| Param      | Type                                              | Default  |
| ---------- | ------------------------------------------------- | -------- |
| `category` | category slug — a parent includes its children     | —        |
| `search`   | matches name, description, SKU, material           | —        |
| `minPrice` / `maxPrice` | number                               | —        |
| `inStock`  | `true` / `false`                                   | —        |
| `sort`     | `newest`, `price_asc`, `price_desc`, `name_asc`    | `newest` |
| `page`     | integer ≥ 1                                        | `1`      |
| `limit`    | integer 1–60                                       | `12`     |

Returns `{ products, pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage } }`.

### Cart (requires sign-in)

| Method | Path                     | Notes                                        |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/api/cart`              | Creates the cart lazily on first access.     |
| POST   | `/api/cart/items`        | Re-adding a product merges into its quantity. |
| PUT    | `/api/cart/items/:id`    | `quantity: 0` removes the row.               |
| DELETE | `/api/cart/items/:id`    | Removes one item.                            |
| DELETE | `/api/cart`              | Empties the cart.                            |

Every response returns the **whole cart** with server-computed `subtotal`,
`itemCount`, and per-item `issues`, so the client never recomputes totals.

Totals use live product prices — nothing is frozen until checkout writes
`OrderItem.priceAtPurchase` in Phase 5.

Item routes are scoped by the owning user (`where: { id, cart: { userId } }`),
so knowing another customer's item id gets you a 404, not their cart.

### Orders and payment (requires sign-in)

| Method | Path                          | Notes                                          |
| ------ | ----------------------------- | ---------------------------------------------- |
| POST   | `/api/orders`                 | Builds a PENDING order from the cart.          |
| GET    | `/api/orders`                 | Your orders, newest first.                     |
| GET    | `/api/orders/:id`             | Scoped to you — another buyer's id 404s.       |
| POST   | `/api/payment/create-order`   | Registers the order with Razorpay.             |
| POST   | `/api/payment/verify`         | Verifies signature, commits the sale.          |
| POST   | `/api/payment/failed/:id`     | Records an abandoned attempt.                  |
| GET    | `/api/admin/orders`           | Admin: every order, optional `?status=`.       |

**Stock is not decremented when the order is created.** An unpaid order must not
hold inventory hostage. The decrement happens once, in `/payment/verify`.

**The oversell guard.** Inside the verify transaction, each item runs a single
conditional update:

```sql
UPDATE products SET stockQty = stockQty - n WHERE id = ... AND stockQty >= n
```

Postgres locks the row and re-evaluates the condition against the committed
value, so of two buyers racing for the last unit exactly one gets `count = 1`.
Reading stock and then writing it would let both pass. Verified with 8
concurrent buyers against 3 units, three rounds: 3 paid, 5 rejected, every time.

**If payment succeeds but stock is gone**, the transaction rolls back, the order
is marked CANCELLED with `paymentStatus: PAID`, the payment row is written, and
the API returns 409 with `refundRequired: true` — so the refund is visible in
the data rather than silently lost.

**Verify is idempotent.** A replayed callback returns 200 with
`alreadyProcessed: true` and does not decrement stock a second time.

### Order tracking

Every status change writes a timestamped row to a status-history table, not
just an overwrite of `Order.status` — so the app can show *when* an order was
placed, paid, shipped and delivered, not only what it currently is.

| Event      | Written by                          | Note example                              |
| ---------- | ------------------------------------ | ------------------------------------------ |
| `PENDING`  | Order creation                       | "Order placed"                             |
| `PAID`     | Payment verify (signature confirmed) | "Payment confirmed"                        |
| `SHIPPED`  | Admin status update                  | "Shipped via BlueDart — AWB7788221"        |
| `DELIVERED`| Admin status update                  | "Delivered"                                |
| `CANCELLED`| Admin status update, or an oversell rollback | "Cancelled — stock returned to inventory" |

`Order.trackingNumber` and `Order.carrier` are set together, only on the
SHIPPED transition, and both are optional — an admin can ship without either.

**Customer view** (`OrderDetailPage`) renders a four-step tracker — Placed →
Paid → Shipped → Delivered — each step timestamped once its event exists. A
cancelled order gets its own banner with the cancellation reason instead of a
stepper frozen mid-way, which would misleadingly suggest it's still moving.

**Admin view** (`/admin` → Orders tab) shows the same history as a compact
timestamped list, and clicking "Mark shipped" reveals an inline form for
carrier and tracking number before confirming — not an instant, blind status
flip.

### Setting up Razorpay

Payment keys are optional. Without them the catalogue, cart and order creation
all work, and only the payment endpoints return 503.

1. Sign up at [razorpay.com](https://razorpay.com) and switch the dashboard to
   **Test Mode**.
2. Generate API keys — a test key id starts with `rzp_test_`.
3. Add both to `backend/.env`:

```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
```

4. Restart the backend. Use Razorpay's test card `4111 1111 1111 1111`, any
   future expiry, any CVV.

Only the **key id** reaches the browser. The secret stays server-side, which is
what makes signature verification meaningful. Switch to live keys only after a
full test-mode order.

### Admin (requires `role: ADMIN`)

| Method | Path                              | Notes                                       |
| ------ | --------------------------------- | ------------------------------------------- |
| GET    | `/api/admin/stats`                | Revenue, order counts, low-stock count.     |
| GET    | `/api/admin/products`             | Includes inactive products.                 |
| POST   | `/api/admin/products`             | `slug` auto-derived from `name` if absent.  |
| PUT    | `/api/admin/products/:id`         | Partial update; at least one field.         |
| PATCH  | `/api/admin/products/:id/stock`   | Focused stock edit.                         |
| DELETE | `/api/admin/products/:id`         | **Soft delete** — sets `isActive: false`.   |
| GET    | `/api/admin/orders`               | Every order, optional `?status=`.           |
| PATCH  | `/api/admin/orders/:id/status`    | Advances fulfilment.                        |
| GET    | `/api/admin/categories`           | Flat list with parent name and counts.      |
| POST   | `/api/admin/categories`           | `parentId: null` for a top-level category.  |
| PUT    | `/api/admin/categories/:id`        | Rename or move to a different parent.       |
| DELETE | `/api/admin/categories/:id`        | Blocked while products or children exist.   |

Categories nest **one level deep only** — Doors → Wooden Doors, not a third level.
Creating or moving a category under something that already has a parent is
rejected with 400, and moving a category to become a child of its own child is
rejected before the write happens.

`DELETE` refuses to run rather than relying on the database's default behavior:
products would hit the foreign key (`onDelete: Restrict`, an ugly 500), and
child categories would silently become root categories via `onDelete: SetNull`.
Both are surprises worth stopping at the API — reassign or delist first.

Delete is a soft delete on purpose: order history references products, so a hard
delete would either be blocked by the foreign key or orphan past orders.

**Order status is a state machine**, not a free-form field:

```
PENDING  ->  CANCELLED
PAID     ->  SHIPPED | CANCELLED
SHIPPED  ->  DELIVERED | CANCELLED
DELIVERED, CANCELLED  ->  (final)
```

`PAID` is not an accepted input. Payment status is set only by a verified
Razorpay signature — letting an admin mark an order paid by hand would be a way
to ship goods with no money received.

**Cancelling a paid order restocks it** in the same transaction as the status
change, so stock and status cannot diverge.

Revenue in `/admin/stats` excludes cancelled orders: that money is owed back,
not earned.

### Seed data

```bash
npm run db:seed
```

Idempotent — upserts by slug, so re-running never duplicates rows. Creates 18
categories (5 top-level with subcategories), 26 products, and two dev accounts:

| Role     | Email                       | Password         |
| -------- | --------------------------- | ---------------- |
| admin    | admin@hardwarehub.test      | `Admin@12345`    |
| customer | customer@hardwarehub.test   | `Customer@12345` |

These are development-only credentials. Never seed them into production.

## Frontend routes

| Route              | Page               | Notes                                             |
| ------------------ | ------------------ | ------------------------------------------------- |
| `/`                | HomePage           | Category tiles and latest arrivals, both live.     |
| `/products`        | ProductsPage       | Filter, search, sort, paginate.                    |
| `/products/:slug`  | ProductDetailPage  | Specs, stock, add to cart.                         |
| `/cart`            | CartPage           | Auth-guarded. Quantity stepper, live totals.       |
| `/checkout`        | CheckoutPage       | Address form, Razorpay widget.                     |
| `/orders`          | OrdersPage         | Your order history.                                |
| `/orders/:id`      | OrderDetailPage    | Status, items at purchase price, address.          |
| `/admin`           | AdminDashboardPage | Admin-only. Orders, Products, Categories tabs.     |
| `/admin/products/new`      | AdminProductFormPage | Create a product.                        |
| `/admin/products/:id/edit` | AdminProductFormPage | Edit, relist/delist a product.           |
| `/login`           | LoginPage          | Redirects back to where you were headed.           |
| `/register`        | RegisterPage       | Per-field validation from the API.                 |

Filter state lives in the **URL**, not component state, so a filtered view is
shareable and the browser back button steps through filter changes. For example
`/products?category=doors&sort=price_asc&minPrice=2000`.

Search is debounced 350ms, and in-flight requests are tracked by id so a slow
early response cannot overwrite newer results.

## Build phases

All six phases are complete.

- [x] **1 — Setup**: repo scaffold, Prisma schema, both apps booting
- [x] **2 — Auth + catalog backend**: JWT auth, category/product CRUD, seed script
- [x] **3 — Storefront**: listing with filter/search/pagination, product detail
- [x] **4 — Cart**: DB-backed cart for logged-in users
- [x] **5 — Checkout + Razorpay**: order creation, payment verify, atomic stock decrement
- [x] **6 — Orders + admin**: order history, admin dashboard

## Deployment

Not deployed yet — both platforms need your own account logins. When you are ready:

- **Backend → Render**: import the repo; `render.yaml` configures the service.
  Set `DATABASE_URL` and `CORS_ORIGIN` in the Render dashboard.
- **Frontend → Vercel**: import the repo with root directory `frontend`.
  Set `VITE_API_BASE_URL` to the Render URL.

Secrets (`DATABASE_URL`, `JWT_SECRET`, Razorpay keys) live in `.env` files
locally and in the host's environment settings in production — never in git.
