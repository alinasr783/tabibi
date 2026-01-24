import { useInfiniteQuery } from "@tanstack/react-query";
import { getVisits } from "../../services/apiVisits";

export function useVisits(search, filters = {}, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ["visits", search ?? "", filters, pageSize],
    queryFn: ({ pageParam = 1 }) => getVisits(search, pageParam, pageSize, filters),
    getNextPageParam: (lastPage, allPages) => {
      const totalLoaded = allPages.flatMap(page => page.items).length;
      if (totalLoaded < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });
}
