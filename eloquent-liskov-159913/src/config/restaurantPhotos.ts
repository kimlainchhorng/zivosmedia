/** Restaurant photos config */
import cuisineBurger from "@/assets/cuisine-burger.jpg";
import cuisineSushi from "@/assets/cuisine-sushi.jpg";
import cuisinePizza from "@/assets/cuisine-pizza.jpg";
import cuisineTaco from "@/assets/cuisine-taco.jpg";
import cuisineNoodles from "@/assets/cuisine-noodles.jpg";
import cuisineSalad from "@/assets/cuisine-salad.jpg";

export type RestaurantCuisine = "burger" | "sushi" | "pizza" | "taco" | "noodles" | "salad";

export const restaurantPhotos: Record<RestaurantCuisine, { src: string; alt: string }> = {
  burger: { src: cuisineBurger, alt: "Gourmet burger with melted cheese and fresh toppings" },
  sushi: { src: cuisineSushi, alt: "Premium sushi platter with nigiri and maki rolls" },
  pizza: { src: cuisinePizza, alt: "Artisan Neapolitan pizza with fresh mozzarella and basil" },
  taco: { src: cuisineTaco, alt: "Authentic Mexican street tacos with cilantro and lime" },
  noodles: { src: cuisineNoodles, alt: "Steaming ramen noodles in rich broth with soft-boiled egg" },
  salad: { src: cuisineSalad, alt: "Fresh Mediterranean salad with avocado and feta cheese" },
};

export function getRestaurantPhoto(cuisine: RestaurantCuisine) {
  return restaurantPhotos[cuisine] || restaurantPhotos.burger;
}
