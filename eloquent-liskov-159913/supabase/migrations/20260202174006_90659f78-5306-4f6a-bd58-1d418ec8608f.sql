-- Create car_makes table
CREATE TABLE public.car_makes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create car_models table
CREATE TABLE public.car_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  make_id UUID NOT NULL REFERENCES public.car_makes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(make_id, slug)
);

-- Create car_inventory table
CREATE TABLE public.car_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  make_id UUID NOT NULL REFERENCES public.car_makes(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.car_models(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 1900 AND year <= 2030),
  trim TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  mileage INTEGER NOT NULL CHECK (mileage >= 0),
  fuel TEXT NOT NULL CHECK (fuel IN ('gasoline', 'diesel', 'electric', 'hybrid', 'plug-in hybrid')),
  transmission TEXT NOT NULL CHECK (transmission IN ('automatic', 'manual', 'cvt')),
  location_city TEXT NOT NULL,
  location_state TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_car_models_make_id ON public.car_models(make_id);
CREATE INDEX idx_car_inventory_make_id ON public.car_inventory(make_id);
CREATE INDEX idx_car_inventory_model_id ON public.car_inventory(model_id);
CREATE INDEX idx_car_inventory_year ON public.car_inventory(year);
CREATE INDEX idx_car_inventory_price ON public.car_inventory(price);
CREATE INDEX idx_car_inventory_fuel ON public.car_inventory(fuel);
CREATE INDEX idx_car_inventory_transmission ON public.car_inventory(transmission);

-- Enable RLS
ALTER TABLE public.car_makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_inventory ENABLE ROW LEVEL SECURITY;

-- Public read access policies
CREATE POLICY "Car makes are publicly readable" ON public.car_makes FOR SELECT USING (true);
CREATE POLICY "Car models are publicly readable" ON public.car_models FOR SELECT USING (true);
CREATE POLICY "Car inventory is publicly readable" ON public.car_inventory FOR SELECT USING (true);

-- Seed makes
INSERT INTO public.car_makes (name, slug) VALUES
  ('Toyota', 'toyota'),
  ('Tesla', 'tesla'),
  ('Honda', 'honda'),
  ('Ford', 'ford'),
  ('BMW', 'bmw');

-- Seed models for Toyota
INSERT INTO public.car_models (make_id, name, slug)
SELECT m.id, model_name, model_slug
FROM public.car_makes m
CROSS JOIN (VALUES 
  ('Camry', 'camry'),
  ('Corolla', 'corolla'),
  ('RAV4', 'rav4'),
  ('Highlander', 'highlander'),
  ('Tacoma', 'tacoma')
) AS models(model_name, model_slug)
WHERE m.slug = 'toyota';

-- Seed models for Tesla
INSERT INTO public.car_models (make_id, name, slug)
SELECT m.id, model_name, model_slug
FROM public.car_makes m
CROSS JOIN (VALUES 
  ('Model 3', 'model-3'),
  ('Model Y', 'model-y'),
  ('Model S', 'model-s'),
  ('Model X', 'model-x'),
  ('Cybertruck', 'cybertruck')
) AS models(model_name, model_slug)
WHERE m.slug = 'tesla';

-- Seed models for Honda
INSERT INTO public.car_models (make_id, name, slug)
SELECT m.id, model_name, model_slug
FROM public.car_makes m
CROSS JOIN (VALUES 
  ('Civic', 'civic'),
  ('Accord', 'accord'),
  ('CR-V', 'cr-v'),
  ('Pilot', 'pilot'),
  ('HR-V', 'hr-v')
) AS models(model_name, model_slug)
WHERE m.slug = 'honda';

-- Seed models for Ford
INSERT INTO public.car_models (make_id, name, slug)
SELECT m.id, model_name, model_slug
FROM public.car_makes m
CROSS JOIN (VALUES 
  ('F-150', 'f-150'),
  ('Mustang', 'mustang'),
  ('Explorer', 'explorer'),
  ('Bronco', 'bronco'),
  ('Escape', 'escape')
) AS models(model_name, model_slug)
WHERE m.slug = 'ford';

-- Seed models for BMW
INSERT INTO public.car_models (make_id, name, slug)
SELECT m.id, model_name, model_slug
FROM public.car_makes m
CROSS JOIN (VALUES 
  ('3 Series', '3-series'),
  ('5 Series', '5-series'),
  ('X3', 'x3'),
  ('X5', 'x5'),
  ('i4', 'i4')
) AS models(model_name, model_slug)
WHERE m.slug = 'bmw';

-- Seed vehicles with sample data
-- Toyota vehicles
INSERT INTO public.car_inventory (make_id, model_id, year, trim, price, mileage, fuel, transmission, location_city, location_state)
SELECT 
  mk.id, md.id, v.year, v.trim, v.price, v.mileage, v.fuel, v.transmission, v.city, v.state
FROM public.car_makes mk
JOIN public.car_models md ON md.make_id = mk.id
CROSS JOIN (VALUES
  ('camry', 2024, 'XLE', 32500, 5200, 'gasoline', 'automatic', 'Los Angeles', 'CA'),
  ('camry', 2023, 'SE', 28900, 18500, 'gasoline', 'automatic', 'Phoenix', 'AZ'),
  ('camry', 2022, 'LE', 24500, 32000, 'hybrid', 'cvt', 'San Diego', 'CA'),
  ('corolla', 2024, 'XSE', 26800, 3200, 'gasoline', 'cvt', 'Seattle', 'WA'),
  ('corolla', 2023, 'SE', 23500, 15000, 'gasoline', 'manual', 'Portland', 'OR'),
  ('rav4', 2024, 'Limited', 42500, 8500, 'hybrid', 'automatic', 'Denver', 'CO'),
  ('rav4', 2023, 'XLE Premium', 38200, 22000, 'gasoline', 'automatic', 'Austin', 'TX'),
  ('highlander', 2024, 'Platinum', 52800, 4500, 'hybrid', 'automatic', 'Miami', 'FL'),
  ('highlander', 2022, 'XLE', 42000, 35000, 'gasoline', 'automatic', 'Atlanta', 'GA'),
  ('tacoma', 2024, 'TRD Pro', 58500, 2500, 'gasoline', 'automatic', 'Las Vegas', 'NV')
) AS v(model_slug, year, trim, price, mileage, fuel, transmission, city, state)
WHERE mk.slug = 'toyota' AND md.slug = v.model_slug;

-- Tesla vehicles
INSERT INTO public.car_inventory (make_id, model_id, year, trim, price, mileage, fuel, transmission, location_city, location_state)
SELECT 
  mk.id, md.id, v.year, v.trim, v.price, v.mileage, v.fuel, v.transmission, v.city, v.state
FROM public.car_makes mk
JOIN public.car_models md ON md.make_id = mk.id
CROSS JOIN (VALUES
  ('model-3', 2024, 'Long Range', 45990, 2500, 'electric', 'automatic', 'San Francisco', 'CA'),
  ('model-3', 2023, 'Performance', 52990, 12000, 'electric', 'automatic', 'Palo Alto', 'CA'),
  ('model-y', 2024, 'Long Range AWD', 48990, 5500, 'electric', 'automatic', 'Austin', 'TX'),
  ('model-y', 2023, 'Performance', 54990, 18000, 'electric', 'automatic', 'Seattle', 'WA'),
  ('model-s', 2024, 'Plaid', 89990, 3200, 'electric', 'automatic', 'Los Angeles', 'CA'),
  ('model-s', 2022, 'Long Range', 74990, 28000, 'electric', 'automatic', 'Miami', 'FL'),
  ('model-x', 2024, 'Plaid', 99990, 1800, 'electric', 'automatic', 'New York', 'NY'),
  ('model-x', 2023, 'Long Range', 84990, 15000, 'electric', 'automatic', 'Chicago', 'IL'),
  ('cybertruck', 2024, 'Foundation Series', 99990, 500, 'electric', 'automatic', 'Austin', 'TX')
) AS v(model_slug, year, trim, price, mileage, fuel, transmission, city, state)
WHERE mk.slug = 'tesla' AND md.slug = v.model_slug;

-- Honda vehicles
INSERT INTO public.car_inventory (make_id, model_id, year, trim, price, mileage, fuel, transmission, location_city, location_state)
SELECT 
  mk.id, md.id, v.year, v.trim, v.price, v.mileage, v.fuel, v.transmission, v.city, v.state
FROM public.car_makes mk
JOIN public.car_models md ON md.make_id = mk.id
CROSS JOIN (VALUES
  ('civic', 2024, 'Sport', 26500, 4200, 'gasoline', 'cvt', 'San Jose', 'CA'),
  ('civic', 2023, 'EX', 24800, 18500, 'gasoline', 'manual', 'Houston', 'TX'),
  ('civic', 2022, 'Touring', 28900, 32000, 'gasoline', 'cvt', 'Phoenix', 'AZ'),
  ('accord', 2024, 'Sport', 32800, 6500, 'hybrid', 'automatic', 'Dallas', 'TX'),
  ('accord', 2023, 'EX-L', 34500, 15000, 'gasoline', 'cvt', 'Orlando', 'FL'),
  ('cr-v', 2024, 'Sport-L', 38500, 3800, 'hybrid', 'automatic', 'Denver', 'CO'),
  ('cr-v', 2023, 'EX', 33200, 22000, 'gasoline', 'cvt', 'Portland', 'OR'),
  ('pilot', 2024, 'TrailSport', 52800, 5200, 'gasoline', 'automatic', 'Salt Lake City', 'UT'),
  ('pilot', 2022, 'Touring', 45500, 38000, 'gasoline', 'automatic', 'Minneapolis', 'MN'),
  ('hr-v', 2024, 'EX-L', 29500, 2800, 'gasoline', 'cvt', 'Nashville', 'TN')
) AS v(model_slug, year, trim, price, mileage, fuel, transmission, city, state)
WHERE mk.slug = 'honda' AND md.slug = v.model_slug;

-- Ford vehicles
INSERT INTO public.car_inventory (make_id, model_id, year, trim, price, mileage, fuel, transmission, location_city, location_state)
SELECT 
  mk.id, md.id, v.year, v.trim, v.price, v.mileage, v.fuel, v.transmission, v.city, v.state
FROM public.car_makes mk
JOIN public.car_models md ON md.make_id = mk.id
CROSS JOIN (VALUES
  ('f-150', 2024, 'Lariat', 62500, 4500, 'gasoline', 'automatic', 'Detroit', 'MI'),
  ('f-150', 2023, 'XLT', 48900, 18000, 'gasoline', 'automatic', 'Dallas', 'TX'),
  ('f-150', 2024, 'Lightning Platinum', 89900, 2500, 'electric', 'automatic', 'Austin', 'TX'),
  ('mustang', 2024, 'GT Premium', 48500, 3200, 'gasoline', 'manual', 'Los Angeles', 'CA'),
  ('mustang', 2023, 'EcoBoost', 32800, 15000, 'gasoline', 'automatic', 'Phoenix', 'AZ'),
  ('explorer', 2024, 'ST', 58500, 6800, 'gasoline', 'automatic', 'Chicago', 'IL'),
  ('explorer', 2022, 'Limited', 45200, 35000, 'gasoline', 'automatic', 'Atlanta', 'GA'),
  ('bronco', 2024, 'Badlands', 52800, 5500, 'gasoline', 'automatic', 'Denver', 'CO'),
  ('bronco', 2023, 'Outer Banks', 48500, 12000, 'gasoline', 'manual', 'Salt Lake City', 'UT'),
  ('escape', 2024, 'ST-Line', 38500, 4200, 'plug-in hybrid', 'cvt', 'Seattle', 'WA')
) AS v(model_slug, year, trim, price, mileage, fuel, transmission, city, state)
WHERE mk.slug = 'ford' AND md.slug = v.model_slug;

-- BMW vehicles
INSERT INTO public.car_inventory (make_id, model_id, year, trim, price, mileage, fuel, transmission, location_city, location_state)
SELECT 
  mk.id, md.id, v.year, v.trim, v.price, v.mileage, v.fuel, v.transmission, v.city, v.state
FROM public.car_makes mk
JOIN public.car_models md ON md.make_id = mk.id
CROSS JOIN (VALUES
  ('3-series', 2024, '330i xDrive', 48500, 5200, 'gasoline', 'automatic', 'New York', 'NY'),
  ('3-series', 2023, 'M340i', 58900, 12000, 'gasoline', 'automatic', 'Boston', 'MA'),
  ('3-series', 2022, '330e', 45500, 28000, 'plug-in hybrid', 'automatic', 'Philadelphia', 'PA'),
  ('5-series', 2024, '540i xDrive', 62800, 3800, 'gasoline', 'automatic', 'Miami', 'FL'),
  ('5-series', 2023, 'M550i', 78500, 15000, 'gasoline', 'automatic', 'Los Angeles', 'CA'),
  ('x3', 2024, 'xDrive30i', 52500, 4500, 'gasoline', 'automatic', 'San Francisco', 'CA'),
  ('x3', 2023, 'M40i', 62800, 18000, 'gasoline', 'automatic', 'Seattle', 'WA'),
  ('x5', 2024, 'xDrive50e', 78500, 6200, 'plug-in hybrid', 'automatic', 'Chicago', 'IL'),
  ('x5', 2022, 'xDrive45e', 68900, 32000, 'plug-in hybrid', 'automatic', 'Denver', 'CO'),
  ('i4', 2024, 'M50', 68900, 2800, 'electric', 'automatic', 'Austin', 'TX')
) AS v(model_slug, year, trim, price, mileage, fuel, transmission, city, state)
WHERE mk.slug = 'bmw' AND md.slug = v.model_slug;