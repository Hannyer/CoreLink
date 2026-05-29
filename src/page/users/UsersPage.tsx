import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchUsersWithPagination,
  fetchUserRoles,
  createUser,
  updateUser,
  deleteUser,
  type UserRoleOption,
} from "@/services/usersService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { FormCombobox } from "@/components/form/FormCombobox";
import { DatePicker } from "@/components/form/DatePicker";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import type { User, UserFormData } from "@/types/entities";
import type { AxiosError } from "axios";
import { toDateInputValueOrNull, todayDateInputValue } from "@/utils/dateUtils";

// ── helpers ──────────────────────────────────────────────────────────

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

const EMPTY_FORM: UserFormData = {
  cedula: "",
  email: "",
  fullName: "",
  phone: "",
  password: "",
  roleId: "",
  licenseExpirationDate: null,
  speaksEnglish: false,
  status: true,
};

// ── componente ──────────────────────────────────────────────────────

export default function UsersPage() {
  // ── data state ──
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleOptions, setRoleOptions] = useState<UserRoleOption[]>([]);

  // ── modal state ──
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ ...EMPTY_FORM });
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── pagination / filter state ──
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<boolean | null>(null);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);

  // ── hooks ──
  const { confirm, ConfirmDialogComponent } = useConfirm();
  const toast = useToastContext();

  // ── effects ──

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, pageSize, statusFilter, roleFilter]);

  // ── loaders ──

  const loadRoles = async () => {
    try {
      const roles = await fetchUserRoles();
      setRoleOptions(roles);
    } catch (error) {
      console.error("Error al cargar roles:", error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchUsersWithPagination(
        page,
        pageSize,
        statusFilter,
        roleFilter
      );
      setUsers(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error("Error al cargar usuarios:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  // ── derived ──

  const selectedRole = roleOptions.find((r) => r.value === formData.roleId);
  const requiresLicense =
    selectedRole?.requiresLicense ?? editingUser?.roleRequiresLicense ?? false;

  // ── handlers ──

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ ...EMPTY_FORM });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      cedula: user.cedula,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      password: "", // nunca cargamos la contraseña
      roleId: user.roleId,
      licenseExpirationDate: toDateInputValueOrNull(user.licenseExpirationDate),
      speaksEnglish: user.speaksEnglish,
      status: user.status,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleDeactivate = async (id: string) => {
    const confirmed = await confirm({
      title: "Desactivar usuario",
      message:
        "¿Deseas desactivar este usuario? No podrá acceder al sistema.",
      variant: "danger",
      confirmText: "Desactivar",
      cancelText: "Cancelar",
    });

    if (!confirmed) return;

    try {
      await deleteUser(id);
      toast.success("Usuario desactivado correctamente");

      if (users.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error("Error al desactivar usuario:", error);
      toast.error(getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── validaciones ──
    if (!formData.cedula.trim()) {
      toast.error("La cédula es requerida");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("El email es requerido");
      return;
    }
    if (!formData.fullName.trim()) {
      toast.error("El nombre completo es requerido");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("El teléfono es requerido");
      return;
    }
    if (!editingUser && !formData.password) {
      toast.error("La contraseña es requerida");
      return;
    }
    if (!formData.roleId) {
      toast.error("El rol es requerido");
      return;
    }
    if (requiresLicense && !formData.licenseExpirationDate) {
      toast.error(
        "La fecha de vencimiento de licencia es requerida para este rol"
      );
      return;
    }

    try {
      setFormLoading(true);

      if (editingUser) {
        // En update, solo mandamos los campos que cambiaron
        const payload: Partial<UserFormData> = {
          cedula: formData.cedula,
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          roleId: formData.roleId,
          licenseExpirationDate: formData.licenseExpirationDate,
          speaksEnglish: formData.speaksEnglish,
          status: formData.status,
        };

        // Solo enviar password si el usuario escribió una nueva
        if (formData.password) {
          payload.password = formData.password;
        }

        await updateUser(editingUser.id, payload);
        toast.success("Usuario actualizado correctamente");
      } else {
        await createUser(formData);
        toast.success("Usuario creado correctamente");
      }

      setShowModal(false);
      await loadUsers();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setFormLoading(false);
    }
  };

  // ── columnas de la tabla ──

  const columns: Column<User>[] = [
    {
      key: "fullName",
      header: "Nombre",
      accessor: (u) => u.fullName,
    },
    {
      key: "cedula",
      header: "Cédula",
      width: "130px",
      hideOnMobile: true,
      accessor: (u) => u.cedula,
    },
    {
      key: "email",
      header: "Correo",
      hideOnMobile: true,
      accessor: (u) => u.email,
    },
    {
      key: "roleName",
      header: "Rol",
      width: "150px",
      accessor: (u) => u.roleName ?? "—",
    },
    {
      key: "speaksEnglish",
      header: "Inglés",
      width: "90px",
      align: "center",
      hideOnMobile: true,
      render: (u) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(u.speaksEnglish ? badgeStyles.info : badgeStyles.secondary),
          }}
        >
          {u.speaksEnglish ? "Sí" : "No"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      width: "110px",
      align: "center",
      render: (u) => (
        <span
          style={{
            ...badgeStyles.base,
            ...(u.status ? badgeStyles.success : badgeStyles.danger),
          }}
        >
          {u.status ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "130px",
      align: "center",
      render: (u) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(u)}
            icon={<Edit size={16} />}
            style={{ padding: "4px 8px" }}
            title="Editar"
          />
          {u.status && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDeactivate(u.id)}
              icon={<Trash2 size={16} />}
              style={{ padding: "4px 8px" }}
              title="Desactivar"
            />
          )}
        </div>
      ),
    },
  ];

  // ── filtros (header extra) ──

  const roleFilterOptions = [
    { value: "", label: "Todos los roles" },
    ...roleOptions.map((r) => ({ value: String(r.value), label: r.label })),
  ];

  const headerExtra = (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {/* Filtro por estado */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button
          variant={statusFilter === null ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(null);
            setPage(1);
          }}
        >
          Todos
        </Button>
        <Button
          variant={statusFilter === true ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(true);
            setPage(1);
          }}
        >
          Activos
        </Button>
        <Button
          variant={statusFilter === false ? "primary" : "outline"}
          size="sm"
          onClick={() => {
            setStatusFilter(false);
            setPage(1);
          }}
        >
          Inactivos
        </Button>
      </div>

      {/* Filtro por rol */}
      <select
        value={roleFilter ?? ""}
        onChange={(e) => {
          setRoleFilter(e.target.value || null);
          setPage(1);
        }}
        style={{
          height: "32px",
          borderRadius: "6px",
          border: "1px solid rgba(0,0,0,0.15)",
          padding: "0 28px 0 10px",
          fontSize: "0.875rem",
          backgroundColor: "#fff",
          cursor: "pointer",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 8px center",
        }}
      >
        {roleFilterOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
        Nuevo usuario
      </Button>
    </div>
  );

  // ── render ──

  return (
    <>
      <TableCard<User>
        title="Usuarios del sistema"
        loading={loading}
        data={users}
        columns={columns}
        rowKey={(u) => u.id}
        emptyText="No hay usuarios registrados"
        headerExtra={headerExtra}
        footer={
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            showPageSizeSelector
            pageSizeOptions={[5, 10, 20, 50]}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            disabled={loading}
          />
        }
      />

      {/* ── Modal crear / editar ── */}
      <Modal
        isOpen={showModal}
        onClose={() => !formLoading && setShowModal(false)}
        title={editingUser ? "Editar usuario" : "Nuevo usuario"}
        size="lg"
        closeOnBackdropClick={!formLoading}
        showCloseButton={!formLoading}
      >
        <form onSubmit={handleSubmit}>
          {/* Fila 1: Cédula + Nombre */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormInput
              label="Cédula"
              value={formData.cedula}
              onChange={(e) =>
                setFormData({ ...formData, cedula: e.target.value })
              }
              required
              fullWidth
              disabled={formLoading}
              placeholder="Ej: 123456789"
            />
            <FormInput
              label="Nombre completo"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              fullWidth
              disabled={formLoading}
              placeholder="Ej: Juan Pérez"
            />
          </div>

          {/* Fila 2: Email + Teléfono */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <FormInput
              label="Correo electrónico"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              fullWidth
              disabled={formLoading}
              placeholder="correo@ejemplo.com"
            />
            <FormInput
              label="Teléfono"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              required
              fullWidth
              disabled={formLoading}
              placeholder="Ej: 8888-8888"
            />
          </div>

          {/* Fila 3: Contraseña */}
          <div style={{ position: "relative" }}>
            <FormInput
              label={
                editingUser
                  ? "Nueva contraseña (dejar vacío para no cambiar)"
                  : "Contraseña"
              }
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!editingUser}
              fullWidth
              disabled={formLoading}
              placeholder={
                editingUser ? "••••••••" : "Ingrese una contraseña segura"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "38px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                color: "#64748b",
              }}
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Fila 4: Rol */}
          <FormCombobox
            label="Rol"
            options={roleOptions}
            value={formData.roleId}
            onChange={(val) =>
              setFormData({
                ...formData,
                roleId: String(val),
                // Limpiar fecha de licencia si el nuevo rol no la requiere
                ...(!(
                  roleOptions.find((r) => r.value === String(val))
                    ?.requiresLicense
                )
                  ? { licenseExpirationDate: null }
                  : {}),
              })
            }
            required
            fullWidth
            disabled={formLoading}
            placeholder="Seleccionar un rol..."
            searchPlaceholder="Buscar rol..."
          />

          {/* Fila 5: Fecha licencia (condicional) */}
          {requiresLicense && (
            <DatePicker
              label="Fecha de vencimiento de licencia"
              value={formData.licenseExpirationDate ?? ""}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  licenseExpirationDate: val ? val : null,
                })
              }
              minDate={
                editingUser ? "1970-01-01" : todayDateInputValue()
              }
              required
              fullWidth
              disabled={formLoading}
              placeholder="Seleccionar fecha"
              helperText="Puedes elegir cualquier fecha desde hoy en adelante"
            />
          )}

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            <FormCheckbox
              label="Habla inglés"
              checked={formData.speaksEnglish ?? false}
              onChange={(e) =>
                setFormData({ ...formData, speaksEnglish: e.target.checked })
              }
              disabled={formLoading}
            />
            <FormCheckbox
              label="Activo"
              checked={formData.status ?? true}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.checked })
              }
              disabled={formLoading}
            />
          </div>

          {/* Botones */}
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
              {editingUser ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
