import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserAccess {
  isAdmin: boolean;
  isDriver: boolean;
  isRestaurantOwner: boolean;
  isCarRentalOwner: boolean;
  isHotelOwner: boolean;
  isFlightManager: boolean;
  isStoreOwner: boolean;
  isSupport: boolean;
  isModerator: boolean;
  isOperations: boolean;
  roles: string[];
  driverId?: string;
  restaurantId?: string;
  carRentalIds?: string[];
  hotelId?: string;
  storeId?: string;
}

const EMPTY_ACCESS: UserAccess = {
  isAdmin: false,
  isDriver: false,
  isRestaurantOwner: false,
  isCarRentalOwner: false,
  isHotelOwner: false,
  isFlightManager: false,
  isStoreOwner: false,
  isSupport: false,
  isModerator: false,
  isOperations: false,
  roles: [],
};

let accessRpcAvailable: boolean | null = null;

function normalizeAccess(data: any): UserAccess {
  const roles = Array.isArray(data?.roles) ? data.roles.map(String) : [];
  return {
    isAdmin: Boolean(data?.isAdmin ?? data?.is_admin),
    isDriver: Boolean(data?.isDriver ?? data?.is_driver),
    isRestaurantOwner: Boolean(data?.isRestaurantOwner ?? data?.is_restaurant_owner),
    isCarRentalOwner: Boolean(data?.isCarRentalOwner ?? data?.is_car_rental_owner),
    isHotelOwner: Boolean(data?.isHotelOwner ?? data?.is_hotel_owner),
    isFlightManager: Boolean(data?.isFlightManager ?? data?.is_flight_manager),
    isStoreOwner: Boolean(data?.isStoreOwner ?? data?.is_store_owner),
    isSupport: Boolean(data?.isSupport ?? data?.is_support),
    isModerator: Boolean(data?.isModerator ?? data?.is_moderator),
    isOperations: Boolean(data?.isOperations ?? data?.is_operations),
    roles,
    driverId: data?.driverId ?? data?.driver_id ?? undefined,
    restaurantId: data?.restaurantId ?? data?.restaurant_id ?? undefined,
    carRentalIds: Array.isArray(data?.carRentalIds)
      ? data.carRentalIds
      : Array.isArray(data?.car_rental_ids)
        ? data.car_rental_ids
        : undefined,
    hotelId: data?.hotelId ?? data?.hotel_id ?? undefined,
    storeId: data?.storeId ?? data?.store_id ?? undefined,
  };
}

export const useUserAccess = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["userAccess", userId],
    queryFn: async (): Promise<UserAccess> => {
      if (!userId) {
        return EMPTY_ACCESS;
      }

      if (accessRpcAvailable !== false) {
        const { data, error } = await (supabase as any).rpc("get_my_user_access");
        if (!error && data) {
          accessRpcAvailable = true;
          return normalizeAccess(data);
        }

        if (error?.code === "PGRST202" || error?.code === "42883") {
          accessRpcAvailable = false;
        }
      }

      // Check all access in parallel
      const [userRoles, driver, restaurant, carRentals, hotel, storeProfile] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
        supabase
          .from("drivers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("restaurants")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle(),
        supabase
          .from("rental_cars")
          .select("id")
          .eq("owner_id", userId),
        supabase
          .from("hotels")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle(),
        supabase
          .from("store_profiles")
          .select("id")
          .eq("owner_id", userId)
          .maybeSingle(),
      ]);

      const roles = (userRoles.data || []).map(r => r.role);

      return {
        isAdmin: roles.includes("admin") || roles.includes("super_admin"),
        isDriver: !!driver.data,
        isRestaurantOwner: !!restaurant.data,
        isCarRentalOwner: (carRentals.data?.length ?? 0) > 0,
        isHotelOwner: !!hotel.data,
        isFlightManager: roles.includes("admin") || roles.includes("super_admin"),
        isStoreOwner: !!storeProfile.data,
        isSupport: roles.includes("support"),
        isModerator: roles.includes("moderator"),
        isOperations: roles.includes("operations"),
        roles,
        driverId: driver.data?.id,
        restaurantId: restaurant.data?.id,
        carRentalIds: carRentals.data?.map(c => c.id),
        hotelId: hotel.data?.id,
        storeId: storeProfile.data?.id,
      };
    },
    enabled: !!userId,
  });
};
