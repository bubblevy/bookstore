<p align="center">
  <kbd>
    <img src="public/app.png" width="100%" alt="BookStore Demo">
  </kbd>
</p>

<h1 align="center">BookStore - Modern Bookstore Web Application</h1>

<p align="center">
  A modern, responsive, and interactive online bookstore platform built with <strong>Vue 3</strong> and <strong>Vite</strong>. Features complete catalog browsing, shopping cart, multi-courier checkout, automated payment instructions, real-time order tracking via Server-Sent Events (SSE), and comprehensive dashboards for both customers and administrators.
</p>

---

## Related Repositories

This application serves as the frontend client connected to the backend REST API:

- Frontend Repository: [https://github.com/bubblevy/bookstore](https://github.com/bubblevy/bookstore)
- Backend Repository: [https://github.com/bubblevy/bookstore-be](https://github.com/bubblevy/bookstore-be)

The frontend communicates with the backend via RESTful API endpoints and a real-time SSE stream for order status synchronization and transaction processing.

---

## Key Features

### 1. Storefront & Browsing Experience
- **Hero & Genre Exploration**: Interactive exploration with stickers, book category filters, and promotional banners.
- **Catalog & Fast Search**: Filter by category, sort by popularity, release date, or price, with real-time debounced modal search and pagination.
- **Rich Book Details**: Synopsis, specifications (ISBN, publisher, page count, publication date), dynamic stock availability, and automated discount badges.
- **Shopping Cart Drawer**: Instant quantity updates, stock validation, and state synchronization.
- **Wishlist**: One-click book saving from catalog cards, detail pages, or user dashboard.

### 2. Checkout & Payments
- **Shipping Address Management**: Select saved addresses or add a new delivery address during checkout.
- **Shipping Cost Calculation**: Automated courier service selection and delivery fee calculation.
- **Vouchers & Discounts**: Apply promotional voucher codes with instant cart subtotal reductions.
- **Multiple Payment Channels**:
  - Bank Transfer / Virtual Account: BCA, Mandiri, BNI, BRI.
  - E-Wallets & QRIS: QRIS, GoPay, OVO, ShopeePay.
  - Retail Outlets: Indomaret, Alfamart.
- **Payment Instructions & VA Number**: Dedicated instructions view with one-click copying for payment codes and account numbers.

### 3. Real-Time Order Tracking (Server-Sent Events)
- Live order status progression (Pending Payment -> Processing -> Shipped -> Completed) powered by native SSE (`/v1/orders/sse`).
- Automated tracking number (waybill/resi) updates with shipment timeline.
- Return/refund request support for completed orders.

### 4. Customer Dashboard (User Dashboard)
- **My Orders**: Transaction history, payment status, invoice details, and tracking updates.
- **Wishlist**: Saved book collection with direct add-to-cart functionality.
- **Address Book**: Manage multiple delivery addresses (add, edit, delete, and set default).
- **Profile & Security**: Update identity, profile picture, and change password with dynamic strength indicators.

### 5. Administrator Dashboard (Admin Panel)
- **Sales Analytics**: Overview of total revenue, order volume, active products, and performance indicators.
- **Order Management**: Order processing, waybill/tracking number assignment, shipment verification, and return handling.
- **Catalog Management**: Full CRUD for books, cover uploads, inventory tracking, and discount pricing.
- **Master Data**: Manage Categories, Authors, and Publishers.
- **Discount Vouchers**: Create vouchers with usage limits, minimum spend, and expiration dates.
- **User Management**: Monitor customer accounts and activity statuses.

### 6. Authentication & Account Security
- Email/password authentication and Google OAuth sign-in.
- Registration with dynamic password strength evaluation (length, uppercase, lowercase, numbers, and symbols).
- Email verification with resend activation link support.
- Secure token-based password reset via email with password visibility toggles.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`) |
| **Build Tool** | [Vite 8](https://vite.dev/) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`) |
| **Routing** | [Vue Router 4](https://router.vuejs.org/) |
| **Icons & Animation** | SVG Icons, [AOS (Animate On Scroll)](https://michalsnik.github.io/aos/) |

---

## Project Structure

```plaintext
bookstore/
├── public/                  # Static assets (logo, demo screenshot, favicon)
│   ├── app.png
│   └── favicon.png
├── src/
│   ├── assets/              # Global styles & Tailwind v4 design tokens
│   │   └── main.css
│   ├── components/          # Reusable modular components
│   │   ├── admin/tabs/      # Admin dashboard modular tabs
│   │   ├── user/tabs/       # Customer dashboard modular tabs
│   │   ├── AppHeader.vue    # Main header & cart toggle bar
│   │   ├── AppFooter.vue    # Website footer
│   │   ├── BookCard.vue     # Book display card
│   │   ├── CartDrawer.vue   # Slide-out shopping cart
│   │   ├── SearchModal.vue  # Book search modal
│   │   └── ...
│   ├── composables/         # Composable state & business logic
│   │   ├── useStore.js      # Global reactive store & auth state
│   │   └── useOrderStatusSSE.js # Realtime SSE listener
│   ├── data/                # Static data & navigation lists
│   ├── lib/                 # Core utilities (API client, formatters, helpers)
│   │   ├── api.js           # REST API client & request interceptor
│   │   ├── assets.js        # Asset resolver helper
│   │   ├── errors.js        # Error message localization
│   │   └── password.js      # Password strength evaluator
│   ├── router/              # Vue Router configuration & route guards
│   │   └── index.js
│   ├── views/               # Application page views
│   │   ├── HomeView.vue
│   │   ├── CatalogView.vue
│   │   ├── BookDetailView.vue
│   │   ├── CheckoutView.vue
│   │   ├── OrderDetailView.vue
│   │   ├── UserDashboardView.vue
│   │   ├── AdminDashboardView.vue
│   │   ├── LoginView.vue
│   │   ├── RegisterView.vue
│   │   └── ResetPasswordView.vue
│   ├── App.vue
│   └── main.js
├── Dockerfile               # Multi-stage Docker build
├── docker-compose.prod.yml  # Production Docker Compose configuration
├── nginx.conf               # Nginx SPA reverse proxy configuration
├── package.json
└── vite.config.js           # Vite build & development proxy configuration
```

---

## Getting Started (Local Development)

### 1. Prerequisites
- [Node.js](https://nodejs.org/) version `>= 20.0.0`
- [npm](https://www.npmjs.com/) version `>= 9.0.0`
- Running Bookstore Backend API server (see [bookstore-be](https://github.com/bubblevy/bookstore-be))

### 2. Clone Repository
```bash
git clone https://github.com/bubblevy/bookstore.git
cd bookstore
```

### 3. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Set your Bookstore Backend API target URL in `.env`:
```env
VITE_API_PROXY_TARGET=http://localhost:8080
```

> **Note**: Vite is configured to proxy `/api`, `/payments`, `/uploads`, `/storage`, `/covers`, and `/categories` directly to `VITE_API_PROXY_TARGET` to prevent CORS issues during local development.

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to: `http://localhost:5173/`

### 6. Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## Running with Docker

This application includes a multi-stage Dockerfile optimized to build and serve the application via an Alpine-based Nginx container:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```
The application will be accessible at `http://localhost:3000`.

---
