import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}

export type AppRole = "admin" | "operator";

export interface AppProfile {
  id: string;
  username: string;
  full_name: string;
  field_id: string | null;
  field_name: string | null;
  role: AppRole;
}

export function useMe() {
  const { user, loading } = useSession();
  const query = useQuery({
    enabled: !!user,
    queryKey: ["me", user?.id],
    queryFn: async (): Promise<AppProfile | null> => {
      if (!user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, full_name, field_id, fields(name)")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!profile) return null;
      const role: AppRole = roles?.some((r) => r.role === "admin") ? "admin" : "operator";
      return {
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        field_id: profile.field_id,
        field_name: (profile as { fields?: { name: string } | null }).fields?.name ?? null,
        role,
      };
    },
  });
  return { ...query, sessionLoading: loading };
}
