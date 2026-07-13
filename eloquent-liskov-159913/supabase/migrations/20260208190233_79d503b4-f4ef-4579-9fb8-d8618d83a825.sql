-- Update snow multiplier to 1.30
UPDATE weather_multipliers 
SET multiplier = 1.30
WHERE weather_key = 'snow';