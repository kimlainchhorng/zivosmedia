-- Make owner_id nullable for demo restaurants without an actual owner
ALTER TABLE public.restaurants ALTER COLUMN owner_id DROP NOT NULL;

-- Seed demo restaurants with realistic data (using correct column names)
INSERT INTO public.restaurants (id, name, description, address, cuisine_type, phone, email, logo_url, cover_image_url, rating, avg_prep_time, is_open, status)
VALUES
  ('d1a2b3c4-5678-9012-3456-789012345601', 'Sakura Sushi Bar', 'Authentic Japanese cuisine with fresh sushi and sashimi', '123 Main Street, New York, NY 10001', 'Japanese', '(555) 123-4567', 'info@sakurasushi.com', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=200', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800', 4.8, 35, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Bella Italia', 'Traditional Italian recipes made with love', '456 Oak Avenue, New York, NY 10002', 'Italian', '(555) 234-5678', 'ciao@bellaitalia.com', 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=200', 'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800', 4.6, 40, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Taco Loco', 'Mexican street food at its finest', '789 Broadway, New York, NY 10003', 'Mexican', '(555) 345-6789', 'hola@tacoloco.com', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800', 4.5, 25, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345604', 'Golden Dragon', 'Authentic Chinese cuisine with family recipes', '321 Park Place, New York, NY 10004', 'Chinese', '(555) 456-7890', 'order@goldendragon.com', 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=200', 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800', 4.4, 30, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Burger Palace', 'Gourmet burgers crafted to perfection', '555 5th Avenue, New York, NY 10005', 'American', '(555) 567-8901', 'info@burgerpalace.com', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800', 4.7, 20, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Spice Route', 'Flavorful Indian cuisine with aromatic spices', '888 Lexington Ave, New York, NY 10006', 'Indian', '(555) 678-9012', 'namaste@spiceroute.com', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800', 4.5, 45, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Mediterranean Grill', 'Fresh Mediterranean flavors and grilled specialties', '100 West 42nd St, New York, NY 10007', 'Mediterranean', '(555) 789-0123', 'hello@medgrill.com', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=200', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800', 4.6, 35, true, 'active'),
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Thai Orchid', 'Authentic Thai dishes with fresh ingredients', '200 Canal Street, New York, NY 10008', 'Thai', '(555) 890-1234', 'sawadee@thaiorchid.com', 'https://images.unsplash.com/photo-1562565652-a0d98f0c59eb4?w=200', 'https://images.unsplash.com/photo-1562565652-a0d98f0c59eb4?w=800', 4.7, 30, true, 'active')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  cuisine_type = EXCLUDED.cuisine_type,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  logo_url = EXCLUDED.logo_url,
  cover_image_url = EXCLUDED.cover_image_url,
  rating = EXCLUDED.rating,
  avg_prep_time = EXCLUDED.avg_prep_time,
  is_open = EXCLUDED.is_open,
  status = EXCLUDED.status;

-- Seed menu items for each restaurant
INSERT INTO public.menu_items (restaurant_id, name, description, price, category, image_url, is_available, is_featured, preparation_time)
VALUES
  -- Sakura Sushi Bar
  ('d1a2b3c4-5678-9012-3456-789012345601', 'Dragon Roll', 'Eel, cucumber, avocado topped with eel sauce', 16.99, 'Specialty Rolls', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400', true, true, 15),
  ('d1a2b3c4-5678-9012-3456-789012345601', 'Salmon Sashimi', 'Fresh Atlantic salmon, 8 pieces', 14.99, 'Sashimi', 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=400', true, true, 10),
  ('d1a2b3c4-5678-9012-3456-789012345601', 'California Roll', 'Crab, avocado, cucumber with sesame seeds', 9.99, 'Classic Rolls', 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400', true, false, 12),
  ('d1a2b3c4-5678-9012-3456-789012345601', 'Miso Soup', 'Traditional Japanese soup with tofu and seaweed', 3.99, 'Appetizers', 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400', true, false, 5),
  ('d1a2b3c4-5678-9012-3456-789012345601', 'Edamame', 'Steamed soybeans with sea salt', 5.99, 'Appetizers', 'https://images.unsplash.com/photo-1564894809611-1742fc40ed80?w=400', true, false, 5),
  
  -- Bella Italia
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Margherita Pizza', 'Fresh mozzarella, tomato sauce, basil', 15.99, 'Pizza', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=400', true, true, 20),
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Spaghetti Carbonara', 'Pasta with pancetta, egg, parmesan cream sauce', 17.99, 'Pasta', 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400', true, true, 18),
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Chicken Parmigiana', 'Breaded chicken with marinara and melted cheese', 19.99, 'Entrees', 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400', true, false, 25),
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Tiramisu', 'Classic Italian dessert with espresso and mascarpone', 8.99, 'Desserts', 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400', true, true, 5),
  ('d1a2b3c4-5678-9012-3456-789012345602', 'Bruschetta', 'Grilled bread with tomatoes, garlic, and basil', 7.99, 'Appetizers', 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400', true, false, 8),
  
  -- Taco Loco
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Street Tacos', 'Three tacos with choice of meat, cilantro, onions', 10.99, 'Tacos', 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400', true, true, 12),
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Burrito Bowl', 'Rice, beans, meat, guac, sour cream, cheese', 12.99, 'Bowls', 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400', true, true, 15),
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Quesadilla', 'Flour tortilla with melted cheese and choice of filling', 9.99, 'Quesadillas', 'https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400', true, false, 10),
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Guacamole & Chips', 'Fresh guacamole with crispy tortilla chips', 6.99, 'Appetizers', 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400', true, false, 5),
  ('d1a2b3c4-5678-9012-3456-789012345603', 'Churros', 'Fried dough with cinnamon sugar and chocolate sauce', 5.99, 'Desserts', 'https://images.unsplash.com/photo-1624371414361-e670edf4898a?w=400', true, false, 8),
  
  -- Golden Dragon
  ('d1a2b3c4-5678-9012-3456-789012345604', 'General Tso Chicken', 'Crispy chicken in sweet and spicy sauce', 14.99, 'Entrees', 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400', true, true, 18),
  ('d1a2b3c4-5678-9012-3456-789012345604', 'Beef & Broccoli', 'Tender beef with fresh broccoli in garlic sauce', 15.99, 'Entrees', 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400', true, true, 15),
  ('d1a2b3c4-5678-9012-3456-789012345604', 'Fried Rice', 'Wok-fried rice with vegetables and egg', 10.99, 'Rice & Noodles', 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400', true, false, 12),
  ('d1a2b3c4-5678-9012-3456-789012345604', 'Spring Rolls', 'Crispy vegetable spring rolls with sweet sauce', 6.99, 'Appetizers', 'https://images.unsplash.com/photo-1548507200-da09a03d1568?w=400', true, false, 8),
  ('d1a2b3c4-5678-9012-3456-789012345604', 'Wonton Soup', 'Pork wontons in savory broth', 5.99, 'Soups', 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400', true, false, 10),
  
  -- Burger Palace
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Classic Smash Burger', 'Double patty, American cheese, special sauce', 12.99, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400', true, true, 12),
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Bacon BBQ Burger', 'Crispy bacon, BBQ sauce, cheddar, onion rings', 14.99, 'Burgers', 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400', true, true, 15),
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Truffle Fries', 'Hand-cut fries with truffle oil and parmesan', 7.99, 'Sides', 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=400', true, true, 8),
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Milkshake', 'Thick creamy shake - vanilla, chocolate, or strawberry', 6.99, 'Drinks', 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400', true, false, 5),
  ('d1a2b3c4-5678-9012-3456-789012345605', 'Onion Rings', 'Beer-battered crispy onion rings', 5.99, 'Sides', 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400', true, false, 8),
  
  -- Spice Route
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Butter Chicken', 'Tender chicken in creamy tomato curry', 16.99, 'Curries', 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400', true, true, 20),
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Lamb Biryani', 'Aromatic basmati rice with spiced lamb', 18.99, 'Rice Dishes', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400', true, true, 25),
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Samosas', 'Crispy pastries with spiced potatoes and peas', 5.99, 'Appetizers', 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400', true, false, 8),
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Garlic Naan', 'Fluffy bread with garlic butter', 3.99, 'Breads', 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400', true, false, 5),
  ('d1a2b3c4-5678-9012-3456-789012345606', 'Mango Lassi', 'Creamy yogurt drink with mango', 4.99, 'Drinks', 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400', true, false, 5),
  
  -- Mediterranean Grill
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Lamb Kebab Plate', 'Grilled lamb skewers with rice and salad', 18.99, 'Grilled Plates', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400', true, true, 22),
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Falafel Wrap', 'Crispy falafel with hummus and vegetables', 11.99, 'Wraps', 'https://images.unsplash.com/photo-1593560704563-f176a2eb61db?w=400', true, true, 12),
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Hummus Platter', 'Creamy hummus with warm pita bread', 7.99, 'Appetizers', 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400', true, false, 5),
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Greek Salad', 'Fresh vegetables with feta and olives', 9.99, 'Salads', 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400', true, false, 8),
  ('d1a2b3c4-5678-9012-3456-789012345607', 'Baklava', 'Sweet phyllo pastry with nuts and honey', 5.99, 'Desserts', 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400', true, false, 5),
  
  -- Thai Orchid
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Pad Thai', 'Stir-fried rice noodles with shrimp and peanuts', 14.99, 'Noodles', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400', true, true, 15),
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Green Curry', 'Thai green curry with chicken and vegetables', 15.99, 'Curries', 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400', true, true, 18),
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Tom Yum Soup', 'Spicy and sour shrimp soup', 7.99, 'Soups', 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400', true, false, 10),
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Thai Spring Rolls', 'Fresh rolls with vegetables and peanut sauce', 6.99, 'Appetizers', 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400', true, false, 8),
  ('d1a2b3c4-5678-9012-3456-789012345608', 'Mango Sticky Rice', 'Sweet coconut rice with fresh mango', 7.99, 'Desserts', 'https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?w=400', true, true, 5)
ON CONFLICT DO NOTHING;