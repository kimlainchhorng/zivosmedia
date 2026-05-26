-- Rename Cambodia 'standard' ride_type to 'comfort' so it maps correctly
-- Cambodia's "standard" = ZIVO Comfort, not economy (which is tuktuk)
UPDATE city_pricing
SET ride_type = 'comfort'
WHERE ride_type = 'standard'
  AND city IN (
    'Phnom Penh','Siem Reap','Sihanoukville','Battambang','Kampong Cham','Poipet',
    'Kampot','Takeo','Svay Rieng','Prey Veng','Pursat','Kratie','Koh Kong',
    'Stung Treng','Ratanakiri','Mondulkiri','Pailin','Kep','Banteay Meanchey',
    'Kandal','Kampong Chhnang','Kampong Speu','Kampong Thom','Preah Vihear',
    'Oddar Meanchey','Tboung Khmum'
  );