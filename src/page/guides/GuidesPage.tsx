import { useEffect, useState, type CSSProperties } from "react";
import { fetchGuides, type Guide } from "@/services/guidesService";

const wrapper: CSSProperties = { padding: "8px 12px" };

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.95rem",
  color: "#1e293b",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 8px",
  fontWeight: 600,
  color: "#475569",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  background: "#f8fafc",
};

const trHover: CSSProperties = {
  transition: "background 0.2s ease",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(0,0,0,0.05)",
};

const badge = {
  base: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: 500,
  },
  success: {
    background: "#ecfdf5",
    color: "#047857",
  },
  danger: {
    background: "#fef2f2",
    color: "#b91c1c",
  },
};

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

  return (
    <div style={wrapper}>
      <div style={card}>
        <h2 style={{ marginBottom: "14px", fontWeight: 600, color: "#0f172a" }}>
          Guías registrados
        </h2>

        {loading ? (
          <p style={{ color: "#64748b" }}>Cargando…</p>
        ) : (
          <table style={table}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Líder</th>
                <th style={thStyle}>Máx. Personas</th>
                <th style={thStyle}>Estado</th>
              </tr>
            </thead>

            <tbody>
              {guides.map((g) => (
                <tr key={g.id} style={trHover} onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={tdStyle}>{g.name}</td>
                  <td style={tdStyle}>{g.email || "-"}</td>
                  <td style={tdStyle}>{g.phone || "-"}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        ...badge.base,
                        ...(g.isLeader ? badge.success : badge.danger),
                      }}
                    >
                      {g.isLeader ? "Sí" : "No"}
                    </span>
                  </td>
                  <td style={tdStyle}>{g.maxPartySize ?? "-"}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        ...badge.base,
                        ...(g.status ? badge.success : badge.danger),
                      }}
                    >
                      {g.status ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
