import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import { fetchGuidesWithPagination, createGuide, updateGuide, deleteGuide } from "@/services/guideService";
import { getLanguages, type Language } from "@/services/languageService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Guide, GuideFormData } from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 */
function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string; title?: string }>;
  
  // Intentar obtener el mensaje del formato del API
  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }
  
  // Si no hay mensaje específico, usar un mensaje genérico
  if (axiosError.message) {
    return axiosError.message;
  }
  
  return "Ha ocurrido un error. Por favor, intenta nuevamente.";
}

export default function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estado para idiomas
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  const [formData, setFormData] = useState<GuideFormData>({
    name: "",
    email: "",
    phone: "",
    status: "activo",
    languageIds: [],
  });

  useEffect(() => {
    loadGuides();
  }, [page, pageSize]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const response = await fetchGuidesWithPagination(page, pageSize);
      setGuides(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error("Error al cargar guías:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const languagesList = await getLanguages();
      setLanguages(languagesList);
    } catch (error) {
      console.error("Error al cargar idiomas:", error);
      toast.error("Error al cargar idiomas");
    } finally {
      setLoadingLanguages(false);
    }
  };

  const handleCreate = () => {
    setEditingGuide(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "activo",
      languageIds: [],
    });
    loadLanguages();
    setShowModal(true);
  };

  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide); console.log(guide);
    setFormData({
      name: guide.name,
      email: guide.email || "",
      phone: guide.phone || "",
      status: guide.status, // Ya es 'activo' | 'inactivo'
      languageIds: guide.languages?.map(lang => lang.id) || [],
    });
    loadLanguages();
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
        toast.success("Guía eliminada correctamente");
        
        // Si solo hay un elemento en la página actual y no es la primera página,
        // volver a la página anterior después de eliminar
        const currentPageItemCount = guides.length;
        if (currentPageItemCount === 1 && page > 1) {
          setPage(page - 1);
        } else {
          await loadGuides();
        }
      } catch (error) {
        console.error("Error al eliminar guía:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    // Validar que se seleccione mínimo un idioma
    if (!formData.languageIds || formData.languageIds.length === 0) {
      toast.error("Debe seleccionar al menos un idioma");
      return;
    }

    try {
      setFormLoading(true);
      
      // Preparar el payload con los datos del formulario
      const payload: GuideFormData = {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        status: formData.status,
        languageIds: formData.languageIds || [], // Asegurar que siempre esté presente
      };

      if (editingGuide) {
        await updateGuide(editingGuide.id, payload);
        toast.success("Guía actualizada correctamente");
      } else {
        await createGuide(payload);
        toast.success("Guía creada correctamente");
      }

      setShowModal(false);
      await loadGuides();
    } catch (error) {
      console.error("Error al guardar guía:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const handleLanguageToggle = (languageId: string) => {
    const currentIds = formData.languageIds || [];
    const newIds = currentIds.includes(languageId)
      ? currentIds.filter(id => id !== languageId)
      : [...currentIds, languageId];
    
    setFormData({ ...formData, languageIds: newIds });
  };

  const columns: Column<Guide>[] = [
    { key: "name", header: "Nombre", accessor: (g) => g.name },
    { key: "email", header: "Email", accessor: (g) => g.email || "-" },
    { key: "phone", header: "Teléfono", accessor: (g) => g.phone || "-" },
    {
      key: "languages",
      header: "Idiomas",
      accessor: (g) => {
        if (!g.languages || g.languages.length === 0) return "-";
        return g.languages.map(l => l.name).join(", ");
      },
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (g) => (
        <span style={{ ...badgeStyles.base, ...(g.status === 'activo' ? badgeStyles.success : badgeStyles.danger) }}>
          {g.status === 'activo' ? "Activo" : "Inactivo"}
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
        footer={
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            showPageSizeSelector={true}
            pageSizeOptions={[5, 10, 20, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1); // Resetear a la primera página cuando cambia el tamaño
            }}
            disabled={loading}
          />
        }
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

          <FormCheckbox
            label="Activo"
            checked={formData.status === "activo"}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.checked ? "activo" : "inactivo" })
            }
            disabled={formLoading}
          />

          <div style={{ marginTop: "16px", marginBottom: "8px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#1e293b",
              }}
            >
              Idiomas <span style={{ color: "#ef4444", marginLeft: "4px" }}>*</span>
            </label>
            {loadingLanguages ? (
              <div style={{ color: "#64748b", fontSize: "0.875rem" }}>Cargando idiomas...</div>
            ) : languages.length === 0 ? (
              <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>No hay idiomas disponibles</div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  padding: "12px",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "8px",
                  backgroundColor: formLoading ? "#f1f5f9" : "#ffffff",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {languages.map((language) => (
                  <FormCheckbox
                    key={language.id}
                    label={`${language.name} (${language.code})`}
                    checked={(formData.languageIds || []).includes(language.id)}
                    onChange={() => handleLanguageToggle(language.id)}
                    disabled={formLoading}
                  />
                ))}
              </div>
            )}
            {(!formData.languageIds || formData.languageIds.length === 0) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "6px",
                  fontSize: "0.875rem",
                  color: "#ef4444",
                }}
              >
                <span>Debe seleccionar al menos un idioma</span>
              </div>
            )}
          </div>

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
