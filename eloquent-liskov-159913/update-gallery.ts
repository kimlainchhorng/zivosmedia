import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);
const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

// Adding the booking.com images revealed in the previous scrape logs
const bookingImages = [
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894379.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894378.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894377.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894380.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894381.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894382.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894676.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1",
  "https://cf.bstatic.com/xdata/images/hotel/max1024x768/594894675.jpg?k=95f9c46ce16f86235123512b9ade71804f85e9ec599b51829e28f343a4441029&o=&hp=1"
];

const { error } = await supabase
  .from('store_profiles')
  .update({ gallery_images: bookingImages })
  .eq('id', storeId);

if (error) console.error(error);
else console.log('✓ Updated store gallery with Booking.com URLs');
