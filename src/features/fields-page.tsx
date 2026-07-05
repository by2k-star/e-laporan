import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Field = { id: string; name: string; created_at: string };

export function FieldsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["fields"],
    queryFn: async (): Promise<Field[]> => {
      const { data, error } = await supabase.from("fields").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [editing, setEditing] = useState<Field | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Field | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fields").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bidang dihapus");
      qc.invalidateQueries({ queryKey: ["fields"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Bidang</h1>
          <p className="text-sm text-muted-foreground">Kelola daftar bidang/unit organisasi.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Tambah Bidang
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Bidang</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {q.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Bidang</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                      Belum ada bidang.
                    </TableCell>
                  </TableRow>
                ) : (
                  q.data?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.name}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(f)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(f)}
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
          )}
        </CardContent>
      </Card>

      <FieldDialog open={creating} onOpenChange={setCreating} />
      <FieldDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        field={editing ?? undefined}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus bidang?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.name}" akan dihapus. Kegiatan dan operator yang tertaut juga terpengaruh.
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

function FieldDialog({
  open,
  onOpenChange,
  field,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  field?: Field;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(field?.name ?? "");

  useEffect(() => {
  if (!open) return;

  setName(field?.name ?? "");
}, [field, open]);

  const save = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Nama wajib diisi");
      if (field) {
        const { error } = await supabase.from("fields").update({ name: trimmed }).eq("id", field.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("fields").insert({ name: trimmed });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(field ? "Bidang diperbarui" : "Bidang ditambahkan");
      qc.invalidateQueries({ queryKey: ["fields"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error("Gagal menyimpan", { description: e.message }),
  });

  return (
    <Dialog
  open={open}
  onOpenChange={onOpenChange}
>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Edit Bidang" : "Tambah Bidang"}</DialogTitle>
          <DialogDescription>Contoh: Bidang Keuangan, Bidang IT, Bidang SDM.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="nm">Nama Bidang</Label>
          <Input id="nm" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
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
