import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, Users, ClipboardList } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatIDR, pct } from "@/lib/activity-utils";

export function AdminDashboard() {
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [fieldsRes, actsRes, opsRes] = await Promise.all([
        supabase.from("fields").select("id, name").order("name"),
        supabase.from("activities").select("field_id, budget_pagu, realization_nilai"),
        supabase.from("user_roles").select("id").eq("role", "operator"),
      ]);
      if (fieldsRes.error) throw fieldsRes.error;
      if (actsRes.error) throw actsRes.error;
      if (opsRes.error) throw opsRes.error;
      return {
        fields: fieldsRes.data ?? [],
        activities: (actsRes.data ?? []).map((a) => ({
          field_id: a.field_id,
          budget_pagu: Number(a.budget_pagu),
          realization_nilai: Number(a.realization_nilai),
        })),
        operatorCount: opsRes.data?.length ?? 0,
      };
    },
  });

  const chartData = useMemo(() => {
    if (!q.data) return [];
    return q.data.fields.map((f) => {
      const rows = q.data.activities.filter((a) => a.field_id === f.id);
      return {
        name: f.name,
        Pagu: rows.reduce((s, r) => s + r.budget_pagu, 0),
        Realisasi: rows.reduce((s, r) => s + r.realization_nilai, 0),
      };
    });
  }, [q.data]);

  const totals = useMemo(() => {
    const b = (q.data?.activities ?? []).reduce((s, r) => s + r.budget_pagu, 0);
    const r = (q.data?.activities ?? []).reduce((s, r) => s + r.realization_nilai, 0);
    return { budget: b, real: r, pct: pct(r, b) };
  }, [q.data]);

  if (q.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">Ringkasan seluruh bidang.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat icon={Building2} label="Bidang" value={String(q.data?.fields.length ?? 0)} />
        <Stat icon={Users} label="Operator" value={String(q.data?.operatorCount ?? 0)} />
        <Stat
          icon={ClipboardList}
          label="Kegiatan"
          value={String(q.data?.activities.length ?? 0)}
        />
        <Stat label="Total Pagu" value={formatIDR(totals.budget)} />
        <Stat label="Realisasi" value={`${formatIDR(totals.real)} · ${totals.pct}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagu vs Realisasi per Bidang</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {chartData.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Belum ada data.
            </div>
          ) : (
            <div className="h-72 w-full min-w-[420px] sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => new Intl.NumberFormat("id-ID", { notation: "compact" }).format(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => formatIDR(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend />
                  <Bar dataKey="Pagu" fill="oklch(0.55 0.15 260)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Realisasi" fill="oklch(0.7 0.16 160)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </div>
        <div className="mt-1 break-words text-base font-semibold tabular-nums sm:text-xl">{value}</div>
      </CardContent>
    </Card>
  );
}
