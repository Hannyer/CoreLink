import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import { fetchGuides, type Guide } from "@/services/guidesService";

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setGuides(await fetchGuides());
      setLoading(false);
    })();
  }, []);

  const columns: Column<Guide>[] = [
    { key: "name", header: "Nombre", accessor: (g) => g.name },
    { key: "email", header: "Email", accessor: (g) => g.email || "-" },
    { key: "phone", header: "Teléfono", accessor: (g) => g.phone || "-" },
    {
      key: "isLeader",
      header: "Líder",
      width: "120px",
      align: "center",
      render: (g) => (
        <span style={{ ...badgeStyles.base, ...(g.isLeader ? badgeStyles.success : badgeStyles.danger) }}>
          {g.isLeader ? "Sí" : "No"}
        </span>
      ),
    },
    {
      key: "maxPartySize",
      header: "Máx. Personas",
      width: "140px",
      align: "center",
      accessor: (g) => (g.maxPartySize ?? "-"),
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (g) => (
        <span style={{ ...badgeStyles.base, ...(g.status ? badgeStyles.success : badgeStyles.danger) }}>
          {g.status ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  // Opcional: acciones en el header (ej. crear guía, filtros, exportar)
  const headerExtra = (
    <div style={{ display: "flex", gap: 8 }}>
      {<button className="btn btn-primary btn-sm">Nuevo guía</button> }
    </div>
  );

  return (
    <TableCard<Guide>
      title="Lista de guías"
      loading={loading}
      data={guides}
      columns={columns}
      rowKey={(g) => g.id}
      emptyText="No hay guías aún"
      headerExtra={headerExtra}
    />
  );
}
