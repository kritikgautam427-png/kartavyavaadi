import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAllSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("site_content")
    .select("key, label, category, value, updated_at");
  if (error) throw new Error(error.message);
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return { map, rows: data ?? [] };
});

export const updateSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: unknown }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Check super_admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (!roles?.some((r) => r.role === "super_admin")) {
      throw new Error("Forbidden: super admin required");
    }
    const { error } = await supabase
      .from("site_content")
      .update({ value: data.value as any, updated_by: userId })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
