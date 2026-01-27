import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchCompaniesWithPagination,
  createCompany,
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
} from "@/services/companiesService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus } from "lucide-react";
import type { Company, CompanyFormData } from "@/types/entities";
import type { AxiosError } from "axios";

/**
 * Función helper para extraer el mensaje de error del formato del API
 */
function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string; title?: string }>;

  if (axiosError.response?.data?.message) {
    return axiosError.response.data.message;
  }

  if (axiosError.message) {
    return axiosError.message;
  }

  return "Ha ocurrido un error. Por favor, intenta nuevamente.";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // Estado de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);

  const [formData, setFormData] = useState<CompanyFormData & { commissionPercentageInput: string | number }>({
    name: "",
    commissionPercentage: 0,
    commissionPercentageInput: "",
    status: true,
  });

  useEffect(() => {
    loadCompanies();
  }, [page, pageSize, statusFilter]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await fetchCompaniesWithPagination(page, pageSize, statusFilter);
      setCompanies(response.items);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (error) {
      console.error("Error al cargar compañías:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = () => {
    setEditingCompany(null);
    setFormData({
      name: "",
      commissionPercentage: 0,
      commissionPercentageInput: "",
      status: true,
    });
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      commissionPercentage: company.commissionPercentage,
      commissionPercentageInput: company.commissionPercentage,
      status: company.status,
    });
    setShowCompanyModal(true);
  };

  const handleDeleteCompany = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Compañía",
      message: "¿Estás seguro de que deseas eliminar esta compañía? Esta acción no se puede deshacer.",
      variant: "danger",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
    });

    if (confirmed) {
      try {
        await deleteCompany(id);
        toast.success("Compañía eliminada correctamente");

        const currentPageItemCount = companies.length;
        if (currentPageItemCount === 1 && page > 1) {
          setPage(page - 1);
        } else {
          await loadCompanies();
        }
      } catch (error) {
        console.error("Error al eliminar compañía:", error);
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleCompanyStatus(id, !currentStatus);
      toast.success(`Compañía ${!currentStatus ? "activada" : "desactivada"} correctamente`);
      await loadCompanies();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmitCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    // Validar porcentaje de comisión: debe tener un valor y estar entre 0 y 100
    const commissionValue = typeof formData.commissionPercentageInput === 'string' 
      ? (formData.commissionPercentageInput.trim() === '' ? null : parseFloat(formData.commissionPercentageInput.trim()))
      : formData.commissionPercentageInput;

    if (commissionValue === null || isNaN(commissionValue)) {
      toast.error("El porcentaje de comisión es requerido");
      return;
    }

    if (commissionValue < 0 || commissionValue > 100) {
      toast.error("El porcentaje de comisión debe estar entre 0 y 100");
      return;
    }

    try {
      setFormLoading(true);

      const payload: CompanyFormData = {
        name: formData.name.trim(),
        commissionPercentage: commissionValue,
        status: formData.status,
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        toast.success("Compañía actualizada correctamente");
      } else {
        await createCompany(payload);
        toast.success("Compañía creada correctamente");
      }

      setShowCompanyModal(false);
      await loadCompanies();
    } catch (error) {
      console.error("Error al guardar compañía:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<Company>[] = [
    { key: "name", header: "Nombre", accessor: (c) => c.name },
    {
      key: "commissionPercentage",
      header: "Comisión (%)",
      width: "140px",
      align: "center",
      accessor: (c) => `${c.commissionPercentage}%`,
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (c) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(c.status ? badgeStyles.success : badgeStyles.danger),
            cursor: "pointer",
          }}
          onClick={() => handleToggleStatus(c.id, c.status)}
          title="Click para cambiar estado"
        >
          {c.status ? "Activa" : "Inactiva"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "160px",
      align: "center",
      render: (c) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditCompany(c)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteCompany(c.id)}
            icon={<Trash2 size={16} />}
            style={{ padding: "4px 8px" }}
          >
            Eliminar
          </Button>
        </div>
      ),
    },
  ];

  const headerExtra = (
    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button
          variant={statusFilter === null ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(null);
            setPage(1);
          }}
        >
          Todas
        </Button>
        <Button
          variant={statusFilter === true ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(true);
            setPage(1);
          }}
        >
          Activas
        </Button>
        <Button
          variant={statusFilter === false ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(false);
            setPage(1);
          }}
        >
          Inactivas
        </Button>
      </div>
      <Button onClick={handleCreateCompany} icon={<Plus size={18} />} size="sm">
        Nueva compañía
      </Button>
    </div>
  );

  return (
    <>
      <TableCard<Company>
        title="Lista de compañías"
        loading={loading}
        data={companies}
        columns={columns}
        rowKey={(c) => c.id}
        emptyText="No hay compañías aún"
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
              setPage(1);
            }}
            disabled={loading}
          />
        }
      />

      {/* Modal para crear/editar compañía */}
      <Modal
        isOpen={showCompanyModal}
        onClose={() => !formLoading && setShowCompanyModal(false)}
        title={editingCompany ? "Editar Compañía" : "Nueva Compañía"}
        size="md"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmitCompany}>
          <FormInput
            label="Nombre"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Ej: Tourismo ABC S.A."
          />

          <FormInput
            label="Porcentaje de Comisión (%)"
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={formData.commissionPercentageInput}
            onChange={(e) =>
              setFormData({
                ...formData,
                commissionPercentageInput: e.target.value === '' ? '' : e.target.value,
              })
            }
            required
            fullWidth
            disabled={formLoading}
            placeholder="0.0"
          />

          <FormCheckbox
            label="Activa"
            checked={formData.status ?? true}
            onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
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
              onClick={() => setShowCompanyModal(false)}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              {editingCompany ? "Guardar Cambios" : "Crear Compañía"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}

