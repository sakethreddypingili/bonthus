INSERT INTO public.frame_catalog (code, name, brand, frame_type, price, is_b1g1, description) VALUES
('FR-1', 'Bonthus Frame', 'Bonthus', 'frame', 1999.00, true, 'Premium handcrafted Bonthus eyewear frame. Buy 1 Get 1 Free.'),
('FR-2', 'Jas Harlon Frame', 'Jas Harlon', 'frame', 999.00, true, 'Stylish and lightweight Jas Harlon designer frame. Buy 1 Get 1 Free.'),
('FIT-1', 'Fitting Charges', 'Fitting', 'fitting', 199.00, false, 'Precision lens fitting and alignment service charge.')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    frame_type = EXCLUDED.frame_type,
    price = EXCLUDED.price,
    is_b1g1 = EXCLUDED.is_b1g1,
    description = EXCLUDED.description;
