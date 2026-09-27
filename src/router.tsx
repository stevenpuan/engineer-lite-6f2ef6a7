import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";

/** Turn a Supabase / network error into something a 老闆 can read */
function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? String(err);
  if (e?.code === "PGRST301" || /JWT/i.test(msg)) return "登入已過期，請重新登入";
  if (e?.code === "42501" || /row-level security|permission denied/i.test(msg)) return "沒有權限讀取這筆資料";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return "網路連線不穩，請稍後再試";
  return msg;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    // Hooks throw on API errors; without this the page just shows an empty list.
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (typeof window === "undefined") return;
        toast.error(`資料載入失敗：${friendlyError(err)}`, { id: JSON.stringify(query.queryKey) });
        console.error("[query]", query.queryKey, err);
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
