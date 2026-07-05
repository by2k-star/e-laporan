import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_BADGE,
  STATUS_LABEL,
  STATUS_OPTIONS,
  formatIDR,
  pct,
  type ActivityStatus,
} from "@/lib/activity-utils";

type Activity = {
  id: string;
  activity_name: string;
  budget_pagu: number;
  realization_nilai: number;
  status: ActivityStatus;
  activity_date: string;
  notes: string | null;
  field_id: string;
  user_id: string;
};

export function MyActivitiesPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);
  const [deleting, setDeleting] = useState<Activity | null>(null);

  const q = useQuery({
    enabled: !!me,
    queryKey: ["my-activities", me?.id],
    queryFn: async (): Promise<Activity[]> => {
      const { data, error } = await supabase
        .from("activities")
        .select(
          "id, activity_name, budget_pagu, realization_nilai, status, activity_date, notes, field_id, user_id",
        )
        .eq("user_id", me!.id)
        .order("activity_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        budget_pagu: Number(r.budget_pagu),
        realization_nilai: Number(r.realization_nilai),
      }));
    },
  });

  const filtered = useMemo(() => {
    if (!q.data) return [];
    const s = search.trim().toLowerCase();
    return s ? q.data.filter((r) => r.activity_name.toLowerCase().includes(s)) : q.data;
  }, [q.data, search]);

  const totals = useMemo(() => {
    const budget = (q.data ?? []).reduce((a, b) => a + b.budget_pagu, 0);
    const real = (q.data ?? []).reduce((a, b) => a + b.realization_nilai, 0);
    return { budget, real, pct: pct(real, budget) };
  }, [q.data]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("activities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kegiatan dihapus");
      qc.invalidateQueries({ queryKey: ["my-activities"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
  });

  if (!me) return null;

  if (!me.field_id) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-6 text-sm text-amber-900">
            Akun operator Anda belum ditautkan ke bidang. Hubungi admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Kegiatan Saya</h1>
          <p className="text-sm text-muted-foreground">
            Bidang: <span className="font-medium">{me.field_name}</span>
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Tambah Kegiatan
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard title="Total Pagu" value={formatIDR(totals.budget)} />
        <StatCard title="Total Realisasi" value={formatIDR(totals.real)} />
        <StatCard title="Capaian" value={`${totals.pct}%`} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Daftar Kegiatan</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kegiatan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                    <TableHead className="text-right">Pagu</TableHead>
                    <TableHead className="text-right">Realisasi</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Belum ada kegiatan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.activity_name}</TableCell>
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
                        <TableCell className="text-right space-x-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleting(r)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <ActivityDialog
        open={creating}
        onOpenChange={setCreating}
        userId={me.id}
        fieldId={me.field_id}
      />
      <ActivityDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        userId={me.id}
        fieldId={me.field_id}
        activity={editing ?? undefined}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kegiatan?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.activity_name}" akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && del.mutate(deleting.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function ActivityDialog({
  open,
  onOpenChange,
  userId,
  fieldId,
  activity,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  fieldId: string;
  activity?: Activity;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(activity?.activity_name ?? "");
  const [budget, setBudget] = useState(activity ? String(activity.budget_pagu) : "");
  const [real, setReal] = useState(activity ? String(activity.realization_nilai) : "0");
  const [status, setStatus] = useState<ActivityStatus>(activity?.status ?? "belum_dilaksanakan");
  const [date, setDate] = useState(activity?.activity_date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(activity?.notes ?? "");

  useEffect(() => {
  if (!open) return;

  setName(activity?.activity_name ?? "");
  setBudget(activity ? String(activity.budget_pagu) : "");
  setReal(activity ? String(activity.realization_nilai) : "0");
  setStatus(activity?.status ?? "belum_dilaksanakan");
  setDate(activity?.activity_date ?? new Date().toISOString().slice(0, 10));
  setNotes(activity?.notes ?? "");
}, [activity, open]);

  const save = useMutation({
    mutationFn: async () => {
      const b = Number(budget);
      const r = Number(real);
      if (!name.trim()) throw new Error("Nama kegiatan wajib diisi");
      if (!isFinite(b) || b < 0) throw new Error("Pagu harus angka >= 0");
      if (!isFinite(r) || r < 0) throw new Error("Realisasi harus angka >= 0");
      if (!date) throw new Error("Tanggal wajib diisi");

      const payload = {
        activity_name: name.trim(),
        budget_pagu: b,
        realization_nilai: r,
        status,
        activity_date: date,
        notes: notes.trim() || null,
        field_id: fieldId,
        user_id: userId,
      };
      if (activity) {
        const { error } = await supabase.from("activities").update(payload).eq("id", activity.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activities").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(activity ? "Kegiatan diperbarui" : "Kegiatan disimpan");
      qc.invalidateQueries({ queryKey: ["my-activities"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Gagal menyimpan", { description: e.message }),
  });

  return (
    <Dialog
  open={open}
  onOpenChange={onOpenChange}
>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{activity ? "Edit Kegiatan" : "Tambah Kegiatan"}</DialogTitle>
          <DialogDescription>Isi detail kegiatan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Kegiatan</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pagu (Rp)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Realisasi (Rp)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={real}
                onChange={(e) => setReal(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ActivityStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
