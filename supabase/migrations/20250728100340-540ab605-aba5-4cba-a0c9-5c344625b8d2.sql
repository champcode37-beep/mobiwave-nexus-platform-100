-- Create admin profile for existing super_admin user
INSERT INTO admin_profiles (user_id, role) 
SELECT '9827ca0a-a689-40aa-9744-53ec16000a92', 'super_admin'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_profiles WHERE user_id = '9827ca0a-a689-40aa-9744-53ec16000a92'
);

INSERT INTO admin_security_settings (user_id)
SELECT '9827ca0a-a689-40aa-9744-53ec16000a92'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_security_settings WHERE user_id = '9827ca0a-a689-40aa-9744-53ec16000a92'
);

INSERT INTO admin_preferences (user_id)
SELECT '9827ca0a-a689-40aa-9744-53ec16000a92'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_preferences WHERE user_id = '9827ca0a-a689-40aa-9744-53ec16000a92'
);