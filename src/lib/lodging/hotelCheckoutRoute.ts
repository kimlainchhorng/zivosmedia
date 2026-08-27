const HOTEL_CHECKOUT_ROUTE = /^\/hotel\/[^/]+\/book\/?$/;

export const isHotelCheckoutRoute = (pathname: string) =>
  HOTEL_CHECKOUT_ROUTE.test(pathname);
