import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@app.local";
const ADMIN_PASSWORD = "admin123";

function emailFromUsername(username: string) {
  return `${username.trim().toLowerCase()}@app.local`;
}

/** Idempotent bootstrap: creates the default admin account on first call. */
export const ensureAdminSeed = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Already seeded?
  const { data: existing } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, seeded: false };

  // Create auth user
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { username: ADMIN_USERNAME, full_name: "Administrator" },
  });

  if (createErr || !created.user) {
    // Might already exist in auth but missing profile/role — try to look up.
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const found = list?.users.find((u) => u.email === ADMIN_EMAIL);
    if (!found) throw new Error(createErr?.message ?? "Failed to create admin");
    await upsertAdminProfile(found.id);
    return { ok: true, seeded: true };
  }

  await upsertAdminProfile(created.user.id);
  return { ok: true, seeded: true };
});

async function upsertAdminProfile(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    username: ADMIN_USERNAME,
    full_name: "Administrator",
    field_id: null,
  });
  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
}

/** Admin-only: create an operator account. */
export const createOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
  parse: (input) =>
    z.object({
      username: z
        .string()
        .trim()
        .min(3)
        .max(40)
        .regex(/^[a-zA-Z0-9_.-]+$/, "Only letters, numbers, . _ - allowed"),
      password: z.string().min(6).max(72),
      full_name: z.string().trim().min(1).max(120),
      field_id: z.string().uuid(),
    }).parse(input),
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = emailFromUsername(data.username);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { username: data.username, full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed to create user");

    const { error: pErr } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      username: data.username,
      full_name: data.full_name,
      field_id: data.field_id,
    });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(pErr.message);
    }
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "operator" });

    return { ok: true, id: created.user.id };
  });

/** Admin-only: update operator profile (name, field, optional new password). */
export const updateOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
  parse: (input) =>
    z.object({
      id: z.string().uuid(),
      full_name: z.string().trim().min(1).max(120),
      field_id: z.string().uuid(),
      password: z.string().min(6).max(72).optional().or(z.literal("")),
    }).parse(input),
})
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name, field_id: data.field_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.password && data.password.length >= 6) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        password: data.password,
      });
      if (pwErr) throw new Error(pwErr.message);
    }
    return { ok: true };
  });

/** Admin-only: delete an operator entirely. */
export const deleteOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator({
  parse: (input) =>
    z.object({
      id: z.string().uuid(),
    }).parse(input),
})
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
