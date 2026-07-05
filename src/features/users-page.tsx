import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createOperator, updateOperator, deleteOperator } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";

type Operator = {
  id: string;
  username: string;
  full_name: string;
  field_id: string | null;
  field_name: string | null;
};

export function UsersPage() {
  const qc = useQueryClient();
  const del = useServerFn(deleteOperator);

  const fieldsQ = useQuery({
    queryKey: ["fields"],
    queryFn: async () => {
      const { data, error } = await supabase.from("fields").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const opsQ = useQuery({
    queryKey: ["operators"],
    queryFn: async (): Promise<Operator[]> => {
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "operator");
      if (rErr) throw rErr;
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, field_id, fields(name)")
        .in("id", ids)
        .order("full_name");
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        username: p.username,
        full_name: p.full_name,
        field_id: p.field_id,
        field_name: (p as { fields?: { name: string } | null }).fields?.name ?? null,
      }));
    },
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Operator | null>(null);
  const [deleting, setDeleting] = useState<Operator | null>(null);

  const doDelete = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Operator dihapus");
      qc.invalidateQueries({ queryKey: ["operators"] });
      setDeleting(null);
    },
    onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Operator</h1>
          <p className="text-sm text-muted-foreground">Kelola akun operator per bidang.</p>
        </div>
        <Button onClick={() => setCreating(true)} disabled={(fieldsQ.data?.length ?? 0) === 0} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Tambah Operator
        </Button>
      </div>

      {(fieldsQ.data?.length ?? 0) === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-900">
            Tambahkan bidang terlebih dahulu sebelum membuat operator.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Operator</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {opsQ.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Bidang</TableHead>
                  <TableHead className="w-[140px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opsQ.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Belum ada operator.
                    </TableCell>
                  </TableRow>
                ) : (
                  opsQ.data?.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.full_name}</TableCell>
                      <TableCell className="font-mono text-sm">{o.username}</TableCell>
                      <TableCell>
                        {o.field_name ? (
                          <Badge variant="secondary">{o.field_name}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="icon" variant="ghost" onClick={() => setEditing(o)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleting(o)}
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

      <OperatorDialog
        open={creating}
        onOpenChange={setCreating}
        fields={fieldsQ.data ?? []}
      />
      <OperatorDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        fields={fieldsQ.data ?? []}
        operator={editing ?? undefined}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus operator?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun "{deleting?.full_name}" dan seluruh kegiatan miliknya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && doDelete.mutate(deleting.id)}
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

function OperatorDialog({
  open,
  onOpenChange,
  fields,
  operator,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  fields: { id: string; name: string }[];
  operator?: Operator;
}) {
  const qc = useQueryClient();
  const create = useServerFn(createOperator);
  const update = useServerFn(updateOperator);

  const [fullName, setFullName] = useState(operator?.full_name ?? "");
  const [username, setUsername] = useState(operator?.username ?? "");
  const [password, setPassword] = useState("");
  const [fieldId, setFieldId] = useState(operator?.field_id ?? "");

  useEffect(() => {
  if (!open) return;

  setFullName(operator?.full_name ?? "");
  setUsername(operator?.username ?? "");
  setPassword("");
  setFieldId(operator?.field_id ?? "");
}, [operator, open]);

  const save = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error("Nama wajib diisi");
      if (!fieldId) throw new Error("Bidang wajib dipilih");
      if (operator) {
        await update({
          data: {
            id: operator.id,
            full_name: fullName.trim(),
            field_id: fieldId,
            password: password || "",
          },
        });
      } else {
        if (!username.trim()) throw new Error("Username wajib diisi");
        if (!password || password.length < 6) throw new Error("Password minimal 6 karakter");
        await create({
          data: {
            username: username.trim(),
            password,
            full_name: fullName.trim(),
            field_id: fieldId,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(operator ? "Operator diperbarui" : "Operator dibuat");
      qc.invalidateQueries({ queryKey: ["operators"] });
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
          <DialogTitle>{operator ? "Edit Operator" : "Tambah Operator"}</DialogTitle>
          <DialogDescription>
            {operator
              ? "Ubah data operator. Kosongkan password jika tidak diganti."
              : "Buat akun operator baru yang ditautkan ke sebuah bidang."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!!operator}
            />
          </div>
          <div className="space-y-2">
            <Label>Password {operator ? "(opsional)" : ""}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={operator ? "Kosongkan jika tidak diganti" : "min. 6 karakter"}
            />
          </div>
          <div className="space-y-2">
            <Label>Bidang</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih bidang" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
