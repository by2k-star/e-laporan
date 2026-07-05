import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_OPTIONS,
  downloadCSV,
  formatIDR,
  pct,
  toCSV,
  type ActivityStatus,
} from "@/lib/activity-utils";

type Row = {
  id: string;
  activity_name: string;
  field_id: string;
  field_name: string;
  operator_name: string;
  budget_pagu: number;
  realization_nilai: number;
  status: ActivityStatus;
  activity_date: string;
  notes: string | null;
};

export function ReportsPage() {
  const [fieldId, setFieldId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState("");

  const fieldsQ = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fields").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const q = useQuery({
    queryKey: ["reports", { fieldId, status, from, to }],
    queryFn: async (): Promise<Row[]> => {
      let query = supabase
        .from("activities")
        .select(
          "id, activity_name, field_id, user_id, budget_pagu, realization_nilai, status, activity_date, notes, fields(name)",
        )
        .order("activity_date", { ascending: false });
      if (fieldId !== "all") query = query.eq("field_id", fieldId);
      if (status !== "all") query = query.eq("status", status as ActivityStatus);
      if (from) query = query.gte("activity_date", from);
      if (to) query = query.lte("activity_date", to);
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        (profs ?? []).forEach((p) => nameMap.set(p.id, p.full_name));
      }
      return rows.map((r) => ({
        id: r.id,
        activity_name: r.activity_name,
        field_id: r.field_id,
        field_name: (r as { fields?: { name: string } | null }).fields?.name ?? "—",
        operator_name: nameMap.get(r.user_id) ?? "—",
        budget_pagu: Number(r.budget_pagu),
        realization_nilai: Number(r.realization_nilai),
        status: r.status,
        activity_date: r.activity_date,
        notes: r.notes,
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!q.data) return [];
    const s = search.trim().toLowerCase();
    return s ? q.data.filter((r) => r.activity_name.toLowerCase().includes(s)) : q.data;
  }, [q.data, search]);

  function exportCSV() {
    const rows = filtered.map((r) => ({
      Kegiatan: r.activity_name,
      Bidang: r.field_name,
      Operator: r.operator_name,
      Pagu: r.budget_pagu,
      Realisasi: r.realization_nilai,
      "Capaian (%)": pct(r.realization_nilai, r.budget_pagu),
      Status: STATUS_LABEL[r.status],
      Tanggal: r.activity_date,
      Catatan: r.notes ?? "",
    }));
    downloadCSV(`laporan-kegiatan-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows));
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Laporan Master</h1>
          <p className="text-sm text-muted-foreground">Semua kegiatan dari seluruh bidang.</p>
        </div>
        <Button onClick={exportCSV} disabled={filtered.length === 0} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Ekspor CSV
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-6">

  <div className="relative md:col-span-2">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Cari nama kegiatan..."
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      className="pl-8"
    />
  </div>

  <div>
    <Select value={fieldId} onValueChange={setFieldId}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Bidang" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Bidang</SelectItem>
        {fieldsQ.data?.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div>
    <Select value={status} onValueChange={setStatus}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Status</SelectItem>
        {STATUS_OPTIONS.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  <div>
    <Input
      type="date"
      value={from}
      onChange={(e) => setFrom(e.target.value)}
      className="w-full"
    />
  </div>

  <div>
    <Input
      type="date"
      value={to}
      onChange={(e) => setTo(e.target.value)}
      className="w-full"
    />
  </div>

</CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {q.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kegiatan</TableHead>
                    <TableHead>Bidang</TableHead>
                    <TableHead className="text-right">Pagu</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Tidak ada data.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          <div>{r.activity_name}</div>
                          <div className="text-xs text-muted-foreground">{r.operator_name}</div>
                        </TableCell>
                        <TableCell>{r.field_name}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatIDR(r.budget_pagu)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatIDR(r.realization_nilai)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {pct(r.realization_nilai, r.budget_pagu)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_BADGE[r.status]}>
                            {STATUS_LABEL[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {r.activity_date}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
