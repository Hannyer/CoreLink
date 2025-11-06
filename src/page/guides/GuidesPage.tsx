import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import { fetchGuides, type Guide } from "@/services/guidesService";
import { createGuide, updateGuide, deleteGuide } from "@/services/guideService";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { Edit, Trash2, Plus } from "lucide-react";
import type { GuideFormData } from "@/types/entities";

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();

  const [formData, setFormData] = useState<GuideFormData>({
    name: "",
    email: "",
    phone: "",
    isLeader: false,
    maxPartySize: undefined,
    status: "activo",
  });

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const data = await fetchGuides();
      setGuides(data);
    } catch (error) {
      console.error("Error al cargar guías:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      isLeader: false,
      maxPartySize: undefined,
      status: "activo",
    });
    setShowModal(true);
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name,
      email: guide.email || "",
      phone: guide.phone || "",
      isLeader: guide.isLeader,
      maxPartySize: guide.maxPartySize ?? undefined,
      status: guide.status ? "activo" : "inactivo",
    });
    setShowModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Guía",
      message: "¿Estás seguro de que deseas eliminar este guía? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deleteGuide(id);
        await loadGuides();
      } catch (error) {
        console.error("Error al eliminar guía:", error);
        alert("Error al eliminar el guía. Por favor, intenta nuevamente.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert("El nombre es requerido");
      return;
    }

    try {
      setFormLoading(true);
      
      // Convertir status de 'activo'|'inactivo' a boolean para el servicio
      const payload: GuideFormData = {
        ...formData,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      };

      if (editingGuide) {
        await updateGuide(editingGuide.id, payload);
      } else {
        await createGuide(payload);
      }

      setShowModal(false);
      await loadGuides();
    } catch (error) {
      console.error("Error al guardar guía:", error);
      alert("Error al guardar el guía. Por favor, intenta nuevamente.");
    } finally {
      setFormLoading(false);
    }
  };

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
    {
      key: "actions",
      header: "Acciones",
      width: "140px",
      align: "center",
      render: (g) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(g)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(g.id)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          />
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
        Nuevo guía
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<Guide>
        title="Lista de guías"
        loading={loading}
        data={guides}
        columns={columns}
        rowKey={(g) => g.id}
        emptyText="No hay guías aún"
        headerExtra={headerExtra}
      />

      {/* Modal para crear/editar guía */}
      <Modal
        isOpen={showModal}
        onClose={() => !formLoading && setShowModal(false)}
        title={editingGuide ? "Editar Guía" : "Nuevo Guía"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Teléfono"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            fullWidth
            disabled={formLoading}
          />

          <FormInput
            label="Máximo de Personas"
            type="number"
            value={formData.maxPartySize || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxPartySize: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            min={1}
            fullWidth
            disabled={formLoading}
          />

          <FormCheckbox
            label="Es Líder"
            checked={formData.isLeader}
            onChange={(e) => setFormData({ ...formData, isLeader: e.target.checked })}
            disabled={formLoading}
          />

          <FormCheckbox
            label="Activo"
            checked={formData.status === "activo"}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.checked ? "activo" : "inactivo" })
            }
            disabled={formLoading}
          />

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "24px",
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingGuide ? "Guardar Cambios" : "Crear Guía"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
