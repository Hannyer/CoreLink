import { useEffect, useState } from "react";
import { TableCard, badgeStyles, type Column } from "@/components/ui/TableCard";
import {
  fetchUsersWithPagination,
  fetchUserRoles,
  createUser,
  updateUser,
  deleteUser,
  fetchLicenseTypes,
  type UserRoleOption,
} from "@/services/usersService";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/form/FormInput";
import { FormCheckbox } from "@/components/form/FormCheckbox";
import { FormCombobox } from "@/components/form/FormCombobox";
import { useConfirm } from "@/hooks/useConfirm";
import { useToastContext } from "@/contexts/ToastContext";
import { Edit, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import type { LicenseType, User, UserFormData } from "@/types/entities";
import type { AxiosError } from "axios";
import { todayDateInputValue } from "@/utils/dateUtils";
import { getLanguages, type Language } from "@/services/languageService";
import { usePermissions } from "@/hooks/usePermissions";

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
  languageIds: [],
  licenses: [],
  status: true,
};

/** IDs de rol (ops.role) — deben coincidir con el API */
const ROLE_ID_CONDUCTOR = "b07fe1a3-40e2-4cb8-9fd7-ff6df2a2dba3";
const ROLE_ID_GUIA = "9d3372fa-7180-4f04-9727-374e9b513d53";

// ── componente ──────────────────────────────────────────────────────

export default function UsersPage() {
  const { canWrite, canDelete } = usePermissions();
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
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  const [licenseTypes, setLicenseTypes] = useState<LicenseType[]>([]);
  const [loadingLicenseTypes, setLoadingLicenseTypes] = useState(false);

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
    selectedRole?.requiresLicense ??
    editingUser?.roleRequiresLicense ??
    formData.roleId === ROLE_ID_CONDUCTOR;
  const roleRequiresLanguages =
    selectedRole?.requiresLanguages ??
    editingUser?.roleRequiresLanguages ??
    formData.roleId === ROLE_ID_GUIA;
  const requiresLicenses = requiresLicense || roleRequiresLanguages;

  const loadLanguages = async () => {
    try {
      setLoadingLanguages(true);
      const list = await getLanguages();
      setLanguages(list.filter((l) => l.status !== false));
    } catch (error) {
      console.error("Error al cargar idiomas:", error);
      toast.error("Error al cargar idiomas");
    } finally {
      setLoadingLanguages(false);
    }
  };

  const handleLanguageToggle = (languageId: string) => {
    const current = formData.languageIds ?? [];
    const next = current.includes(languageId)
      ? current.filter((id) => id !== languageId)
      : [...current, languageId];
    setFormData({ ...formData, languageIds: next });
  };

  const loadLicenseTypes = async () => {
    try {
      setLoadingLicenseTypes(true);
      const list = await fetchLicenseTypes();
      setLicenseTypes(list.filter((item) => item.status !== false));
    } catch (error) {
      console.error("Error al cargar tipos de licencia:", error);
      toast.error("Error al cargar tipos de licencia");
    } finally {
      setLoadingLicenseTypes(false);
    }
  };

  const handleLicenseToggle = (licenseTypeId: string) => {
    const current = formData.licenses ?? [];
    const exists = current.some((item) => item.licenseTypeId === licenseTypeId);
    const next = exists
      ? current.filter((item) => item.licenseTypeId !== licenseTypeId)
      : [...current, { licenseTypeId, expirationDate: "" }];
    setFormData({ ...formData, licenses: next });
  };

  const handleLicenseExpirationChange = (licenseTypeId: string, expirationDate: string) => {
    const next = (formData.licenses ?? []).map((item) =>
      item.licenseTypeId === licenseTypeId ? { ...item, expirationDate } : item
    );
    setFormData({ ...formData, licenses: next });
  };

  // ── handlers ──

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({ ...EMPTY_FORM });
    setShowPassword(false);
    setShowModal(true);
    void loadLanguages();
    void loadLicenseTypes();
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
      languageIds: user.languages?.map((l) => l.id) ?? [],
      licenses: user.licenses ?? [],
      status: user.status,
    });
    setShowPassword(false);
    setShowModal(true);
    void loadLanguages();
    void loadLicenseTypes();
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
    if (!formData.roleId) {
      toast.error("El rol es requerido");
      return;
    }
    if (!formData.languageIds || formData.languageIds.length === 0) {
      toast.error("Debe seleccionar al menos un idioma");
      return;
    }
    if (requiresLicenses && (!formData.licenses || formData.licenses.length === 0)) {
      toast.error("Debe seleccionar al menos una licencia para el rol Guía o Conductor");
      return;
    }
    if (requiresLicenses && formData.licenses?.some((item) => !item.expirationDate)) {
      toast.error("Todas las licencias seleccionadas deben tener fecha de vencimiento");
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
          languageIds: formData.languageIds ?? [],
          status: formData.status,
        };

        if (requiresLicenses) {
          payload.licenses = formData.licenses ?? [];
        } else {
          payload.licenses = [];
        }

        // Solo enviar password si el usuario escribió una nueva
        if (formData.password) {
          payload.password = formData.password;
        }

        await updateUser(editingUser.id, payload);
        toast.success("Usuario actualizado correctamente");
      } else {
        const createdUser = await createUser(formData);
        if (createdUser.passwordSetupEmailSent === false) {
          toast.warning("Usuario creado, pero no se pudo enviar el enlace de contraseña. Revisa la configuración de correo.");
        } else {
          toast.success("Usuario creado correctamente. Se envió el enlace para crear contraseña.");
        }
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
          {canWrite && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(u)}
              icon={<Edit size={16} />}
              style={{ padding: "4px 8px" }}
              title="Editar"
            />
          )}
          {canDelete && u.status && (
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

      {canWrite && (
        <Button onClick={handleCreate} icon={<Plus size={18} />} size="sm">
          Nuevo usuario
        </Button>
      )}
    </div>
  );

  // ── render ──

  return (
    <>
      <TableCard<User>
        title="Usuarios del sistema"
        loading={loading}
        data={users}
        columns={columns.filter(col => col.key !== "actions" || canWrite || canDelete)}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0 16px" }}>
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

          {editingUser ? (
            <div style={{ position: "relative" }}>
              <FormInput
                label="Nueva contraseña (dejar vacío para no cambiar)"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                fullWidth
                disabled={formLoading}
                placeholder="Nueva contraseña"
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
          ) : (
            <div className="alert alert-info py-2 small" role="note">
              Al crear el usuario se enviará un enlace a su correo para que genere su contraseña.
            </div>
          )}

          {/* Rol */}
          <FormCombobox
            label="Rol"
            options={roleOptions}
            value={formData.roleId}
            onChange={(val) => {
              const nextRoleId = String(val);
              const nextRole = roleOptions.find((r) => r.value === nextRoleId);
              const nextRequiresLicense =
                nextRole?.requiresLicense ?? nextRoleId === ROLE_ID_CONDUCTOR;
              const nextRoleRequiresLanguages =
                nextRole?.requiresLanguages ?? nextRoleId === ROLE_ID_GUIA;
              const nextRequiresLicenses = nextRequiresLicense || nextRoleRequiresLanguages;

              setFormData({
                ...formData,
                roleId: nextRoleId,
                ...(!nextRequiresLicenses ? { licenses: [] } : {}),
              });

              if (nextRequiresLicenses && licenseTypes.length === 0) {
                void loadLicenseTypes();
              }
            }}
            required
            fullWidth
            disabled={formLoading}
            placeholder="Seleccionar un rol..."
            searchPlaceholder="Buscar rol..."
          />

          {requiresLicenses && (
            <div style={{ marginTop: "8px", marginBottom: "8px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  color: "#1e293b",
                }}
              >
                Licencias <span style={{ color: "#ef4444" }}>*</span>
              </label>
              {loadingLicenseTypes ? (
                <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                  Cargando tipos de licencia...
                </div>
              ) : licenseTypes.length === 0 ? (
                <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                  No hay tipos de licencia disponibles
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: "10px",
                    padding: "12px",
                    border: "1px solid rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    backgroundColor: formLoading ? "#f1f5f9" : "#ffffff",
                    maxHeight: "260px",
                    overflowY: "auto",
                  }}
                >
                  {licenseTypes.map((licenseType) => {
                    const selected = formData.licenses?.find(
                      (item) => item.licenseTypeId === licenseType.id
                    );
                    return (
                      <div
                        key={licenseType.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "12px",
                          alignItems: "center",
                          padding: "10px 12px",
                          border: selected ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
                          borderRadius: "8px",
                          background: selected ? "#eff6ff" : "#ffffff",
                        }}
                      >
                        <FormCheckbox
                          label={licenseType.name}
                          checked={!!selected}
                          onChange={() => handleLicenseToggle(licenseType.id)}
                          disabled={formLoading}
                        />
                        {selected && (
                          <label style={{ display: "grid", gap: "4px", fontSize: "0.8125rem" }}>
                            <span style={{ color: "#475569", fontWeight: 600 }}>Vence</span>
                            <input
                              type="date"
                              value={selected.expirationDate}
                              onChange={(e) =>
                                handleLicenseExpirationChange(licenseType.id, e.target.value)
                              }
                              min={editingUser ? "1970-01-01" : todayDateInputValue()}
                              required
                              disabled={formLoading}
                              style={{
                                width: "100%",
                                height: "36px",
                                borderRadius: "8px",
                                border: "1px solid rgba(0,0,0,0.15)",
                                padding: "0 10px",
                                fontSize: "0.875rem",
                                color: "#1e293b",
                                background: formLoading ? "#f1f5f9" : "#ffffff",
                              }}
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {(!formData.licenses || formData.licenses.length === 0) && (
                <div style={{ marginTop: "6px", fontSize: "0.875rem", color: "#ef4444" }}>
                  Obligatorio para roles Guía o Conductor: seleccione al menos una licencia
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: "8px", marginBottom: "8px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#1e293b",
              }}
            >
              Idiomas <span style={{ color: "#ef4444" }}>*</span>
            </label>
            {loadingLanguages ? (
              <div style={{ color: "#64748b", fontSize: "0.875rem" }}>
                Cargando idiomas...
              </div>
            ) : languages.length === 0 ? (
              <div style={{ color: "#ef4444", fontSize: "0.875rem" }}>
                No hay idiomas disponibles
              </div>
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
                    checked={(formData.languageIds ?? []).includes(language.id)}
                    onChange={() => handleLanguageToggle(language.id)}
                    disabled={formLoading}
                  />
                ))}
              </div>
            )}
            {(!formData.languageIds || formData.languageIds.length === 0) && (
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "0.875rem",
                  color: "#ef4444",
                }}
              >
                Obligatorio: seleccione al menos un idioma
              </div>
            )}
          </div>

          {/* Checkboxes */}
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
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
