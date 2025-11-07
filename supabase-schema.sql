-- =====================================================================
--  XocoCafe - Esquema base para Supabase/PostgreSQL
--  Este script alinea la estructura de la base de datos con los modelos
--  definidos en prisma/schema.prisma (migración manual inicial).
--  Ejecuta en el esquema "public".
-- =====================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- Tabla principal de usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  "clientId" TEXT NOT NULL UNIQUE,
  "walletAddress" TEXT,
  "authProvider" TEXT NOT NULL DEFAULT 'email',
  "googleId" TEXT UNIQUE,

  -- Datos personales cifrados
  "firstNameEncrypted" TEXT,
  "firstNameIv" TEXT,
  "firstNameTag" TEXT,
  "firstNameSalt" TEXT,
  "lastNameEncrypted" TEXT,
  "lastNameIv" TEXT,
  "lastNameTag" TEXT,
  "lastNameSalt" TEXT,
  "phoneEncrypted" TEXT,
  "phoneIv" TEXT,
  "phoneTag" TEXT,
  "phoneSalt" TEXT,

  -- Datos sin cifrar
  city TEXT,
  country TEXT,

  -- Consentimientos
  "termsAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "privacyAccepted" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketingEmail" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketingSms" BOOLEAN NOT NULL DEFAULT FALSE,
  "marketingPush" BOOLEAN NOT NULL DEFAULT FALSE,
  "consentUpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Auditoría / retención
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastLoginAt" TIMESTAMPTZ,
  "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "dataRetentionUntil" TIMESTAMPTZ,

  -- Analítica pasiva
  "registrationSource" TEXT,
  "userAgent" TEXT,
  "ipAddress" INET,
  "referrerUrl" TEXT,
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,
  "utmTerm" TEXT,
  "utmContent" TEXT,

  -- Detección de dispositivo/idioma
  "detectedLanguage" TEXT DEFAULT 'es',
  "deviceType" TEXT,
  "browserLanguage" TEXT,
  timezone TEXT,
  platform TEXT,

  -- Métricas de comportamiento
  "totalSessions" INTEGER NOT NULL DEFAULT 0,
  "totalPageViews" INTEGER NOT NULL DEFAULT 0,
  "avgSessionDuration" INTEGER NOT NULL DEFAULT 0,

  -- Datos adicionales
  "avatarUrl" TEXT,
  "favoriteColdDrink" TEXT,
  "favoriteHotDrink" TEXT,
  "favoriteFood" TEXT,

  -- Programa de lealtad
  "weeklyCoffeeCount" INTEGER NOT NULL DEFAULT 0,
  "monthlyMetrics" JSONB,

  -- Segmentación
  "userSegment" TEXT,
  "acquisitionChannel" TEXT,
  "lifetimeValue" NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
CREATE INDEX IF NOT EXISTS users_client_id_idx ON public.users ("clientId");
CREATE INDEX IF NOT EXISTS users_google_id_idx ON public.users ("googleId");
CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users ("createdAt");

-- Trigger para updatedAt
CREATE OR REPLACE FUNCTION public.touch_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch_updated_at ON public.users;
CREATE TRIGGER trg_users_touch_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

-- ---------------------------------------------------------------------
-- Direcciones de usuario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addresses (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  "postalCode" TEXT NOT NULL,
  country TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS addresses_user_id_idx ON public.addresses ("userId");

DROP TRIGGER IF EXISTS trg_addresses_touch_updated_at ON public.addresses;
CREATE TRIGGER trg_addresses_touch_updated_at
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

-- ---------------------------------------------------------------------
-- Pedidos y artículos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "orderNumber" TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders ("userId");

DROP TRIGGER IF EXISTS trg_orders_touch_updated_at ON public.orders;
CREATE TRIGGER trg_orders_touch_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  discount NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items ("orderId");

-- Métricas de consumo por usuario
CREATE TABLE IF NOT EXISTS public.user_consumption_metrics (
  "userId" TEXT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  "beverageCount" INTEGER NOT NULL DEFAULT 0,
  "foodCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.increment_consumption_metrics()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
  beverage_total INTEGER := 0;
  food_total INTEGER := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    FOR item IN SELECT "productId", quantity FROM public.order_items WHERE "orderId" = NEW.id LOOP
      IF item."productId" ILIKE '%food%' THEN
        food_total := food_total + COALESCE(item.quantity, 0);
      ELSE
        beverage_total := beverage_total + COALESCE(item.quantity, 0);
      END IF;
    END LOOP;

    IF beverage_total > 0 OR food_total > 0 THEN
      UPDATE public.user_consumption_metrics
        SET "beverageCount" = "beverageCount" + beverage_total,
            "foodCount" = "foodCount" + food_total,
            "updatedAt" = NOW()
        WHERE "userId" = NEW."userId";

      IF NOT FOUND THEN
        INSERT INTO public.user_consumption_metrics ("userId", "beverageCount", "foodCount", "updatedAt")
        VALUES (NEW."userId", beverage_total, food_total, NOW());
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_consumption_metrics ON public.orders;
CREATE TRIGGER trg_orders_consumption_metrics
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_consumption_metrics();

-- ---------------------------------------------------------------------
-- Programa de lealtad
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  "orderId" TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  "expiresAt" TIMESTAMPTZ,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS loyalty_points_user_id_idx ON public.loyalty_points ("userId");

-- ---------------------------------------------------------------------
-- Recuperación de contraseña
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "verifiedAt" TIMESTAMPTZ,
  "consumedAt" TIMESTAMPTZ,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_codes_user_id_idx ON public.password_reset_codes ("userId");
CREATE INDEX IF NOT EXISTS password_reset_codes_email_idx ON public.password_reset_codes (email);
CREATE INDEX IF NOT EXISTS password_reset_codes_code_idx ON public.password_reset_codes (code);

-- ---------------------------------------------------------------------
-- Sesiones
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  "ipAddress" INET,
  "userAgent" TEXT,
  "deviceType" TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  "sessionDuration" INTEGER NOT NULL DEFAULT 0,
  "pageViews" INTEGER NOT NULL DEFAULT 0,
  "lastActivityAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions ("userId");
CREATE INDEX IF NOT EXISTS sessions_token_idx ON public.sessions (token);

-- ---------------------------------------------------------------------
-- Logs de retención de datos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.data_retention_logs (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" INET,
  "userAgent" TEXT,
  "adminUserId" TEXT
);

CREATE INDEX IF NOT EXISTS data_retention_logs_user_id_idx
  ON public.data_retention_logs ("userId");

-- ---------------------------------------------------------------------
-- Analítica de páginas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_analytics (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "sessionId" TEXT REFERENCES public.sessions(id) ON DELETE SET NULL,
  "pagePath" TEXT NOT NULL,
  "pageTitle" TEXT,
  "pageCategory" TEXT,
  "timeOnPage" INTEGER NOT NULL DEFAULT 0,
  "scrollDepth" INTEGER NOT NULL DEFAULT 0,
  bounce BOOLEAN NOT NULL DEFAULT FALSE,
  "exitPage" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" INET,
  "userAgent" TEXT,
  "referrerUrl" TEXT,
  "conversionEvent" TEXT,
  "conversionValue" NUMERIC(10,2)
);

CREATE INDEX IF NOT EXISTS page_analytics_user_id_idx ON public.page_analytics ("userId");
CREATE INDEX IF NOT EXISTS page_analytics_session_id_idx ON public.page_analytics ("sessionId");

-- ---------------------------------------------------------------------
-- Eventos de conversión
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversion_events (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  "sessionId" TEXT REFERENCES public.sessions(id) ON DELETE SET NULL,
  "eventType" TEXT NOT NULL,
  "eventCategory" TEXT,
  "eventValue" NUMERIC(10,2),
  "eventData" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" INET,
  "userAgent" TEXT,
  "pagePath" TEXT
);

CREATE INDEX IF NOT EXISTS conversion_events_user_id_idx ON public.conversion_events ("userId");
CREATE INDEX IF NOT EXISTS conversion_events_session_id_idx ON public.conversion_events ("sessionId");

-- ---------------------------------------------------------------------
-- Productos y reseñas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  subcategory TEXT,
  price NUMERIC(10,2) NOT NULL,
  cost NUMERIC(10,2),
  "totalSales" INTEGER NOT NULL DEFAULT 0,
  "totalRevenue" NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  "avgRating" NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

DROP TRIGGER IF EXISTS trg_products_touch_updated_at ON public.products;
CREATE TRIGGER trg_products_touch_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

CREATE TABLE IF NOT EXISTS public.reviews (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  "orderId" TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
  "totalVotes" INTEGER NOT NULL DEFAULT 0,
  "verifiedPurchase" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_reviews_touch_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_touch_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews ("userId");
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews ("productId");

-- ---------------------------------------------------------------------
-- Funciones de métricas automáticas
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_profile_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'page_analytics' THEN
    UPDATE public.users
      SET "lastActivityAt" = NOW(),
          "totalPageViews" = COALESCE("totalPageViews", 0) + 1
    WHERE id = NEW."userId";
  ELSIF TG_TABLE_NAME = 'sessions' THEN
    UPDATE public.users
      SET "totalSessions" = COALESCE("totalSessions", 0) + 1,
          "lastLoginAt" = NOW(),
          "lastActivityAt" = NOW()
    WHERE id = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.calculate_user_segment()
RETURNS TRIGGER AS $$
DECLARE
  days_since_last_login INTEGER := 9999;
  total_orders INTEGER := 0;
BEGIN
  SELECT COALESCE(EXTRACT(DAY FROM NOW() - u."lastLoginAt")::INT, 9999)
    INTO days_since_last_login
  FROM public.users u WHERE u.id = NEW.id;

  SELECT COUNT(*) INTO total_orders
  FROM public.orders o WHERE o."userId" = NEW.id;

  IF days_since_last_login <= 7 THEN
    NEW."userSegment" := 'active';
  ELSIF days_since_last_login <= 30 THEN
    NEW."userSegment" := 'engaged';
  ELSIF days_since_last_login <= 90 THEN
    NEW."userSegment" := 'at_risk';
  ELSE
    NEW."userSegment" := 'churned';
  END IF;

  IF total_orders >= 10 THEN
    NEW."userSegment" := 'vip';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_metrics_page ON public.page_analytics;
CREATE TRIGGER update_profile_metrics_page
  AFTER INSERT ON public.page_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_metrics();

DROP TRIGGER IF EXISTS update_profile_metrics_session ON public.sessions;
CREATE TRIGGER update_profile_metrics_session
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_metrics();

DROP TRIGGER IF EXISTS calculate_user_segment_trigger ON public.users;
CREATE TRIGGER calculate_user_segment_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.calculate_user_segment();

-- ---------------------------------------------------------------------
-- Sincronización con auth.users (opcional si se usa Supabase Auth)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_last_login_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.users
      SET "lastLoginAt" = NEW.last_sign_in_at,
          "lastActivityAt" = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_last_login_from_auth ON auth.users;
CREATE TRIGGER trg_sync_last_login_from_auth
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_last_login_from_auth();

-- ---------------------------------------------------------------------
-- Reservaciones de clientes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "branchId" TEXT NOT NULL,
  "reservationDate" DATE NOT NULL,
  "reservationTime" TEXT NOT NULL,
  "peopleCount" INTEGER NOT NULL CHECK ("peopleCount" > 0),
  message TEXT,
  "preOrderItems" TEXT,
  "linkedOrderId" TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  "branchNumber" TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  "reservationCode" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_unique_slot_idx
  ON public.reservations ("branchId", "reservationDate", "reservationTime");

CREATE INDEX IF NOT EXISTS reservations_user_id_idx
  ON public.reservations ("userId");

DROP TRIGGER IF EXISTS trg_reservations_touch_updated_at ON public.reservations;
CREATE TRIGGER trg_reservations_touch_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_users_updated_at();

-- ---------------------------------------------------------------------
-- Reservaciones no completadas / vencidas
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reservation_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "originalReservationId" UUID NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "reservationCode" TEXT,
  "reservationDate" DATE NOT NULL,
  "reservationTime" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "peopleCount" INTEGER NOT NULL,
  message TEXT,
  "preOrderItems" TEXT,
  "linkedOrderId" TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  "branchNumber" TEXT,
  status TEXT NOT NULL,
  "archivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "cleanupAt" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS reservation_failures_user_idx ON public.reservation_failures ("userId");
CREATE INDEX IF NOT EXISTS reservation_failures_cleanup_idx ON public.reservation_failures ("cleanupAt");

-- =====================================================================
--  Fin del script
-- =====================================================================
