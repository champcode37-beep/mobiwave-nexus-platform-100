-- Insert sample data hub models for testing
INSERT INTO public.data_hub_models (user_id, name, description, fields, is_active) 
VALUES 
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'Customer Database', 'Customer information and details', '[
    {"id": "1", "name": "first_name", "type": "text"},
    {"id": "2", "name": "last_name", "type": "text"},
    {"id": "3", "name": "email", "type": "email"},
    {"id": "4", "name": "phone", "type": "phone"},
    {"id": "5", "name": "company", "type": "text"}
  ]'::jsonb, true),
  ('d10e2a2e-7d61-40c6-8f1b-c2b928538bae', 'Product Inventory', 'Product catalog and inventory tracking', '[
    {"id": "1", "name": "product_name", "type": "text"},
    {"id": "2", "name": "sku", "type": "text"},
    {"id": "3", "name": "price", "type": "number"},
    {"id": "4", "name": "quantity", "type": "number"},
    {"id": "5", "name": "category", "type": "text"}
  ]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Insert some sample records for the customer database model
INSERT INTO public.data_hub_records (user_id, model_id, data, is_active)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  dhm.id,
  '{"first_name": "John", "last_name": "Doe", "email": "john.doe@example.com", "phone": "+254700000001", "company": "Tech Corp"}'::jsonb,
  true
FROM public.data_hub_models dhm 
WHERE dhm.name = 'Customer Database' 
AND dhm.user_id = 'd10e2a2e-7d61-40c6-8f1b-c2b928538bae'
ON CONFLICT DO NOTHING;

INSERT INTO public.data_hub_records (user_id, model_id, data, is_active)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  dhm.id,
  '{"first_name": "Jane", "last_name": "Smith", "email": "jane.smith@example.com", "phone": "+254700000002", "company": "Design Studio"}'::jsonb,
  true
FROM public.data_hub_models dhm 
WHERE dhm.name = 'Customer Database' 
AND dhm.user_id = 'd10e2a2e-7d61-40c6-8f1b-c2b928538bae'
ON CONFLICT DO NOTHING;

-- Insert some sample records for the product inventory model
INSERT INTO public.data_hub_records (user_id, model_id, data, is_active)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  dhm.id,
  '{"product_name": "Laptop", "sku": "LAP001", "price": 50000, "quantity": 25, "category": "Electronics"}'::jsonb,
  true
FROM public.data_hub_models dhm 
WHERE dhm.name = 'Product Inventory' 
AND dhm.user_id = 'd10e2a2e-7d61-40c6-8f1b-c2b928538bae'
ON CONFLICT DO NOTHING;

INSERT INTO public.data_hub_records (user_id, model_id, data, is_active)
SELECT 
  'd10e2a2e-7d61-40c6-8f1b-c2b928538bae',
  dhm.id,
  '{"product_name": "Office Chair", "sku": "CHR001", "price": 15000, "quantity": 50, "category": "Furniture"}'::jsonb,
  true
FROM public.data_hub_models dhm 
WHERE dhm.name = 'Product Inventory' 
AND dhm.user_id = 'd10e2a2e-7d61-40c6-8f1b-c2b928538bae'
ON CONFLICT DO NOTHING;