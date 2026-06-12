-- SEEDS FETCHED FROM LIVE DATABASE

-- Data for table: public.stores
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('7d176453-c865-406e-a3d3-56c279c3ec68', 'test 1', 'Addagutta Society, Western Hills, Jal Vayu Vihar, Kukatpally, Hyderabad, Telangana 500085', '1234567890', NULL, '2026-06-01T16:49:42.263Z', '36AANCB3874FIZF') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('17df36ab-be0a-4049-8934-16db5b31904f', 'test 2', 'Opp. PVP Square, MG Road, Vijayawada, Andhra Pradesh 520010', '0987654321', NULL, '2026-06-01T16:51:26.892Z', '37AANCB3874F1ZD') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('d283d3dc-a6b7-4b62-8b7f-965db7e838cf', 'Aster Opticals', '123 Main St', '1234567890', NULL, '2026-06-01T17:17:29.867Z', '36AAAAA1111A1Z1') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('55a4119f-3e20-4a22-81e0-5a9c62926e92', 'test 3', '1234567890', '1234567890', NULL, '2026-06-02T03:20:40.256Z', '1234567890') ON CONFLICT DO NOTHING;

-- Data for table: public.users
INSERT INTO public.users (id, email, password_hash, name, role, store_id, is_active, created_at) VALUES ('fe8f278c-69fc-4d5a-86fb-5a2f69dc5550', 'pingilisakethreddy@gmail.com', '$2a$06$lWUr0E9crQ6O9m92aY4uQuqVI8cKcQWioJfWRR2FhtGiey87aCItW', 'Saketh Reddy', 'admin', NULL, true, '2026-05-31T17:08:24.356Z') ON CONFLICT DO NOTHING;
INSERT INTO public.users (id, email, password_hash, name, role, store_id, is_active, created_at) VALUES ('559f480a-c61b-4465-aa31-bda5dfe0ca8f', 'test@bonthus.in', '$2a$06$qdIeTTOaxQ1h4MBCTgbKcOLliVg.5SpVjKfkSSIaLsjvb50ACspb2', 'Test User', 'admin', NULL, true, '2026-06-01T13:15:29.847Z') ON CONFLICT DO NOTHING;

-- Data for table: public.categories
INSERT INTO public.categories (id, name, description, created_at) VALUES ('c2ab4346-70d9-4646-b8b0-8695ffc7133f', 'frames', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('d705f4e3-0ac1-4777-9c38-5249d9a1993c', 'lenses', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('8141eccd-5aca-4ed6-b28b-d4a4be58359a', 'contact_lenses', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('aff04a0c-dbd7-409b-aba9-7a0dede0b5c7', 'accessories', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('d97ddfd9-4baf-4e9f-983f-415be86688b8', 'solutions', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', 'test', NULL, '2026-06-01T17:35:15.954Z') ON CONFLICT DO NOTHING;

-- Data for table: public.products
INSERT INTO public.products (id, sku, upc, name, brand, description, base_price, created_at, category_id, vendor_id) VALUES ('dba4c082-3e0f-4e4e-9937-605da0be15b3', 'PL-062484', NULL, 'test', NULL, NULL, '1000.00', '2026-06-01T17:52:09.539Z', 'f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.products (id, sku, upc, name, brand, description, base_price, created_at, category_id, vendor_id) VALUES ('93fc3ae1-a479-4bfc-84e1-e03b961f8a13', 'PL-800005', NULL, 'test', NULL, NULL, '1000.00', '2026-06-01T17:57:54.430Z', 'f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', NULL) ON CONFLICT DO NOTHING;

-- Data for table: public.vendors
INSERT INTO public.vendors (id, name, contact_name, phone, email, address, created_at) VALUES ('74406024-2036-486f-a654-244a8bc26267', 'test', 'test', '1234567890', 'test@bonthus.in', 'test', '2026-06-06T19:48:59.748Z') ON CONFLICT DO NOTHING;

