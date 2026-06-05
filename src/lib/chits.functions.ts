import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ChitTypeEnum = z.enum(["POI", "POO", "POE", "POP", "SUBSTANTIVE", "REPLY"]);

const createChitSchema = z.object({
  committee_id: z.string().uuid(),
  sender_portfolio_id: z.string().uuid(),
  chit_type: ChitTypeEnum,
  target_kind: z.enum(["EXECUTIVE_BOARD", "PORTFOLIO"]),
  target_portfolio_id: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(2).max(4000),
});

export const createChit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createChitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const insert = {
      committee_id: data.committee_id,
      sender_portfolio_id: data.sender_portfolio_id,
      sender_user_id: userId,
      chit_type: data.chit_type,
      target_kind: data.target_kind,
      target_portfolio_id: data.target_kind === "PORTFOLIO" ? data.target_portfolio_id ?? null : null,
      body: data.body,
    };
    const { data: chit, error } = await supabase.from("chits").insert(insert).select().single();
    if (error) throw new Error(error.message);

    // Fire AI scoring in background but await to keep simple
    try {
      await scoreChitInternal(chit.id);
    } catch (e) {
      console.error("AI scoring failed", e);
    }
    return { ok: true, chit };
  });

async function callLovableAI(messages: Array<{ role: string; content: string }>, tools?: any[]) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
    stream: false,
  };
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: "function", function: { name: tools[0].function.name } };
  }
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t}`);
  }
  return await resp.json();
}

async function scoreChitInternal(chitId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: chit } = await supabaseAdmin
    .from("chits")
    .select("id, committee_id, sender_user_id, chit_type, body")
    .eq("id", chitId)
    .single();
  if (!chit) return;
  const { data: criteria } = await supabaseAdmin
    .from("scoring_criteria")
    .select("name, weight, enabled")
    .eq("committee_id", chit.committee_id)
    .eq("enabled", true)
    .order("sort_order");
  const list = (criteria ?? []).map((c) => `- ${c.name} (${Number(c.weight)}%)`).join("\n");

  const tools = [
    {
      type: "function",
      function: {
        name: "submit_chit_score",
        description: "Score a Model UN chit",
        parameters: {
          type: "object",
          properties: {
            overall_score: { type: "number", description: "0-100 weighted overall" },
            breakdown: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  criterion: { type: "string" },
                  score: { type: "number" },
                },
                required: ["criterion", "score"],
                additionalProperties: false,
              },
            },
            justification: { type: "string" },
            strengths: { type: "string" },
            weaknesses: { type: "string" },
          },
          required: ["overall_score", "breakdown", "justification", "strengths", "weaknesses"],
          additionalProperties: false,
        },
      },
    },
  ];

  const sys = `You are an expert Model UN Executive Board evaluator. Score the following ${chit.chit_type} chit on a 0-100 scale per criterion, then give a weighted overall_score (0-100). Be rigorous, fair, and concise.\n\nActive criteria with weights:\n${list || "- Legality (50%)\n- Logic (50%)"}`;

  const ai = await callLovableAI(
    [
      { role: "system", content: sys },
      { role: "user", content: `Chit type: ${chit.chit_type}\n\nChit body:\n${chit.body}` },
    ],
    tools,
  );

  const toolCall = ai.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return;
  const parsed = JSON.parse(toolCall.function.arguments);

  await supabaseAdmin.from("chit_scores").upsert(
    {
      chit_id: chit.id,
      committee_id: chit.committee_id,
      delegate_user_id: chit.sender_user_id,
      ai_recommended_score: parsed.overall_score,
      ai_breakdown: parsed.breakdown,
      ai_justification: parsed.justification,
      ai_strengths: parsed.strengths,
      ai_weaknesses: parsed.weaknesses,
    },
    { onConflict: "chit_id" },
  );
  await supabaseAdmin.from("chits").update({ status: "AI_SCORED" }).eq("id", chit.id);
}

export const rescoreChit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { chit_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: chit } = await supabase
      .from("chits")
      .select("committee_id")
      .eq("id", data.chit_id)
      .single();
    if (!chit) throw new Error("Chit not found");
    const { data: eb } = await supabase
      .from("committee_eb")
      .select("id")
      .eq("committee_id", chit.committee_id)
      .eq("user_id", userId)
      .maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isSuper = roles?.some((r) => r.role === "super_admin");
    if (!eb && !isSuper) throw new Error("Forbidden");
    await scoreChitInternal(data.chit_id);
    return { ok: true };
  });

export const finalizeChitScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    chit_id: string;
    final_score: number;
    final_breakdown?: unknown;
    override_reason?: string;
  }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: scoreRow } = await supabase
      .from("chit_scores")
      .select("committee_id, ai_recommended_score")
      .eq("chit_id", data.chit_id)
      .single();
    if (!scoreRow) throw new Error("Score not found");

    const { error: upErr } = await supabase
      .from("chit_scores")
      .update({
        final_score: data.final_score,
        final_breakdown: data.final_breakdown as any,
        override_reason: data.override_reason ?? null,
        finalized_by: userId,
        finalized_at: new Date().toISOString(),
      })
      .eq("chit_id", data.chit_id);
    if (upErr) throw new Error(upErr.message);

    await supabase.from("chits").update({ status: "FINALIZED" }).eq("id", data.chit_id);

    await supabase.from("score_audit").insert({
      chit_id: data.chit_id,
      committee_id: scoreRow.committee_id,
      evaluator: userId,
      ai_recommended: scoreRow.ai_recommended_score,
      final_score: data.final_score,
      override_reason: data.override_reason ?? null,
    });
    return { ok: true };
  });

export const ebAssistantAnalyze = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { committee_id: string; text: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Must be EB or super_admin
    const { data: eb } = await supabase
      .from("committee_eb")
      .select("id")
      .eq("committee_id", data.committee_id)
      .eq("user_id", userId)
      .maybeSingle();
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isSuper = roles?.some((r) => r.role === "super_admin");
    if (!eb && !isSuper) throw new Error("Forbidden: EB only");

    const { data: criteria } = await supabase
      .from("scoring_criteria")
      .select("name, weight, enabled")
      .eq("committee_id", data.committee_id)
      .eq("enabled", true)
      .order("sort_order");
    const list = (criteria ?? []).map((c) => `- ${c.name} (${Number(c.weight)}%)`).join("\n");

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_chit_score",
          description: "Score MUN text",
          parameters: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              breakdown: {
                type: "array",
                items: {
                  type: "object",
                  properties: { criterion: { type: "string" }, score: { type: "number" } },
                  required: ["criterion", "score"],
                  additionalProperties: false,
                },
              },
              justification: { type: "string" },
              strengths: { type: "string" },
              weaknesses: { type: "string" },
            },
            required: ["overall_score", "breakdown", "justification", "strengths", "weaknesses"],
            additionalProperties: false,
          },
        },
      },
    ];
    const sys = `You are the EB Assistant for a Model UN committee. Provide an advisory score based on the active criteria below. The Executive Board will decide the final score.\n\nActive criteria:\n${list || "(none configured)"}`;
    const ai = await callLovableAI(
      [
        { role: "system", content: sys },
        { role: "user", content: data.text },
      ],
      tools,
    );
    const toolCall = ai.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");
    return JSON.parse(toolCall.function.arguments);
  });
