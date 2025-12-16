-- Simplified SQLite schema derived from Supabase schema.
-- This keeps the core tables so the app can run locally without Postgres extensions.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT,
  clientId TEXT NOT NULL UNIQUE,
  walletAddress TEXT,
  authProvider TEXT NOT NULL DEFAULT 'email',
  googleId TEXT UNIQUE,
  firstNameEncrypted TEXT,
  firstNameIv TEXT,
  firstNameTag TEXT,
  firstNameSalt TEXT,
  lastNameEncrypted TEXT,
  lastNameIv TEXT,
  lastNameTag TEXT,
  lastNameSalt TEXT,
  phoneEncrypted TEXT,
  phoneIv TEXT,
  phoneTag TEXT,
  phoneSalt TEXT,
  firstName TEXT,
  lastName TEXT,
  phone TEXT,
  city TEXT,
  country TEXT,
  termsAccepted INTEGER NOT NULL DEFAULT 0,
  privacyAccepted INTEGER NOT NULL DEFAULT 0,
  marketingEmail INTEGER NOT NULL DEFAULT 0,
  marketingSms INTEGER NOT NULL DEFAULT 0,
  marketingPush INTEGER NOT NULL DEFAULT 0,
  consentUpdatedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastLoginAt TEXT,
  lastActivityAt TEXT,
  dataRetentionUntil TEXT,
  registrationSource TEXT,
  userAgent TEXT,
  ipAddress TEXT,
  referrerUrl TEXT,
  utmSource TEXT,
  utmMedium TEXT,
  utmCampaign TEXT,
  utmTerm TEXT,
  utmContent TEXT,
  detectedLanguage TEXT,
  deviceType TEXT,
  browserLanguage TEXT,
  timezone TEXT,
  platform TEXT,
  totalSessions INTEGER NOT NULL DEFAULT 0,
  totalPageViews INTEGER NOT NULL DEFAULT 0,
  avgSessionDuration INTEGER NOT NULL DEFAULT 0,
  avatarUrl TEXT,
  favoriteColdDrink TEXT,
  favoriteHotDrink TEXT,
  favoriteFood TEXT,
  weeklyCoffeeCount INTEGER NOT NULL DEFAULT 0,
  monthlyMetrics TEXT,
  userSegment TEXT,
  acquisitionChannel TEXT,
  lifetimeValue REAL NOT NULL DEFAULT 0,
  loyaltyActivatedAt TEXT
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postalCode TEXT NOT NULL,
  country TEXT NOT NULL,
  isDefault INTEGER NOT NULL DEFAULT 0,
  label TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id) ON DELETE SET NULL,
  orderNumber TEXT UNIQUE,
  status TEXT NOT NULL,
  total REAL NOT NULL,
  subtotal REAL,
  vatAmount REAL,
  vatPercent REAL,
  tipAmount REAL,
  tipPercent REAL,
  deliveryTipAmount REAL,
  deliveryTipPercent REAL,
  currency TEXT DEFAULT 'MXN',
  items TEXT DEFAULT '[]',
  totals TEXT DEFAULT '{}',
  metadata TEXT,
  notes TEXT,
  message TEXT,
  instructions TEXT,
  sourceType TEXT DEFAULT 'pos',
  customer_name TEXT,
  pos_customer_id TEXT,
  shipping_contact_phone TEXT,
  shipping_contact_is_whatsapp INTEGER DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  orderId TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  productId TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_points (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  orderId TEXT REFERENCES orders(id) ON DELETE SET NULL,
  expiresAt TEXT,
  metadata TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT REFERENCES users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ipAddress TEXT,
  userAgent TEXT,
  deviceType TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  sessionDuration INTEGER NOT NULL DEFAULT 0,
  pageViews INTEGER NOT NULL DEFAULT 0,
  lastActivityAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  productId TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  price REAL NOT NULL,
  cost REAL,
  totalSales INTEGER NOT NULL DEFAULT 0,
  totalRevenue REAL NOT NULL DEFAULT 0,
  avgRating REAL NOT NULL DEFAULT 0,
  reviewCount INTEGER NOT NULL DEFAULT 0,
  stockQuantity INTEGER NOT NULL DEFAULT 0,
  lowStockThreshold INTEGER NOT NULL DEFAULT 10,
  isActive INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  productId TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  orderId TEXT REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  helpfulVotes INTEGER NOT NULL DEFAULT 0,
  totalVotes INTEGER NOT NULL DEFAULT 0,
  verifiedPurchase INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_consumption (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  orderId TEXT REFERENCES orders(id) ON DELETE SET NULL,
  reservationId TEXT,
  category TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'pos',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  reservationCode TEXT UNIQUE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peopleCount INTEGER NOT NULL DEFAULT 1,
  reservationDate TEXT NOT NULL,
  reservationTime TEXT NOT NULL,
  branchId TEXT DEFAULT 'MATRIZ',
  branchNumber TEXT,
  message TEXT,
  preOrderItems TEXT,
  linkedOrderId TEXT REFERENCES orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sourceType TEXT DEFAULT 'cliente',
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticketCode TEXT UNIQUE,
  orderId TEXT REFERENCES orders(id) ON DELETE CASCADE,
  userId TEXT REFERENCES users(id) ON DELETE SET NULL,
  branchId TEXT DEFAULT 'MATRIZ',
  currency TEXT DEFAULT 'MXN',
  tipPercent REAL DEFAULT 0,
  tipAmount REAL DEFAULT 0,
  paymentMethod TEXT,
  paymentDetails TEXT,
  qrPayload TEXT,
  qrImageUrl TEXT,
  ticketImageUrl TEXT,
  emailSentAt TEXT,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  orderId TEXT REFERENCES orders(id) ON DELETE CASCADE,
  ticketId TEXT REFERENCES tickets(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'MXN',
  status TEXT DEFAULT 'initiated',
  tipAmount REAL DEFAULT 0,
  tipPercent REAL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed product to match Supabase script
INSERT OR IGNORE INTO products (
  id, productId, name, category, subcategory, price, cost,
  totalSales, totalRevenue, avgRating, reviewCount,
  stockQuantity, lowStockThreshold, createdAt, updatedAt, isActive
) VALUES (
  'feedback-general', 'feedback-general', 'Feedback general',
  'feedback', 'comentarios', 0, 0,
  0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
);
