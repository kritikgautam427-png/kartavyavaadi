import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAllSiteContent } from "./site-content.functions";

export function useSiteContent() {
  const fn = useServerFn(getAllSiteContent);
  return useQuery({
    queryKey: ["site_content"],
    queryFn: () => fn({}),
    staleTime: 30_000,
  });
}
