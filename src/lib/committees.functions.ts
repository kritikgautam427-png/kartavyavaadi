import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ADMIN_USERNAME = "vansh_kys_founder";
const ADMIN_PASSWORD = "75r136e76v7460469367";
const ADMIN_EMAIL = "vansh_kys_founder@kartavyavaadi.local";

function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export const rotateJoinCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ committee_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // check EB or super admin via RPC
    const { data: isEb } = await supabase.rpc("is_eb_of_committee", {
      _user_id: userId,
      _committee_id: data.committee_id,
    });
    if (!isEb) throw new Error("Not authorized");
    // generate unique code
    for (let i = 0; i < 5; i++) {
      const code = genCode();
      const { error } = await supabase
        .from("committees")
        .update({ join_code: code })
        .eq("id", data.committee_id);
      if (!error) return { code };
    }
    throw new Error("Could not generate code");
  });

export const joinByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        code: z.string().trim().min(4).max(16),
        portfolio_name: z.string().trim().min(1).max(120),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: committee, error: cErr } = await supabaseAdmin
      .from("committees")
      .select("id, name, short_name")
      .eq("join_code", data.code.toUpperCase())
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!committee) throw new Error("Invalid join code");

    // Already in?
    const { data: existing } = await supabaseAdmin
      .from("portfolios")
      .select("id, name")
      .eq("committee_id", committee.id)
      .eq("delegate_user_id", userId)
      .maybeSingle();
    if (existing) return { committee_id: committee.id, portfolio: existing.name, already: true };

    // Unique on (committee_id, name) — suffix if taken
    let name = data.portfolio_name;
    for (let i = 0; i < 5; i++) {
      const { error } = await supabaseAdmin
        .from("portfolios")
        .insert({ committee_id: committee.id, name, delegate_user_id: userId });
      if (!error) return { committee_id: committee.id, portfolio: name, already: false };
      if (!String(error.message).includes("portfolios_committee_id_name_key")) {
        throw new Error(error.message);
      }
      name = `${data.portfolio_name} (${i + 2})`;
    }
    throw new Error("Portfolio name already taken");
  });

export const removeDelegateFromPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ portfolio_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pf } = await supabase
      .from("portfolios")
      .select("committee_id")
      .eq("id", data.portfolio_id)
      .maybeSingle();
    if (!pf) throw new Error("Not found");
    const { data: isEb } = await supabase.rpc("is_eb_of_committee", {
      _user_id: userId,
      _committee_id: pf.committee_id,
    });
    if (!isEb) throw new Error("Not authorized");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portfolios")
      .update({ delegate_user_id: null })
      .eq("id", data.portfolio_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) }).parse(d),
  )
  .handler(async ({ data }) => {
    if (data.username !== ADMIN_USERNAME || data.password !== ADMIN_PASSWORD) {
      throw new Error("Invalid credentials");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Try to find user
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    let user = list?.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: "Vansh (Admin)" },
      });
      if (error) throw new Error(error.message);
      user = created.user!;
    } else {
      // Ensure password matches (idempotent reset)
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true,
      });
    }

    // Ensure roles
    const roles: Array<"super_admin" | "executive_board" | "delegate"> = [
      "super_admin",
      "executive_board",
    ];
    for (const role of roles) {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });
    }

    return { email: ADMIN_EMAIL, password: ADMIN_PASSWORD };
  });
