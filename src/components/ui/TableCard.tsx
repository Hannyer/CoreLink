import React, { type CSSProperties, type ReactNode } from "react";
import { Loading } from "./Loading";
import { Badge } from "./Badge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export type Column<T> = {
  /** clave única de la columna */
  key: string;
  /** encabezado visible */
  header: string;
  /** alineación opcional */
  align?: "left" | "center" | "right";
  /** ancho opcional (ej. '160px' o '20%') */
  width?: string;
  /** render alterno para la celda */
  render?: (row: T) => ReactNode;
  /** acceso simple al campo si no usas render */
  accessor?: (row: T) => ReactNode;
  /** ocultar en móvil */
  hideOnMobile?: boolean;
};

type TableCardProps<T> = {
  title?: string;
  loading?: boolean;
  data: T[];
  columns: Column<T>[];
  rowKey: (row: T) => React.Key;
  emptyText?: string;
  headerExtra?: ReactNode; 
  footer?: ReactNode;
  hover?: boolean;
};

const wrapper: CSSProperties = { padding: "8px 12px" };

const card: CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "24px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const titleStyle: CSSProperties = { marginBottom: "14px", fontWeight: 600, color: "#0f172a" };

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
  borderBottom: "2px solid #e2e8f0",
  background: "#f8fafc",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const rowHover: CSSProperties = { transition: "background 0.2s ease" };

// Exportar badgeStyles para compatibilidad hacia atrás
export const badgeStyles = {
  base: {
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "0.78rem",
    fontWeight: 500,
    display: "inline-block",
  } as CSSProperties,
  success: { background: "#ecfdf5", color: "#047857" } as CSSProperties,
  danger: { background: "#fef2f2", color: "#b91c1c" } as CSSProperties,
  warn: { background: "#fffbeb", color: "#b45309" } as CSSProperties,
  info: { background: "#eff6ff", color: "#1d4ed8" } as CSSProperties,
};

const cardMobile: CSSProperties = {
  background: "#ffffff",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  border: "1px solid rgba(0,0,0,0.06)",
};

const cardTitleMobile: CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 600,
  color: "#64748b",
  marginBottom: "4px",
};

const cardValueMobile: CSSProperties = {
  fontSize: "0.9375rem",
  color: "#1e293b",
  fontWeight: 500,
};

export function TableCard<T>({
  title,
  loading,
  data,
  columns,
  rowKey,
  emptyText = "Sin datos",
  headerExtra,
  footer,
  hover = true,
}: TableCardProps<T>) {
  const isMobile = useMediaQuery('(max-width: 767.98px)');
  const visibleColumns = isMobile ? columns.filter(c => !c.hideOnMobile) : columns;

  return (
    <div style={wrapper}>
      <div style={card}>
        {(title || headerExtra) && (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            marginBottom: 12,
            flexWrap: "wrap",
            gap: "8px"
          }}>
            {title ? <h2 style={titleStyle}>{title}</h2> : <div />}
            {headerExtra}
          </div>
        )}

        {loading ? (
          <Loading variant="spinner" size="md" message="Cargando…" />
        ) : data.length === 0 ? (
          <div style={{ color: "#64748b", padding: "12px 4px", textAlign: "center" }}>{emptyText}</div>
        ) : isMobile ? (
          // Vista de cards para móvil
          <div>
            {data.map((row) => (
              <div key={String(rowKey(row))} style={cardMobile}>
                {visibleColumns.map((c) => {
                  const value = c.render ? c.render(row) : c.accessor ? c.accessor(row) : null;
                  return (
                    <div key={c.key} style={{ marginBottom: "12px" }}>
                      <div style={cardTitleMobile}>{c.header}</div>
                      <div style={cardValueMobile}>{value}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          // Vista de tabla para desktop
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} style={{ ...thStyle, textAlign: c.align ?? "left", width: c.width }}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={rowKey(row)}
                    style={hover ? rowHover : undefined}
                    onMouseEnter={(e) => hover && (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) => hover && (e.currentTarget.style.background = "transparent")}
                  >
                    {columns.map((c) => (
                      <td key={c.key} style={{ ...tdStyle, textAlign: c.align ?? "left" }}>
                        {c.render ? c.render(row) : c.accessor ? c.accessor(row) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
      </div>
    </div>
  );
}
