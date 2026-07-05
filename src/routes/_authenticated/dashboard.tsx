import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-session";
import { AdminDashboard } from "@/features/admin-dashboard";
import { OperatorDashboard } from "@/features/operator-dashboard";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return me.role === "admin" ? <AdminDashboard /> : <OperatorDashboard me={me} />;
}
