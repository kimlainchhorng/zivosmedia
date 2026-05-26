-- Fix security vulnerability: add admin-only check to create_sample_trips_for_driver()
-- This function should only be callable by admins for demo/testing purposes

CREATE OR REPLACE FUNCTION public.create_sample_trips_for_driver(p_driver_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_count INTEGER := 0;
BEGIN
  -- SECURITY: Only allow admins to create sample trips
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin access required to create sample trips';
  END IF;

  -- Insert sample completed trips with valid payment_status 'paid'
  INSERT INTO public.trips (
    driver_id, pickup_address, dropoff_address, 
    pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
    fare_amount, duration_minutes, distance_km, rating, 
    status, payment_status, started_at, completed_at
  ) VALUES
  -- Today's trips
  (p_driver_id, 'Bella Italia Restaurant, 123 Main St', '456 Oak Avenue, Apt 12B', 
   40.7128, -74.0060, 40.7580, -73.9855,
   12.50, 18, 3.2, 5, 'completed', 'paid', 
   NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 42 minutes'),
  
  (p_driver_id, 'Golden Dragon, 789 Broadway', '321 Park Place', 
   40.7549, -73.9840, 40.7282, -73.7949,
   8.75, 12, 2.1, 4, 'completed', 'paid',
   NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 48 minutes'),
  
  (p_driver_id, 'Burger Palace, 555 5th Ave', '888 Lexington Ave', 
   40.7527, -73.9772, 40.7614, -73.9776,
   15.00, 22, 4.5, 5, 'completed', 'paid',
   NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 38 minutes'),

  -- Yesterday's trips
  (p_driver_id, 'Sushi Express, 100 East 42nd St', '200 West 34th St', 
   40.7527, -73.9772, 40.7484, -73.9967,
   9.25, 15, 2.8, 5, 'completed', 'paid',
   NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day 1 hour 45 minutes'),
  
  (p_driver_id, 'Pizza Hub, 300 Canal St', '400 Houston St', 
   40.7193, -74.0000, 40.7282, -73.9942,
   7.50, 10, 1.5, 4, 'completed', 'paid',
   NOW() - INTERVAL '1 day 4 hours', NOW() - INTERVAL '1 day 3 hours 50 minutes'),
  
  (p_driver_id, 'Taco Bell, 500 Spring St', '600 Bleecker St', 
   40.7260, -74.0042, 40.7317, -74.0050,
   11.00, 14, 2.3, 5, 'completed', 'paid',
   NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 5 hours 46 minutes'),

  -- This week's trips
  (p_driver_id, 'Chipotle, 700 7th Ave', '800 8th Ave', 
   40.7614, -73.9776, 40.7527, -73.9897,
   6.50, 8, 1.2, 4, 'completed', 'paid',
   NOW() - INTERVAL '2 days 3 hours', NOW() - INTERVAL '2 days 2 hours 52 minutes'),
  
  (p_driver_id, 'Shake Shack, 900 Madison Ave', '1000 Park Ave', 
   40.7731, -73.9712, 40.7829, -73.9654,
   13.75, 20, 3.8, 5, 'completed', 'paid',
   NOW() - INTERVAL '3 days 1 hour', NOW() - INTERVAL '3 days 41 minutes'),
  
  (p_driver_id, 'Five Guys, 1100 Columbus Ave', '1200 Amsterdam Ave', 
   40.7936, -73.9692, 40.8075, -73.9626,
   10.25, 16, 2.9, 4, 'completed', 'paid',
   NOW() - INTERVAL '4 days 5 hours', NOW() - INTERVAL '4 days 4 hours 44 minutes'),

  (p_driver_id, 'Panera Bread, 1300 Broadway', '1400 6th Ave', 
   40.7484, -73.9878, 40.7614, -73.9776,
   8.00, 11, 1.8, 5, 'completed', 'paid',
   NOW() - INTERVAL '5 days 2 hours', NOW() - INTERVAL '5 days 1 hour 49 minutes'),

  -- Last week trips
  (p_driver_id, 'Sweetgreen, 1500 Park Ave', '1600 Lexington Ave', 
   40.7829, -73.9654, 40.7731, -73.9712,
   14.50, 19, 3.5, 5, 'completed', 'paid',
   NOW() - INTERVAL '8 days 3 hours', NOW() - INTERVAL '8 days 2 hours 41 minutes'),
  
  (p_driver_id, 'Chick-fil-A, 1700 3rd Ave', '1800 2nd Ave', 
   40.7614, -73.9654, 40.7527, -73.9626,
   7.25, 9, 1.4, 4, 'completed', 'paid',
   NOW() - INTERVAL '10 days 4 hours', NOW() - INTERVAL '10 days 3 hours 51 minutes');

  GET DIAGNOSTICS trip_count = ROW_COUNT;
  
  -- Update driver's total_trips count
  UPDATE public.drivers 
  SET total_trips = total_trips + trip_count,
      rating = 4.7
  WHERE id = p_driver_id;
  
  RETURN trip_count;
END;
$function$;