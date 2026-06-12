-- CONSTRAINTS FETCHED FROM LIVE DATABASE

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE public.users ADD CONSTRAINT "users_email_key" UNIQUE (email);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_store_id_fkey";
ALTER TABLE public.users ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS "user_settings_theme_check";
ALTER TABLE public.user_settings ADD CONSTRAINT "user_settings_theme_check" CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text])));

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS "user_settings_user_id_fkey";
ALTER TABLE public.user_settings ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS "customers_phone_key";
ALTER TABLE public.customers ADD CONSTRAINT "customers_phone_key" UNIQUE (phone);

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS "customers_store_id_fkey";
ALTER TABLE public.customers ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS "prescriptions_customer_id_fkey";
ALTER TABLE public.prescriptions ADD CONSTRAINT "prescriptions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS "prescriptions_optometrist_id_fkey";
ALTER TABLE public.prescriptions ADD CONSTRAINT "prescriptions_optometrist_id_fkey" FOREIGN KEY (optometrist_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_sku_key";
ALTER TABLE public.products ADD CONSTRAINT "products_sku_key" UNIQUE (sku);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_upc_key";
ALTER TABLE public.products ADD CONSTRAINT "products_upc_key" UNIQUE (upc);

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_stock_quantity_check";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_stock_quantity_check" CHECK ((stock_quantity >= 0));

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_low_stock_threshold_check";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_low_stock_threshold_check" CHECK ((low_stock_threshold >= 0));

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "uq_store_product";
ALTER TABLE public.store_inventory ADD CONSTRAINT "uq_store_product" UNIQUE (store_id, product_id);

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_store_id_fkey";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_product_id_fkey";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_status_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_subtotal_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_tax_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_tax_amount_check" CHECK ((tax_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_discount_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_discount_amount_check" CHECK ((discount_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_net_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_net_amount_check" CHECK ((net_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_payment_status_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'fully_paid'::text])));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_order_number_key";
ALTER TABLE public.orders ADD CONSTRAINT "orders_order_number_key" UNIQUE (order_number);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_customer_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_store_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_prescription_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_prescription_id_fkey" FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_quantity_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_unit_price_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_unit_price_check" CHECK ((unit_price >= 0.00));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_assigned_to_id_fkey";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_assigned_to_id_fkey" FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_discount_amount_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_discount_amount_check" CHECK ((discount_amount >= 0.00));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_total_price_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_total_price_check" CHECK ((total_price >= 0.00));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_order_id_fkey";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_product_id_fkey";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_amount_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_amount_check" CHECK ((amount > 0.00));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_payment_method_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'digital_wallet'::text, 'bank_transfer'::text])));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_status_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_order_id_fkey";
ALTER TABLE public.payments ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_type_check";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_type_check" CHECK ((type = ANY (ARRAY['eye_test'::text, 'follow_up'::text, 'staff_meeting'::text, 'task'::text])));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_status_check";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_store_id_fkey";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS "notifications_type_check";
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_type_check" CHECK ((type = ANY (ARRAY['order_status'::text, 'stock_alert'::text, 'customer_followup'::text, 'system'::text])));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE public.users ADD CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'optometrist'::text, 'sales'::text, 'manager'::text])));

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS "categories_name_key";
ALTER TABLE public.categories ADD CONSTRAINT "categories_name_key" UNIQUE (name);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
ALTER TABLE public.products ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "store_requisitions_status_check";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "store_requisitions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'fulfilled'::text, 'cancelled'::text])));

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "store_requisitions_request_number_key";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "store_requisitions_request_number_key" UNIQUE (request_number);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_from_store_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_from_store_fkey" FOREIGN KEY (from_store_id) REFERENCES stores(id);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_to_store_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_to_store_fkey" FOREIGN KEY (to_store_id) REFERENCES stores(id);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_requested_by_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_requested_by_fkey" FOREIGN KEY (requested_by_id) REFERENCES users(id);

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "store_requisition_items_quantity_check";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "store_requisition_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "req_items_requisition_fkey";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "req_items_requisition_fkey" FOREIGN KEY (requisition_id) REFERENCES store_requisitions(id) ON DELETE CASCADE;

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "req_items_product_fkey";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "req_items_product_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_status_check";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_status_check" CHECK ((status = ANY (ARRAY['preparing'::text, 'in_transit'::text, 'delivered'::text, 'exception'::text])));

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_tracking_number_key";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_tracking_number_key" UNIQUE (tracking_number);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_origin_store_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_origin_store_fkey" FOREIGN KEY (origin_store_id) REFERENCES stores(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_destination_store_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_destination_store_fkey" FOREIGN KEY (destination_store_id) REFERENCES stores(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_vendor_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_vendor_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_requisition_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_requisition_fkey" FOREIGN KEY (requisition_id) REFERENCES store_requisitions(id);

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_quantity_check";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_shipment_fkey";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_shipment_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_product_fkey";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_product_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_vendor_id_fkey";
ALTER TABLE public.products ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id);

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_status_check";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_barcode_key";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_barcode_key" UNIQUE (barcode);

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_product_id_fkey";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_status_check";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_status_check" CHECK ((status = ANY (ARRAY['present'::text, 'late'::text, 'half_day'::text, 'absent'::text])));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_user_id_fkey";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_store_id_fkey";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_qr_code_token_key";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_qr_code_token_key" UNIQUE (qr_code_token);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_store_id_fkey";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_qr_type_check";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_qr_type_check" CHECK ((qr_type = ANY (ARRAY['check_in'::text, 'check_out'::text])));

