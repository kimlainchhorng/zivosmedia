/**
 * GroceryCategoryBrowser - Massive category browser with lazy-loaded product carousels
 * 200+ categories, lazy fetch via IntersectionObserver, 3 pages per category
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Check, ChevronRight, Loader2, ShoppingBag, ChevronDown } from "lucide-react";
import type { StoreName } from "@/config/groceryStores";
import { getStoreConfig } from "@/config/groceryStores";
import type { StoreProduct } from "@/hooks/useStoreSearch";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

const CATEGORIES = [
  // 🥩 Meat & Protein
  { emoji: "🥩", label: "Fresh Beef", query: "fresh beef steak ground beef", gradient: "from-muted to-muted" },
  { emoji: "🍗", label: "Chicken & Poultry", query: "fresh chicken breast wings thighs", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥓", label: "Pork & Bacon", query: "pork chops bacon sausage ham", gradient: "from-muted to-muted" },
  { emoji: "🐟", label: "Fresh Seafood", query: "salmon shrimp tilapia fish", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🦃", label: "Turkey & Ground", query: "turkey ground turkey deli meat", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🌭", label: "Hot Dogs & Sausage", query: "hot dogs sausage bratwurst kielbasa", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🥩", label: "Lamb & Veal", query: "lamb chops veal stew meat", gradient: "from-muted to-muted" },
  { emoji: "🦐", label: "Shrimp & Crab", query: "shrimp crab lobster crawfish", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🥓", label: "Deli Meat & Cold Cuts", query: "deli turkey ham salami bologna roast beef", gradient: "from-muted to-muted" },

  // 🥦 Fresh Produce
  { emoji: "🍎", label: "Fresh Fruits", query: "apple banana orange strawberry grapes", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🥦", label: "Fresh Vegetables", query: "broccoli carrots lettuce tomato onion", gradient: "from-emerald-500/10 to-emerald-400/5" },
  { emoji: "🥑", label: "Avocado & Guac", query: "avocado guacamole lime lemon", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🍇", label: "Berries & Grapes", query: "strawberries blueberries raspberries grapes", gradient: "from-muted to-muted" },
  { emoji: "🥬", label: "Salad & Greens", query: "salad mix spinach kale romaine lettuce", gradient: "from-lime-500/10 to-lime-400/5" },
  { emoji: "🧅", label: "Onions & Garlic", query: "onion garlic ginger shallot", gradient: "from-yellow-600/10 to-yellow-500/5" },
  { emoji: "🥔", label: "Potatoes & Root Veg", query: "potato sweet potato yam beet carrot", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🌽", label: "Corn & Squash", query: "corn squash zucchini cucumber", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🍄", label: "Mushrooms & Herbs", query: "mushroom herbs basil cilantro parsley", gradient: "from-stone-500/10 to-stone-400/5" },
  { emoji: "🌶️", label: "Peppers & Chili", query: "bell pepper jalapeno habanero chili", gradient: "from-red-600/10 to-red-500/5" },
  { emoji: "🍅", label: "Tomatoes", query: "tomato cherry tomato roma grape tomato", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🍊", label: "Citrus Fruits", query: "orange grapefruit tangerine clementine mandarin", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🍌", label: "Bananas & Plantains", query: "banana plantain dried banana chips", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🍑", label: "Stone Fruits", query: "peach plum nectarine mango apricot", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🥒", label: "Cucumber & Celery", query: "cucumber celery asparagus green beans", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🥕", label: "Baby Carrots & Snack Veg", query: "baby carrots celery sticks veggie tray", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🍍", label: "Tropical Fruits", query: "pineapple mango papaya coconut kiwi", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🍈", label: "Melons", query: "watermelon cantaloupe honeydew melon", gradient: "from-green-500/10 to-green-400/5" },

  // 🥛 Dairy & Eggs
  { emoji: "🥛", label: "Milk", query: "whole milk 2% milk skim milk gallon", gradient: "from-muted to-muted" },
  { emoji: "🧀", label: "Cheese", query: "cheddar cheese mozzarella american swiss", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🥚", label: "Eggs", query: "eggs dozen large eggs organic eggs", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🧈", label: "Butter & Margarine", query: "butter margarine cream cheese spread", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🍦", label: "Yogurt", query: "yogurt greek yogurt yoplait chobani", gradient: "from-muted to-muted" },
  { emoji: "🍶", label: "Cream & Creamer", query: "heavy cream coffee creamer sour cream", gradient: "from-muted to-muted" },
  { emoji: "🧀", label: "Shredded Cheese", query: "shredded cheese cheddar mozzarella parmesan blend", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🧀", label: "Cheese Slices & String", query: "cheese slices string cheese babybel kraft singles", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🥛", label: "Cottage Cheese & Ricotta", query: "cottage cheese ricotta mascarpone", gradient: "from-muted to-muted" },
  { emoji: "🍶", label: "Half & Half", query: "half and half coffee cream whipping cream", gradient: "from-stone-400/10 to-stone-300/5" },

  // 🍞 Bakery
  { emoji: "🍞", label: "Bread & Loaves", query: "white bread wheat bread sourdough", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥐", label: "Rolls & Buns", query: "dinner rolls hamburger buns hot dog buns", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🧁", label: "Cakes & Cupcakes", query: "cake cupcake birthday cake dessert", gradient: "from-muted to-muted" },
  { emoji: "🥧", label: "Pies & Pastries", query: "pie pastry croissant danish muffin", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🍩", label: "Donuts & Bagels", query: "donut bagel english muffin", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🍪", label: "Bakery Cookies", query: "cookies brownies bakery treats", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🫓", label: "Tortillas & Wraps", query: "tortilla wrap pita flatbread naan", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🥖", label: "French Bread & Baguette", query: "french bread baguette artisan bread ciabatta", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🧇", label: "Waffles & Pancake Mix", query: "waffle mix pancake mix bisquick krusteaz", gradient: "from-orange-300/10 to-orange-200/5" },

  // 🥤 Drinks & Beverages
  { emoji: "🥤", label: "Soda & Pop", query: "coca cola pepsi sprite mountain dew", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "💧", label: "Water", query: "bottled water spring water sparkling water", gradient: "from-muted to-muted" },
  { emoji: "🧃", label: "Juice", query: "orange juice apple juice cranberry grape juice", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "☕", label: "Coffee", query: "folgers coffee maxwell house keurig pods", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🍵", label: "Tea", query: "green tea black tea herbal tea lipton", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "⚡", label: "Energy Drinks", query: "red bull monster energy gatorade powerade", gradient: "from-lime-500/10 to-lime-400/5" },
  { emoji: "🥛", label: "Almond & Oat Milk", query: "almond milk oat milk soy milk coconut milk", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🍺", label: "Beer", query: "beer bud light coors miller modelo", gradient: "from-yellow-600/10 to-yellow-500/5" },
  { emoji: "🍷", label: "Wine", query: "red wine white wine rose wine", gradient: "from-muted to-muted" },
  { emoji: "🧊", label: "Lemonade & Iced Tea", query: "lemonade iced tea arizona simply lemonade", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🥤", label: "Diet & Zero Sugar Soda", query: "diet coke coke zero sprite zero pepsi zero sugar", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🍹", label: "Sparkling Water & Seltzer", query: "lacroix perrier sparkling water seltzer topo chico", gradient: "from-muted to-muted" },
  { emoji: "🥤", label: "Sports Drinks", query: "gatorade powerade body armor prime hydration", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🧋", label: "Smoothie & Protein Drinks", query: "protein shake smoothie ensure boost premier", gradient: "from-muted to-muted" },
  { emoji: "🥃", label: "Liquor & Spirits", query: "vodka whiskey tequila rum gin", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🍸", label: "Mixers & Cocktail", query: "tonic water club soda margarita mix cocktail mixer", gradient: "from-muted to-muted" },
  { emoji: "🫖", label: "K-Cups & Coffee Pods", query: "keurig k-cup coffee pods nespresso", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🧉", label: "Kombucha & Probiotic Drinks", query: "kombucha gt probiotic drink kefir", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🍫", label: "Hot Chocolate & Cocoa", query: "hot chocolate cocoa mix swiss miss nestle", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🥥", label: "Coconut Water", query: "coconut water vita coco zico harmless harvest", gradient: "from-green-400/10 to-green-300/5" },

  // 🍿 Snacks
  { emoji: "🍿", label: "Chips", query: "lays doritos cheetos pringles chips", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🍪", label: "Cookies", query: "oreo chips ahoy cookies nutter butter", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥨", label: "Pretzels & Crackers", query: "pretzels goldfish crackers ritz cheez-it", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🥜", label: "Nuts & Trail Mix", query: "peanuts almonds cashews trail mix mixed nuts", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🍫", label: "Chocolate & Candy", query: "chocolate snickers reeses m&ms candy bar", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🍬", label: "Gummy & Sour Candy", query: "gummy bears sour patch haribo skittles", gradient: "from-muted to-muted" },
  { emoji: "🧁", label: "Snack Cakes", query: "little debbie hostess snack cakes twinkies", gradient: "from-muted to-muted" },
  { emoji: "🍘", label: "Popcorn", query: "popcorn microwave popcorn smartfood", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🥤", label: "Dips & Salsa", query: "salsa queso dip hummus guacamole", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🥢", label: "Jerky & Meat Snacks", query: "beef jerky slim jim meat sticks", gradient: "from-muted to-muted" },
  { emoji: "🍿", label: "Tortilla Chips & Salsa", query: "tostitos tortilla chips salsa con queso", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🥜", label: "Sunflower Seeds", query: "sunflower seeds pumpkin seeds david seeds", gradient: "from-stone-500/10 to-stone-400/5" },
  { emoji: "🍘", label: "Rice Cakes & Thin Crisps", query: "rice cakes quaker thins skinny pop", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🫘", label: "Dried Fruit", query: "raisins dried cranberries dried mango dates", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🍫", label: "Protein & Granola Bars", query: "kind bar cliff bar nature valley protein bar", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥠", label: "Asian Snacks", query: "pocky rice crackers seaweed snacks mochi", gradient: "from-red-500/10 to-red-400/5" },

  // 🧊 Frozen
  { emoji: "🍕", label: "Frozen Pizza", query: "digiorno totinos frozen pizza red baron", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🍦", label: "Ice Cream", query: "ice cream ben jerry haagen dazs popsicle", gradient: "from-muted to-muted" },
  { emoji: "🥟", label: "Frozen Meals", query: "hungry man stouffers lean cuisine tv dinner", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🍟", label: "Frozen Fries & Sides", query: "frozen french fries tater tots onion rings", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🥦", label: "Frozen Vegetables", query: "frozen broccoli corn peas mixed vegetables", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🍗", label: "Frozen Chicken", query: "frozen chicken nuggets tenders wings strips", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🧇", label: "Frozen Breakfast", query: "frozen waffles pancakes breakfast burrito", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🍨", label: "Frozen Treats", query: "popsicle ice cream sandwich drumstick", gradient: "from-muted to-muted" },
  { emoji: "🐟", label: "Frozen Seafood", query: "frozen shrimp fish sticks salmon fillet", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🥟", label: "Frozen Dumplings & Egg Rolls", query: "dumplings egg rolls potstickers wontons frozen", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🌯", label: "Frozen Burritos & Bowls", query: "frozen burrito bowl el monterey amy organic", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🍕", label: "Frozen Appetizers", query: "frozen appetizers mozzarella sticks jalapeno poppers bagel bites", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥧", label: "Frozen Desserts & Pies", query: "frozen pie cheesecake frozen cake sara lee", gradient: "from-muted to-muted" },
  { emoji: "🍦", label: "Frozen Yogurt & Sorbet", query: "frozen yogurt sorbet gelato dairy free ice cream", gradient: "from-muted to-muted" },
  { emoji: "🥩", label: "Frozen Burgers & Patties", query: "frozen burger patties veggie burger beyond meat", gradient: "from-muted to-muted" },
  { emoji: "🫕", label: "Frozen Soup & Chili", query: "frozen soup chili pot pie stew panera", gradient: "from-amber-500/10 to-amber-400/5" },

  // 🍝 Pantry
  { emoji: "🍝", label: "Pasta & Noodles", query: "spaghetti pasta penne ramen noodles", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🍚", label: "Rice & Grains", query: "white rice brown rice jasmine basmati quinoa", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🥫", label: "Canned Soup", query: "campbell soup chicken noodle tomato soup", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🫘", label: "Canned Beans", query: "black beans kidney beans pinto chickpeas", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥫", label: "Canned Vegetables", query: "canned corn green beans tomatoes mushrooms", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🍅", label: "Pasta Sauce", query: "ragu prego marinara alfredo pasta sauce", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🥣", label: "Cereal", query: "cheerios frosted flakes lucky charms cereal", gradient: "from-muted to-muted" },
  { emoji: "🥞", label: "Pancake & Syrup", query: "pancake mix syrup aunt jemima bisquick", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥜", label: "Peanut Butter & Jelly", query: "peanut butter jif skippy jelly jam", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🫒", label: "Cooking Oil", query: "vegetable oil olive oil canola coconut oil", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🧂", label: "Spices & Seasonings", query: "salt pepper garlic powder seasoning spice", gradient: "from-stone-500/10 to-stone-400/5" },
  { emoji: "🍯", label: "Honey & Spreads", query: "honey maple syrup nutella spread", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥫", label: "Canned Tuna & Meat", query: "canned tuna chicken spam vienna sausage", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🍜", label: "Ramen & Instant Noodles", query: "ramen maruchan cup noodles instant noodle", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🫙", label: "Pickles & Olives", query: "pickles olives relish peppers jalapeno jar", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥫", label: "Canned Fruit", query: "canned peaches pineapple fruit cocktail mandarin", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🫘", label: "Lentils & Dried Beans", query: "lentils dried beans split peas barley", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🥜", label: "Almond & Cashew Butter", query: "almond butter cashew butter sunflower seed butter", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🍝", label: "Mac & Cheese", query: "kraft mac and cheese velveeta shells", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🧂", label: "Flour & Baking Mix", query: "all purpose flour cake flour self rising baking mix", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🍬", label: "Sugar & Sweeteners", query: "sugar brown sugar stevia splenda artificial sweetener", gradient: "from-muted to-muted" },
  { emoji: "🍫", label: "Baking Chips & Cocoa", query: "chocolate chips baking cocoa vanilla extract", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🧁", label: "Cake Mix & Frosting", query: "betty crocker cake mix duncan hines frosting pillsbury", gradient: "from-muted to-muted" },
  { emoji: "🥫", label: "Broth & Stock", query: "chicken broth beef broth vegetable stock bouillon", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🍝", label: "Hamburger Helper & Mixes", query: "hamburger helper rice a roni knorr pasta sides", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🧴", label: "Vinegar & Cooking Wine", query: "white vinegar apple cider vinegar balsamic cooking wine", gradient: "from-stone-500/10 to-stone-400/5" },

  // 🧈 Condiments & Sauces
  { emoji: "🍅", label: "Ketchup & Mustard", query: "ketchup mustard heinz french", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🥫", label: "BBQ & Hot Sauce", query: "bbq sauce hot sauce sriracha buffalo sauce", gradient: "from-red-600/10 to-red-500/5" },
  { emoji: "🥗", label: "Salad Dressing", query: "ranch dressing italian caesar vinaigrette", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🫘", label: "Soy Sauce & Asian", query: "soy sauce teriyaki hoisin sesame oil", gradient: "from-amber-700/10 to-amber-600/5" },
  { emoji: "🥄", label: "Mayo & Miracle Whip", query: "mayonnaise miracle whip hellmanns", gradient: "from-yellow-300/10 to-yellow-200/5" },
  { emoji: "🧄", label: "Marinades & Steak Sauce", query: "a1 steak sauce marinade worcestershire", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🌶️", label: "Taco Sauce & Enchilada", query: "taco sauce enchilada sauce taco bell old el paso", gradient: "from-red-500/10 to-red-400/5" },

  // 🌮 International Foods
  { emoji: "🌮", label: "Mexican Food", query: "taco shells salsa tortilla chips queso refried beans", gradient: "from-lime-500/10 to-lime-400/5" },
  { emoji: "🍜", label: "Asian Food", query: "soy sauce rice noodles stir fry teriyaki tofu", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🍛", label: "Indian Food", query: "curry naan tikka masala basmati rice", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🥙", label: "Mediterranean", query: "hummus pita falafel olive oil feta", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🍚", label: "Hispanic & Latino", query: "goya beans adobo sofrito plantain mole", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🍣", label: "Sushi & Japanese", query: "sushi rice nori soy sauce wasabi seaweed", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🍜", label: "Thai Food", query: "thai curry coconut milk pad thai peanut sauce", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥡", label: "Chinese Food", query: "egg roll soy sauce chow mein fried rice wonton", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🫔", label: "Tamales & Pupusas", query: "tamales pupusas empanadas masa harina", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🧆", label: "Middle Eastern", query: "falafel tahini shawarma pita halal", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🇰🇷", label: "Korean Food", query: "kimchi gochujang korean bbq bulgogi rice cake", gradient: "from-red-500/10 to-red-400/5" },

  // 🥣 Breakfast
  { emoji: "🥣", label: "Oatmeal & Granola", query: "oatmeal granola quaker instant oats", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🥞", label: "Frozen Waffles", query: "eggo waffles frozen pancakes french toast", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🥓", label: "Breakfast Meat", query: "bacon breakfast sausage ham links patties", gradient: "from-muted to-muted" },
  { emoji: "🧇", label: "Pop Tarts & Bars", query: "pop tarts granola bar breakfast bar nutri grain", gradient: "from-muted to-muted" },
  { emoji: "🍳", label: "Egg Beaters & Substitute", query: "egg beaters egg whites liquid eggs substitute", gradient: "from-yellow-400/10 to-yellow-300/5" },

  // 🧴 Personal Care
  { emoji: "🧴", label: "Shampoo & Hair", query: "shampoo conditioner hair gel head shoulders", gradient: "from-teal-500/10 to-teal-400/5" },
  { emoji: "🪥", label: "Dental Care", query: "toothpaste toothbrush mouthwash colgate crest", gradient: "from-muted to-muted" },
  { emoji: "🧼", label: "Body Wash & Soap", query: "body wash dove soap bar soap irish spring", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "💊", label: "Deodorant", query: "deodorant antiperspirant old spice secret", gradient: "from-muted to-muted" },
  { emoji: "🧴", label: "Lotion & Skin Care", query: "lotion moisturizer sunscreen chapstick", gradient: "from-muted to-muted" },
  { emoji: "🪒", label: "Razors & Shaving", query: "razors shaving cream gillette venus", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🩹", label: "First Aid", query: "band aid bandage neosporin hydrogen peroxide", gradient: "from-red-300/10 to-red-200/5" },
  { emoji: "💄", label: "Makeup & Cosmetics", query: "mascara lipstick foundation concealer makeup", gradient: "from-muted to-muted" },
  { emoji: "🧴", label: "Face Wash & Cleanser", query: "face wash cleanser cerave neutrogena acne", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "💅", label: "Nail Care", query: "nail polish remover clippers nail file manicure", gradient: "from-muted to-muted" },
  { emoji: "🧴", label: "Hair Spray & Styling", query: "hair spray mousse gel styling products tresemme", gradient: "from-muted to-muted" },
  { emoji: "🧻", label: "Cotton Balls & Swabs", query: "cotton balls q-tips cotton swabs cotton rounds", gradient: "from-muted to-muted" },

  // 💊 Health & Wellness
  { emoji: "💊", label: "Pain Relief", query: "tylenol advil ibuprofen aspirin pain relief", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🫁", label: "Cold & Flu", query: "dayquil nyquil cough syrup cold medicine", gradient: "from-teal-400/10 to-teal-300/5" },
  { emoji: "💊", label: "Vitamins", query: "multivitamin vitamin c d3 b12 fish oil", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🤧", label: "Allergy Medicine", query: "claritin zyrtec benadryl allegra allergy", gradient: "from-muted to-muted" },
  { emoji: "🩹", label: "Stomach & Digestive", query: "tums pepto bismol gas-x antacid probiotic", gradient: "from-muted to-muted" },
  { emoji: "😴", label: "Sleep Aids", query: "melatonin sleep aid zzzquil unisom", gradient: "from-muted to-muted" },
  { emoji: "🩺", label: "Blood Pressure & Heart", query: "blood pressure monitor aspirin heart health omega 3", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🦷", label: "Dental Floss & Whitening", query: "dental floss whitening strips mouthwash breath", gradient: "from-muted to-muted" },
  { emoji: "👓", label: "Eye Care & Contact", query: "eye drops visine contact solution reading glasses", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🧹 Household & Cleaning
  { emoji: "🧻", label: "Toilet Paper", query: "charmin toilet paper cottonelle angel soft", gradient: "from-muted to-muted" },
  { emoji: "🧻", label: "Paper Towels", query: "bounty paper towels brawny viva", gradient: "from-blue-300/10 to-blue-200/5" },
  { emoji: "🧽", label: "Dish Soap & Sponge", query: "dawn dish soap palmolive sponge scrubber", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🧹", label: "Laundry Detergent", query: "tide gain laundry detergent downy fabric softener", gradient: "from-muted to-muted" },
  { emoji: "🧴", label: "All Purpose Cleaner", query: "lysol clorox windex mr clean spray cleaner", gradient: "from-teal-400/10 to-teal-300/5" },
  { emoji: "🗑️", label: "Trash Bags", query: "glad trash bags hefty garbage bag kitchen bag", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🧹", label: "Broom & Mop", query: "swiffer broom mop dust pan floor cleaner", gradient: "from-muted to-muted" },
  { emoji: "🧤", label: "Bleach & Disinfectant", query: "clorox bleach disinfectant spray wipes", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "📦", label: "Aluminum Foil & Wrap", query: "aluminum foil plastic wrap parchment paper ziploc", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🍽️", label: "Paper Plates & Cups", query: "paper plates cups plastic utensils napkins", gradient: "from-amber-300/10 to-amber-200/5" },
  { emoji: "🧴", label: "Dish Detergent Pods", query: "cascade dishwasher pods finish tabs detergent", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🧹", label: "Dryer Sheets & Softener", query: "dryer sheets bounce downy fabric softener", gradient: "from-muted to-muted" },
  { emoji: "🧤", label: "Cleaning Gloves & Wipes", query: "cleaning gloves clorox wipes disinfecting wipes", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🚿", label: "Bathroom Cleaner", query: "scrubbing bubbles toilet cleaner bathroom cleaner tilex", gradient: "from-teal-500/10 to-teal-400/5" },
  { emoji: "🧼", label: "Hand Soap & Sanitizer", query: "hand soap hand sanitizer purell softsoap", gradient: "from-teal-400/10 to-teal-300/5" },

  // 🍼 Baby
  { emoji: "🍼", label: "Baby Formula", query: "similac enfamil baby formula infant", gradient: "from-muted to-muted" },
  { emoji: "👶", label: "Diapers & Wipes", query: "pampers huggies diapers baby wipes", gradient: "from-blue-300/10 to-blue-200/5" },
  { emoji: "🍼", label: "Baby Food", query: "gerber baby food baby snacks puffs", gradient: "from-green-300/10 to-green-200/5" },
  { emoji: "🧴", label: "Baby Care", query: "baby lotion shampoo bath soap johnson", gradient: "from-muted to-muted" },
  { emoji: "🧸", label: "Baby Toys & Teethers", query: "baby toys teether rattle pacifier sippy cup", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🐶 Pets
  { emoji: "🐶", label: "Dog Food", query: "pedigree purina dog food kibble treats", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🐱", label: "Cat Food", query: "meow mix friskies cat food litter treats", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🦴", label: "Pet Treats", query: "dog treats milk bone greenies pet snacks", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🐾", label: "Pet Supplies", query: "pet toy leash collar bed pet supplies", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🧹", label: "Cat Litter", query: "cat litter tidy cats arm hammer clumping", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🐕", label: "Wet Dog Food", query: "pedigree wet dog food cesar purina canned", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🐟", label: "Fish & Aquarium", query: "fish food aquarium filter tank goldfish betta", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🏠 Home & Garden
  { emoji: "💡", label: "Light Bulbs", query: "led light bulbs lamp batteries flashlight", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🔋", label: "Batteries", query: "duracell energizer aa aaa batteries 9v", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🌸", label: "Air Freshener", query: "febreze glade air freshener candle room spray", gradient: "from-muted to-muted" },
  { emoji: "🌻", label: "Flowers & Plants", query: "flowers bouquet potted plant garden soil seeds", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🧯", label: "Bug & Pest Control", query: "raid ant killer roach spray bug repellent", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🕯️", label: "Candles", query: "candles yankee candle scented candle pillar candle", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🧰", label: "Hardware & Tools", query: "screwdriver tape measure hammer nails duct tape", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🪴", label: "Garden Supplies", query: "garden gloves potting soil plant food fertilizer", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🧊", label: "Storage & Organization", query: "storage bins containers shelving organizer", gradient: "from-blue-300/10 to-blue-200/5" },

  // 🎉 Party & Seasonal
  { emoji: "🎈", label: "Party Supplies", query: "balloons party plates cups decorations birthday", gradient: "from-muted to-muted" },
  { emoji: "🎁", label: "Gift Cards & Wrap", query: "gift card wrapping paper gift bag tissue paper", gradient: "from-muted to-muted" },
  { emoji: "🧊", label: "Ice & Coolers", query: "bag ice cooler ice chest styrofoam cups", gradient: "from-muted to-muted" },
  { emoji: "🎃", label: "Seasonal Candy", query: "holiday candy easter christmas halloween valentine", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🎄", label: "Seasonal Decor", query: "holiday decorations seasonal lights wreath ornaments", gradient: "from-red-500/10 to-red-400/5" },

  // 🩹 Feminine & Hygiene
  { emoji: "🩹", label: "Feminine Care", query: "tampons pads feminine hygiene always kotex", gradient: "from-muted to-muted" },
  { emoji: "🧻", label: "Tissues & Kleenex", query: "kleenex tissues facial tissue puffs", gradient: "from-muted to-muted" },

  // 📰 Office & School
  { emoji: "📰", label: "Office & School", query: "pens pencils notebook paper glue tape", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🖨️", label: "Printer & Paper", query: "printer paper copy paper ink cartridge staples", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🎒", label: "Backpacks & Lunch", query: "backpack lunch box lunch bag bento container", gradient: "from-blue-500/10 to-blue-400/5" },

  // 🏋️ Health & Fitness
  { emoji: "🏋️", label: "Protein Powder", query: "protein powder whey muscle milk optimum nutrition", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥗", label: "Meal Prep Containers", query: "meal prep containers bento box food storage glass", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🥤", label: "Electrolyte Packets", query: "liquid iv pedialyte electrolyte powder drip drop", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🧺 Organic & Natural
  { emoji: "🌿", label: "Organic Produce", query: "organic apples organic spinach organic berries", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥛", label: "Organic Dairy", query: "organic milk organic eggs organic cheese horizon", gradient: "from-muted to-muted" },
  { emoji: "🌾", label: "Gluten Free", query: "gluten free bread gluten free pasta gf crackers", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🌱", label: "Vegan & Plant Based", query: "beyond meat impossible tofu tempeh vegan cheese", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🥜", label: "Keto & Low Carb", query: "keto snacks low carb bread sugar free candy", gradient: "from-amber-500/10 to-amber-400/5" },

  // 🍽️ Deli & Prepared
  { emoji: "🥪", label: "Deli Sandwiches", query: "deli sandwich sub wrap prepared lunch", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🥗", label: "Prepared Salads", query: "prepared salad potato salad coleslaw pasta salad", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🍗", label: "Rotisserie Chicken", query: "rotisserie chicken deli roasted chicken", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🧆", label: "Deli Sides & Dips", query: "hummus deli dip spinach dip deviled eggs", gradient: "from-stone-400/10 to-stone-300/5" },

  // 🎮 Electronics & Media
  { emoji: "🎮", label: "Gaming & Gift Cards", query: "xbox gift card playstation nintendo switch card", gradient: "from-muted to-muted" },
  { emoji: "🔌", label: "Phone Chargers & Cables", query: "phone charger lightning cable usb c adapter", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🎧", label: "Earbuds & Headphones", query: "earbuds headphones bluetooth speaker wireless", gradient: "from-blue-500/10 to-blue-400/5" },

  // 👕 Apparel Basics
  { emoji: "🧦", label: "Socks & Underwear", query: "socks underwear boxer briefs hanes fruit loom", gradient: "from-blue-300/10 to-blue-200/5" },
  { emoji: "👕", label: "Basic T-Shirts", query: "t-shirt plain tee undershirt white black", gradient: "from-slate-400/10 to-slate-300/5" },

  // 🧸 Toys & Kids
  { emoji: "🧸", label: "Toys & Games", query: "toys lego barbie hot wheels board games puzzles", gradient: "from-muted to-muted" },
  { emoji: "🖍️", label: "Arts & Crafts", query: "crayons markers paint coloring book craft supplies", gradient: "from-muted to-muted" },
  { emoji: "📚", label: "Kids Books & Activity", query: "children books coloring books activity book stickers", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🚗 Auto & Outdoor
  { emoji: "🚗", label: "Auto Essentials", query: "windshield fluid motor oil car air freshener", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🏕️", label: "Outdoor & Camping", query: "flashlight lantern camping supplies cooler", gradient: "from-green-600/10 to-green-500/5" },
  { emoji: "☂️", label: "Umbrellas & Rain Gear", query: "umbrella rain poncho rain boots waterproof", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🔧", label: "Auto Tools & Accessories", query: "car jack jumper cables tire gauge tools", gradient: "from-slate-600/10 to-slate-500/5" },
  { emoji: "🚘", label: "Car Cleaning", query: "car wash soap wax armor all tire cleaner", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🪵", label: "Firewood & Charcoal", query: "firewood charcoal fire starter kindling logs", gradient: "from-amber-600/10 to-amber-500/5" },

  // 🌿 Garden & Lawn
  { emoji: "🌿", label: "Garden Seeds", query: "vegetable seeds flower seeds herb seeds garden", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🌻", label: "Garden Plants & Flowers", query: "flowers potted plant hanging basket garden flowers", gradient: "from-muted to-muted" },
  { emoji: "🌱", label: "Soil & Mulch", query: "potting soil mulch compost peat moss topsoil", gradient: "from-amber-600/10 to-amber-500/5" },
  { emoji: "🪴", label: "Planters & Pots", query: "planter pot flower pot hanging planter ceramic", gradient: "from-stone-500/10 to-stone-400/5" },
  { emoji: "🌾", label: "Lawn Care", query: "grass seed lawn fertilizer weed killer scotts", gradient: "from-green-600/10 to-green-500/5" },
  { emoji: "🪻", label: "Garden Tools", query: "garden hose shovel rake pruning shears wheelbarrow", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🦟", label: "Insect Repellent", query: "bug spray off insect repellent mosquito citronella", gradient: "from-lime-500/10 to-lime-400/5" },
  { emoji: "🌳", label: "Tree & Shrub Care", query: "tree fertilizer shrub trimmer hedge plant food", gradient: "from-emerald-600/10 to-emerald-500/5" },
  { emoji: "💧", label: "Sprinklers & Watering", query: "sprinkler garden hose watering can nozzle drip", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🪨", label: "Landscaping & Decor", query: "garden stones stepping stone solar light bird feeder", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🧤", label: "Garden Gloves & Gear", query: "gardening gloves knee pad apron sun hat", gradient: "from-green-300/10 to-green-200/5" },
  { emoji: "🌹", label: "Rose & Perennial", query: "rose bush perennial flower bulbs tulip daffodil", gradient: "from-muted to-muted" },
  { emoji: "🍅", label: "Vegetable Garden", query: "tomato plant pepper plant herb garden starter kit", gradient: "from-red-400/10 to-red-300/5" },

  // 🪑 Patio & Outdoor Living
  { emoji: "🪑", label: "Patio Furniture", query: "patio chair table outdoor furniture cushion umbrella", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🔥", label: "Grills & BBQ", query: "grill charcoal grill gas grill smoker bbq", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🍖", label: "Grilling Accessories", query: "grill brush tongs spatula grill mat thermometer", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🏖️", label: "Outdoor Decor", query: "outdoor string lights solar lantern wind chime", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🏊", label: "Pool & Water", query: "pool float pool noodle chlorine pool chemicals", gradient: "from-muted to-muted" },
  { emoji: "⛱️", label: "Shade & Canopy", query: "patio umbrella canopy shade sail gazebo", gradient: "from-blue-300/10 to-blue-200/5" },

  // 🏋️ Sports & Fitness
  { emoji: "⚽", label: "Sports Equipment", query: "basketball football soccer ball baseball bat", gradient: "from-orange-500/10 to-orange-400/5" },
  { emoji: "🏋️", label: "Exercise Equipment", query: "dumbbells resistance bands yoga mat jump rope", gradient: "from-muted to-muted" },
  { emoji: "🚴", label: "Cycling & Biking", query: "bike helmet bike lock bicycle pump accessories", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🏃", label: "Running & Athletic", query: "running shoes athletic socks water bottle armband", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🎣", label: "Fishing & Hunting", query: "fishing rod tackle box bait lure fishing line", gradient: "from-teal-500/10 to-teal-400/5" },
  { emoji: "⛳", label: "Golf & Tennis", query: "golf balls tees tennis ball racket grip tape", gradient: "from-green-400/10 to-green-300/5" },

  // 🛏️ Bedding & Bath
  { emoji: "🛏️", label: "Bedding & Sheets", query: "bed sheets pillow comforter blanket mattress pad", gradient: "from-muted to-muted" },
  { emoji: "🛁", label: "Bath Towels", query: "bath towel hand towel washcloth towel set", gradient: "from-muted to-muted" },
  { emoji: "🧸", label: "Pillows & Throws", query: "throw pillow decorative pillow throw blanket", gradient: "from-muted to-muted" },
  { emoji: "🪟", label: "Curtains & Blinds", query: "curtains window blinds shower curtain rod", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🧹", label: "Laundry Baskets", query: "laundry basket hamper drying rack ironing board", gradient: "from-blue-300/10 to-blue-200/5" },

  // 🏠 Home Improvement
  { emoji: "🎨", label: "Paint & Supplies", query: "paint brush roller tape primer spray paint", gradient: "from-muted to-muted" },
  { emoji: "💡", label: "Smart Home", query: "smart plug smart bulb doorbell camera ring echo", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🔌", label: "Electrical", query: "extension cord power strip surge protector outlet", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🔩", label: "Nuts Bolts & Screws", query: "screws nails bolts anchors wall hooks command", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🚪", label: "Locks & Security", query: "door lock padlock deadbolt security camera safe", gradient: "from-slate-600/10 to-slate-500/5" },
  { emoji: "🪠", label: "Plumbing Supplies", query: "plunger drain cleaner faucet tape pipe", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🧰", label: "Tool Sets", query: "tool set drill bit wrench plier socket set", gradient: "from-red-500/10 to-red-400/5" },

  // 📱 Electronics
  { emoji: "📱", label: "Phone Cases & Screen", query: "phone case screen protector pop socket grip", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🔋", label: "Power Banks", query: "portable charger power bank battery pack wireless", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🖥️", label: "Computer Accessories", query: "mouse keyboard mouse pad webcam usb hub", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "📷", label: "Memory Cards & USB", query: "sd card micro sd usb flash drive memory stick", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🎵", label: "Speakers & Audio", query: "bluetooth speaker portable speaker soundbar aux", gradient: "from-muted to-muted" },
  { emoji: "📺", label: "TV Accessories", query: "tv mount hdmi cable streaming stick remote", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🎮", label: "Video Games", query: "playstation xbox nintendo switch games controller", gradient: "from-muted to-muted" },

  // 👗 Clothing & Accessories
  { emoji: "👟", label: "Shoes & Sneakers", query: "sneakers shoes sandals slippers boots flip flops", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "👖", label: "Jeans & Pants", query: "jeans pants shorts leggings sweatpants joggers", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🧥", label: "Jackets & Hoodies", query: "hoodie jacket sweater coat fleece zip up", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "👒", label: "Hats & Caps", query: "baseball cap beanie sun hat visor trucker hat", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🕶️", label: "Sunglasses", query: "sunglasses polarized reading glasses aviator", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "👜", label: "Bags & Wallets", query: "wallet purse tote bag backpack messenger bag", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "⌚", label: "Watches & Jewelry", query: "watch bracelet necklace ring earrings jewelry", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🩱", label: "Swimwear", query: "swimsuit bikini swim trunks board shorts rash guard", gradient: "from-muted to-muted" },
  { emoji: "🧤", label: "Gloves & Scarves", query: "gloves scarf mittens winter accessories earmuffs", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🧸 More Toys & Entertainment
  { emoji: "🎲", label: "Board Games & Puzzles", query: "monopoly scrabble puzzle chess card games uno", gradient: "from-emerald-400/10 to-emerald-300/5" },
  { emoji: "🎨", label: "Paint & Draw Sets", query: "paint set watercolor acrylic canvas easel", gradient: "from-muted to-muted" },
  { emoji: "🧩", label: "Building Sets", query: "lego building blocks mega construx kinex", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🎯", label: "Outdoor Toys", query: "nerf water gun bubble maker frisbee kite", gradient: "from-lime-400/10 to-lime-300/5" },
  { emoji: "🪀", label: "Dolls & Action Figures", query: "barbie doll action figure marvel disney frozen", gradient: "from-muted to-muted" },
  { emoji: "🚂", label: "Toy Vehicles", query: "hot wheels matchbox toy truck remote control car", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🎹", label: "Musical Instruments", query: "guitar ukulele keyboard harmonica recorder", gradient: "from-amber-500/10 to-amber-400/5" },

  // 📚 Books & Media
  { emoji: "📖", label: "Best Selling Books", query: "best seller book novel fiction non fiction", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "📕", label: "Cookbooks & Recipes", query: "cookbook recipe book baking book food guide", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🎬", label: "DVDs & Blu-Ray", query: "dvd bluray movie box set tv series", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "📓", label: "Journals & Planners", query: "journal planner diary calendar notebook", gradient: "from-teal-400/10 to-teal-300/5" },

  // 🍳 Kitchen & Dining
  { emoji: "🍳", label: "Cookware & Pans", query: "frying pan pot skillet saucepan wok non stick", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🔪", label: "Knives & Cutlery", query: "kitchen knife cutting board knife set chef knife", gradient: "from-slate-600/10 to-slate-500/5" },
  { emoji: "🫙", label: "Food Storage", query: "tupperware food container glass storage zip bag", gradient: "from-blue-300/10 to-blue-200/5" },
  { emoji: "☕", label: "Mugs & Glasses", query: "coffee mug tumbler water glass wine glass cup", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🍽️", label: "Plates & Bowls", query: "dinner plate bowl dish set dinnerware melamine", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🧊", label: "Small Appliances", query: "blender toaster air fryer instant pot crockpot", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🧹", label: "Kitchen Cleaning", query: "dish rack drying mat scrub brush scouring pad", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🧂", label: "Bakeware", query: "baking sheet cookie pan muffin tin cake pan loaf", gradient: "from-amber-500/10 to-amber-400/5" },

  // 🧴 More Personal Care
  { emoji: "🪮", label: "Hair Brushes & Combs", query: "hair brush comb detangler wide tooth pick", gradient: "from-muted to-muted" },
  { emoji: "💆", label: "Hair Color & Dye", query: "hair dye color box dye revlon loreal garnier", gradient: "from-muted to-muted" },
  { emoji: "🧴", label: "Body Lotion & Cream", query: "body lotion cream vaseline jergens aveeno", gradient: "from-muted to-muted" },
  { emoji: "🪥", label: "Electric Toothbrush", query: "electric toothbrush oral b sonicare replacement head", gradient: "from-muted to-muted" },

  // 🏥 More Health
  { emoji: "🩺", label: "Diabetes Care", query: "glucose monitor test strips insulin syringes", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🦻", label: "Hearing & Ear Care", query: "ear plugs hearing aid batteries ear drops wax removal", gradient: "from-muted to-muted" },
  { emoji: "🩼", label: "Mobility & Support", query: "walking cane knee brace wrist brace ankle support", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🧪", label: "Home Test Kits", query: "covid test pregnancy test drug test thermometer", gradient: "from-teal-400/10 to-teal-300/5" },

  // 🧺 Laundry & Cleaning Deep
  { emoji: "🧴", label: "Stain Remover", query: "oxiclean shout stain remover spray wash bleach", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🧹", label: "Vacuum & Floor Care", query: "vacuum cleaner mop pads swiffer refill dust buster", gradient: "from-muted to-muted" },
  { emoji: "🪣", label: "Bucket & Cleaning Caddy", query: "bucket mop bucket spray bottle cleaning caddy", gradient: "from-teal-300/10 to-teal-200/5" },

  // 🎒 Travel & Luggage
  { emoji: "🧳", label: "Luggage & Travel Bags", query: "suitcase luggage carry on duffel bag travel", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "✈️", label: "Travel Accessories", query: "travel pillow luggage tag eye mask travel size", gradient: "from-blue-400/10 to-blue-300/5" },
  { emoji: "🧴", label: "Travel Size Toiletries", query: "travel size shampoo toothpaste deodorant mini", gradient: "from-muted to-muted" },

  // 🐾 More Pets
  { emoji: "🐕‍🦺", label: "Dog Toys", query: "dog toy chew toy rope toy squeaky ball fetch", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🐱", label: "Cat Toys & Scratchers", query: "cat toy scratcher cat tree catnip laser pointer", gradient: "from-orange-300/10 to-orange-200/5" },
  { emoji: "🐦", label: "Bird & Small Pets", query: "bird food hamster cage guinea pig bedding seed", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🐶", label: "Dog Beds & Crates", query: "dog bed crate kennel blanket pet mat carrier", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🧼", label: "Pet Grooming", query: "dog shampoo pet brush nail clipper flea collar", gradient: "from-teal-400/10 to-teal-300/5" },

  // 🎉 More Party & Celebrations
  { emoji: "🎂", label: "Birthday Party", query: "birthday candles party banner table cover pinata", gradient: "from-muted to-muted" },
  { emoji: "🎊", label: "Graduation & Events", query: "graduation cap banner decorations party poppers", gradient: "from-blue-500/10 to-blue-400/5" },
  { emoji: "🍰", label: "Baking Decorating", query: "sprinkles frosting piping bags cake topper fondant", gradient: "from-muted to-muted" },

  // 🧰 More Hardware
  { emoji: "💡", label: "Outdoor Lighting", query: "solar lights landscape lights flood light motion sensor", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🔌", label: "Light Switches & Outlets", query: "light switch dimmer outlet cover plate smart switch", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🪜", label: "Ladders & Step Stools", query: "step stool ladder folding step small ladder", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "📏", label: "Measuring & Levels", query: "tape measure level stud finder laser measure", gradient: "from-yellow-500/10 to-yellow-400/5" },
  { emoji: "🔨", label: "Adhesives & Tape", query: "gorilla glue super glue epoxy duct tape painters tape", gradient: "from-amber-500/10 to-amber-400/5" },

  // 🎨 Crafts & Hobbies
  { emoji: "🧵", label: "Sewing & Fabric", query: "thread needle fabric scissors sewing kit velcro", gradient: "from-muted to-muted" },
  { emoji: "🧶", label: "Yarn & Knitting", query: "yarn knitting needles crochet hook pattern wool", gradient: "from-muted to-muted" },
  { emoji: "📸", label: "Scrapbooking", query: "stickers scrapbook washi tape photo album glitter", gradient: "from-muted to-muted" },
  { emoji: "🖼️", label: "Frames & Wall Art", query: "picture frame wall art poster canvas print", gradient: "from-amber-400/10 to-amber-300/5" },

  // 🧘 Wellness & Self-Care
  { emoji: "🧘", label: "Yoga & Meditation", query: "yoga mat yoga block meditation cushion foam roller", gradient: "from-muted to-muted" },
  { emoji: "🛀", label: "Bath Bombs & Salts", query: "bath bomb epsom salt bubble bath bath oil", gradient: "from-muted to-muted" },
  { emoji: "🕯️", label: "Aromatherapy", query: "essential oil diffuser lavender eucalyptus peppermint", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "💆", label: "Massage & Relief", query: "massage gun roller icy hot biofreeze heating pad", gradient: "from-blue-400/10 to-blue-300/5" },

  // 🍽️ More Food Specialty
  { emoji: "🍣", label: "Sushi Ingredients", query: "sushi rice nori sheets wasabi pickled ginger", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🫕", label: "Fondue & Dips", query: "fondue cheese dip chocolate fondue bread bowl", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🥜", label: "Nut Butters & Tahini", query: "almond butter tahini cashew butter hazelnut spread", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🍯", label: "Jam & Preserves", query: "strawberry jam grape jelly marmalade preserves", gradient: "from-red-400/10 to-red-300/5" },
  { emoji: "🧂", label: "Salt & Specialty Spice", query: "himalayan salt sea salt black pepper garlic salt", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🫒", label: "Olive Oil & Vinegar", query: "extra virgin olive oil balsamic vinegar avocado oil", gradient: "from-green-500/10 to-green-400/5" },
  { emoji: "🌶️", label: "Hot Sauce Collection", query: "tabasco franks cholula valentina tapatio sriracha", gradient: "from-red-600/10 to-red-500/5" },
  { emoji: "🥫", label: "Tomato Sauce & Paste", query: "tomato sauce tomato paste crushed tomato diced", gradient: "from-red-500/10 to-red-400/5" },
  { emoji: "🍝", label: "Alfredo & Pesto", query: "alfredo sauce pesto basil sauce white sauce", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🥣", label: "Instant Oatmeal", query: "instant oatmeal quaker oats maple brown sugar apple", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🥞", label: "Cereal Bars", query: "cereal bar nature valley kind bar clif bar granola", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🧀", label: "Cream Cheese & Dip", query: "philadelphia cream cheese onion dip french onion", gradient: "from-yellow-300/10 to-yellow-200/5" },
  { emoji: "🥩", label: "Jerky Variety", query: "beef jerky turkey jerky teriyaki jerky peppered", gradient: "from-muted to-muted" },
  { emoji: "🍿", label: "Kettle Corn & Caramel", query: "kettle corn caramel popcorn cheese popcorn", gradient: "from-yellow-400/10 to-yellow-300/5" },
  { emoji: "🫘", label: "Hummus & Dips", query: "hummus sabra tzatziki ranch dip spinach dip", gradient: "from-green-400/10 to-green-300/5" },
  { emoji: "🧃", label: "Juice Boxes & Pouches", query: "capri sun juice box kids juice pouch kool aid", gradient: "from-orange-400/10 to-orange-300/5" },
  { emoji: "🥤", label: "Flavored Water", query: "flavored water mio crystal light drink mix", gradient: "from-blue-300/10 to-blue-200/5" },
  { emoji: "🍦", label: "Ice Cream Cones & Toppings", query: "ice cream cone waffle cone sprinkles hot fudge", gradient: "from-muted to-muted" },
  { emoji: "🥧", label: "Pie Crust & Filling", query: "pie crust filling cherry apple pumpkin graham", gradient: "from-amber-500/10 to-amber-400/5" },
  { emoji: "🍬", label: "Gum & Mints", query: "gum mints altoids tic tac orbit trident", gradient: "from-teal-400/10 to-teal-300/5" },
  { emoji: "🍭", label: "Lollipops & Hard Candy", query: "lollipop jolly rancher lifesavers werther hard candy", gradient: "from-muted to-muted" },
  { emoji: "🍫", label: "Dark Chocolate", query: "dark chocolate lindt ghirardelli godiva cocoa", gradient: "from-amber-800/10 to-amber-700/5" },

  // 🏡 More Home
  { emoji: "🧸", label: "Throw Rugs & Mats", query: "area rug bath mat doormat runner rug carpet", gradient: "from-stone-400/10 to-stone-300/5" },
  { emoji: "🪞", label: "Mirrors & Decor", query: "wall mirror decorative mirror vanity mirror shelf", gradient: "from-slate-400/10 to-slate-300/5" },
  { emoji: "🧺", label: "Baskets & Bins", query: "storage basket wicker bin fabric cube organizer", gradient: "from-amber-400/10 to-amber-300/5" },
  { emoji: "🖼️", label: "Wall Hooks & Hangers", query: "wall hooks adhesive hooks coat rack hanger over door", gradient: "from-slate-500/10 to-slate-400/5" },
  { emoji: "🧴", label: "Room Spray & Deodorizer", query: "room spray febreze plug in air wick odor eliminator", gradient: "from-muted to-muted" },
];

interface CategorySectionProps {
  category: typeof CATEGORIES[0];
  store: StoreName;
  onAdd: (product: StoreProduct) => void;
  cartProductIds: Set<string>;
  onBrowse: (query: string) => void;
  onSelect?: (product: StoreProduct) => void;
  index: number;
}

function CategorySection({ category, store, onAdd, cartProductIds, onBrowse, onSelect, index }: CategorySectionProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetched = useRef(false);

  // Lazy load: only fetch when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || fetched.current) return;
    fetched.current = true;

    const cfg = getStoreConfig(store);
    const baseUrl = `${SUPABASE_URL}/functions/v1/${cfg.edgeFunction}`;
    const headers = {
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
    };

    // API returns ~2 products per query, so split into individual keyword searches
    const keywords = category.query.split(/\s+/).filter((w) => w.length >= 2);
    // Also search the full query and 2-word combos for variety
    const searches: string[] = [category.query];
    for (const kw of keywords) {
      if (!searches.includes(kw)) searches.push(kw);
    }
    // Add 2-word pairs for better matching
    for (let i = 0; i < keywords.length - 1; i++) {
      const pair = `${keywords[i]} ${keywords[i + 1]}`;
      if (!searches.includes(pair)) searches.push(pair);
    }

    // Fetch all in parallel (each returns ~2 items, so 10 searches = ~20 items)
    const fetchOne = (q: string) =>
      fetch(`${baseUrl}?q=${encodeURIComponent(q)}&page=1`, { headers })
        .then((r) => r.json())
        .catch(() => ({ products: [] }));

    Promise.all(searches.slice(0, 12).map(fetchOne))
      .then((results) => {
        const all = results.flatMap((r) => r.products || []);
        const seen = new Set<string>();
        const unique = all.filter((p: any) => {
          const key = p.productId || p.name;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const items: StoreProduct[] = unique.slice(0, 30).map((p: any) => ({ ...p, store }));
        setProducts(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isVisible, store, category.query]);

  const handleAdd = (p: StoreProduct) => {
    onAdd(p);
    setAddedIds((prev) => new Set(prev).add(p.productId));
    setTimeout(() => setAddedIds((prev) => { const next = new Set(prev); next.delete(p.productId); return next; }), 800);
  };

  if (!loading && products.length === 0 && isVisible) return null;

  return (
    <div ref={containerRef} className="pt-4 pb-1">
      {!isVisible ? (
        <div className="flex items-center gap-2 mb-3 px-4">
          <div className={`flex items-center justify-center h-7 w-7 rounded-xl bg-gradient-to-br ${category.gradient}`}>
            <span className="text-sm">{category.emoji}</span>
          </div>
          <span className="text-[13px] font-bold text-foreground tracking-tight">{category.label}</span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
        >
          <div className="flex items-center gap-2 mb-3 px-4">
            <div className={`flex items-center justify-center h-7 w-7 rounded-xl bg-gradient-to-br ${category.gradient}`}>
              <span className="text-sm">{category.emoji}</span>
            </div>
            <span className="text-[13px] font-bold text-foreground tracking-tight">{category.label}</span>
            <button type="button"
              onClick={() => onBrowse(category.query)}
              className="ml-auto flex items-center gap-0.5 text-[10px] text-primary font-semibold hover:underline group"
            >
              See all <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {loading ? (
            <div className="flex gap-2.5 px-4 overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[130px] rounded-2xl border border-border/20 overflow-hidden">
                  <div className="h-[90px] bg-muted/20 animate-pulse" />
                  <div className="p-2 space-y-1.5">
                    <div className="h-2.5 w-full bg-muted/30 rounded animate-pulse" />
                    <div className="h-3.5 w-14 bg-muted/30 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="flex gap-2.5 overflow-x-auto pb-2 px-4 snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
            >
              {products.map((p, i) => {
                const inCart = cartProductIds.has(p.productId);
                const justAdded = addedIds.has(p.productId);
                return (
                  <motion.div
                    key={p.productId}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02, type: "spring", stiffness: 300, damping: 24 }}
                    className="snap-start shrink-0 w-[130px] rounded-2xl border border-border/30 bg-card overflow-hidden group hover:border-primary/20 hover:shadow-lg transition-all duration-300"
                  >
                    <div
                      className={`relative h-[90px] bg-gradient-to-br ${category.gradient} flex items-center justify-center p-2.5 cursor-pointer`}
                      onClick={() => onSelect?.(p)}
                    >
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
	                          className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
	                          loading="lazy"
	                          decoding="async"
	                          referrerPolicy="no-referrer"
	                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground/10" />
                      )}
                      <span className={`absolute top-1.5 left-1.5 h-1.5 w-1.5 rounded-full ${p.inStock ? "bg-emerald-500" : "bg-destructive"}`} />
                    </div>
                    <div className="p-2 space-y-1">
                      <p className="text-[10px] font-semibold line-clamp-2 text-foreground/90 leading-tight min-h-[24px] cursor-pointer hover:text-primary transition-colors" onClick={() => onSelect?.(p)}>{p.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-extrabold text-foreground">${p.price.toFixed(2)}</span>
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleAdd(p)}
                          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            inCart || justAdded
                              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                              : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/15"
                          }`}
                        >
                          <AnimatePresence mode="wait">
                            {justAdded ? (
                              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <Check className="h-3 w-3" />
                              </motion.div>
                            ) : (
                              <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                <Plus className="h-3 w-3" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

interface GroceryCategoryBrowserProps {
  store: StoreName;
  onAdd: (product: StoreProduct) => void;
  cartProductIds: Set<string>;
  onBrowse: (query: string) => void;
  onSelect?: (product: StoreProduct) => void;
}

export function GroceryCategoryBrowser({ store, onAdd, cartProductIds, onBrowse, onSelect }: GroceryCategoryBrowserProps) {
  const [visibleCount, setVisibleCount] = useState(15);
  const STEP = 20;

  return (
    <div className="space-y-1 pb-2">
      <div className="flex items-center gap-2 px-4 pt-5 pb-1">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <span className="text-[14px] font-bold text-foreground tracking-tight">Browse by Category</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{CATEGORIES.length} categories</span>
      </div>

      {CATEGORIES.slice(0, visibleCount).map((cat, i) => (
        <CategorySection
          key={cat.label}
          category={cat}
          store={store}
          onAdd={onAdd}
          cartProductIds={cartProductIds}
          onBrowse={onBrowse}
          onSelect={onSelect}
          index={i}
        />
      ))}

      {visibleCount < CATEGORIES.length && (
        <div className="px-4 pt-2 pb-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setVisibleCount((c) => Math.min(c + STEP, CATEGORIES.length))}
            className="w-full py-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-[12px] font-bold text-primary hover:bg-primary/10 transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            Show more ({CATEGORIES.length - visibleCount} remaining)
          </motion.button>
        </div>
      )}
    </div>
  );
}
