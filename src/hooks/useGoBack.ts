/**
 * A back handler that cannot strand the user.
 *
 * `navigate(-1)` pops the history stack. When the current page IS the first
 * entry — a shared link, a push notification, a native deep link, or a fresh
 * tab — there is nothing to pop, so the back button does nothing at all and
 * the screen looks stuck. That is not a rare path for a super-app whose
 * services are linked to directly.
 *
 * React Router marks the initial location of a session with `key: "default"`.
 * When that is the current key there is no in-app history, so we send the
 * user somewhere sensible instead of nowhere.
 *
 *   const goBack = useGoBack("/grocery");
 *   <button onClick={goBack} aria-label="Go back">
 */
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function useGoBack(fallbackPath = "/") {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (location.key === "default") {
      // Replace rather than push: the dead entry should not become a
      // forward-stack trap the user can bounce back into.
      navigate(fallbackPath, { replace: true });
      return;
    }
    navigate(-1);
  }, [navigate, location.key, fallbackPath]);
}

export default useGoBack;
