-- Update ZIVO+ plan with Stripe price IDs and activate it
UPDATE zivo_subscription_plans
SET 
  stripe_price_id_monthly = 'price_1SyjkMBxRnIs4yDmaW20lkln',
  stripe_price_id_yearly = 'price_1SyjkSBxRnIs4yDmSFHyzxLL',
  is_active = true
WHERE slug = 'zivo-plus';