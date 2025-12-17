import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Custom hook that scrolls to the top of the page whenever the route changes
 */
export default function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}