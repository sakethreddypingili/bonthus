-- TRIGGERS

-- Apply updated_at trigger to user_settings
DROP TRIGGER IF EXISTS set_timestamp_user_settings ON user_settings;
CREATE TRIGGER set_timestamp_user_settings
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Apply updated_at trigger to orders
DROP TRIGGER IF EXISTS set_timestamp_orders ON orders;
CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Apply trigger to auth.users
DROP TRIGGER IF EXISTS tr_auth_user_link ON auth.users;
CREATE TRIGGER tr_auth_user_link
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_link();