-- TRIGGERS FETCHED FROM LIVE DATABASE

-- Trigger: set_timestamp_user_settings on user_settings
DROP TRIGGER IF EXISTS "set_timestamp_user_settings" ON public.user_settings;
CREATE TRIGGER set_timestamp_user_settings BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger: set_timestamp_orders on orders
DROP TRIGGER IF EXISTS "set_timestamp_orders" ON public.orders;
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

