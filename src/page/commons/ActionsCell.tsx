import { Pencil, Trash2 } from "lucide-react";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
  size?: number;
};

export default function ActionsCell({ onEdit, onDelete, size = 16 }: Props) {
  return (
    <td className="text-end">
      <button
        type="button"
        className="btn btn-sm btn-outline-primary me-2 d-inline-flex align-items-center justify-content-center"
        onClick={onEdit}
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        data-bs-title="Editar"        // <- usa data-bs-title (no title) para evitar conflicto con tooltip nativo
        aria-label="Editar"
      >
        <Pencil size={size} />
      </button>

      <button
        type="button"
        className="btn btn-sm btn-outline-danger d-inline-flex align-items-center justify-content-center"
        onClick={onDelete}
        data-bs-toggle="tooltip"
        data-bs-placement="top"
        data-bs-title="Eliminar"
        aria-label="Eliminar"
      >
        <Trash2 size={size} />
      </button>
    </td>
  );
}
