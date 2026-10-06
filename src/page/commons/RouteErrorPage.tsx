// src/page/commons/RouteErrorPage.tsx
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function RouteErrorPage() {
  const error = useRouteError();
  console.error(error);

  const message = isRouteErrorResponse(error)
    ? `${error.status} • ${error.statusText}`
    : "Ocurrió un error inesperado. Si tienes activado el traductor del navegador, desactívalo para este sitio e inténtalo de nuevo.";

  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EmptyState
        icon={<AlertTriangle />}
        title="Algo salió mal"
        message={message}
        size="lg"
        action={
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button onClick={() => window.location.reload()}>Recargar página</Button>
            <Button variant="secondary" onClick={() => window.location.assign("/home")}>
              Ir al inicio
            </Button>
          </div>
        }
      />
    </div>
  );
}
