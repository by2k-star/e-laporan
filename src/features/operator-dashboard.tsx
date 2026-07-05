import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { AppProfile } from "@/hooks/use-session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, ArrowRight } from "lucide-react";
import { STATUS_BADGE, STATUS_LABEL, formatIDR, pct } from "@/lib/activity-utils";
import { Badge } from "@/components/ui/badge";

export function OperatorDashboard({ me }: { me: AppProfile }) {
  const q = useQuery({
    enabled: !!me.field_id,
    queryKey: ["operator-dashboard", me.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id, activity_name, budget_pagu, realization_nilai, status, activity_date")
        .eq("user_id", me.id)
        .order("activity_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      const { data: all, error: e2 } = await supabase
        .from("activities")
        .select("budget_pagu, realization_nilai")
        .eq("user_id", me.id);
      if (e2) throw e2;
      return {
        recent: (data ?? []).map((r) => ({
          ...r,
          budget_pagu: Number(r.budget_pagu),
          realization_nilai: Number(r.realization_nilai),
        })),
        totals: {
          budget: (all ?? []).reduce((s, r) => s + Number(r.budget_pagu), 0),
          real: (all ?? []).reduce((s, r) => s + Number(r.realization_nilai), 0),
          count: (all ?? []).length,
        },
      };
    },
  });

  const totals = useMemo(
    () => ({
      ...q.data?.totals,
      pct: pct(q.data?.totals.real ?? 0, q.data?.totals.budget ?? 0),
    }),
    [q.data],
  );

  if (!me.field_id) {
    return (
      <Card className="mx-auto max-w-2xl border-amber-200 bg-amber-50">
        <CardContent className="py-6 text-sm text-amber-900">
          Akun Anda belum ditautkan ke bidang. Hubungi admin.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">Selamat datang, {me.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            Bidang <span className="font-medium">{me.field_name}</span>
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/my-activities">
            <ClipboardList className="mr-2 h-4 w-4" /> Kelola Kegiatan
          </Link>
        </Button>
      </div>

      {q.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Jumlah Kegiatan" value={String(totals.count ?? 0)} />
            <StatCard title="Total Pagu" value={formatIDR(totals.budget ?? 0)} />
            <StatCard title="Realisasi" value={formatIDR(totals.real ?? 0)} />
            <StatCard title="Capaian" value={`${totals.pct}%`} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kegiatan Terbaru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.data?.recent.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada kegiatan. Tambahkan yang pertama.
                </div>
              ) : (
                q.data?.recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{r.activity_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.activity_date} · {formatIDR(r.realization_nilai)} /{" "}
                        {formatIDR(r.budget_pagu)} ({pct(r.realization_nilai, r.budget_pagu)}%)
                      </div>
                    </div>
                    <Badge variant="outline" className={`${STATUS_BADGE[r.status]} w-fit shrink-0`}>
                      {STATUS_LABEL[r.status]}
                    </Badge>
                  </div>
                ))
              )}
              <div className="pt-2">
                <Link
                  to="/my-activities"
                  className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  Lihat semua <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
        <div className="mt-1 break-words text-lg font-semibold tabular-nums sm:text-2xl">{value}</div>
      </CardContent>
    </Card>
  );
}
