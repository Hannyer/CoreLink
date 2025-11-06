# 📝 Ejemplo de Uso - Componentes CRUD

## 🎯 Ejemplo Completo: CRUD de Guías

Este documento muestra cómo usar todos los componentes creados para implementar un CRUD completo.

---

## 📋 Componentes Disponibles

### Formularios
- ✅ `FormInput` - Input de texto
- ✅ `FormSelect` - Select dropdown
- ✅ `FormTextarea` - Textarea
- ✅ `FormCheckbox` - Checkbox

### UI
- ✅ `ConfirmDialog` - Diálogo de confirmación
- ✅ `Pagination` - Paginación
- ✅ `SearchInput` - Búsqueda con debounce
- ✅ `EmptyState` - Estado vacío
- ✅ `Modal` - Modal para formularios
- ✅ `Button` - Botones
- ✅ `Badge` - Badges
- ✅ `Loading` - Estados de carga

### Hooks
- ✅ `useConfirm` - Hook para confirmaciones
- ✅ `useDebounce` - Hook para debounce
- ✅ `useToastContext` - Hook para notificaciones

---

## 💻 Ejemplo: Página de Guías con CRUD Completo

```typescript
// src/page/guides/GuidesPage.tsx
import { useState, useEffect } from "react";
import { TableCard, type Column } from "@/components/ui/TableCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loading } from "@/components/ui/Loading";
import { useToastContext } from "@/contexts/ToastContext";
import { useConfirm } from "@/hooks/useConfirm";
import { useDebounce } from "@/hooks/useDebounce";
import { 
  FormInput, 
  FormSelect, 
  FormTextarea, 
  FormCheckbox 
} from "@/components/form";
import { fetchGuides, createGuide, updateGuide, deleteGuide, type Guide } from "@/services/guidesService";
import { UserCircle2, Plus, Edit, Trash2 } from "lucide-react";

interface GuideFormData {
  name: string;
  email: string;
  phone: string;
  maxPartySize: number;
  isLeader: boolean;
  status: boolean;
}

export default function GuidesPage() {
  const toast = useToastContext();
  const { confirm, ConfirmDialogComponent } = useConfirm();

  // Estados
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Estados del formulario
  const [showForm, setShowForm] = useState(false);
  const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Estados del formulario
  const [formData, setFormData] = useState<GuideFormData>({
    name: "",
    email: "",
    phone: "",
    maxPartySize: 0,
    isLeader: false,
    status: true,
  });

  // Búsqueda con debounce
  const debouncedSearch = useDebounce(search, 300);

  // Cargar guías
  useEffect(() => {
    loadGuides();
  }, [page, pageSize, debouncedSearch]);

  const loadGuides = async () => {
    try {
      setLoading(true);
      const data = await fetchGuides({ page, pageSize, search: debouncedSearch });
      setGuides(data.items);
      setTotal(data.total);
    } catch (error) {
      toast.error("Error al cargar guías");
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulario para crear
  const handleCreate = () => {
    setEditingGuide(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      maxPartySize: 0,
      isLeader: false,
      status: true,
    });
    setShowForm(true);
  };

  // Abrir formulario para editar
  const handleEdit = (guide: Guide) => {
    setEditingGuide(guide);
    setFormData({
      name: guide.name,
      email: guide.email || "",
      phone: guide.phone || "",
      maxPartySize: guide.maxPartySize || 0,
      isLeader: guide.isLeader,
      status: guide.status,
    });
    setShowForm(true);
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setFormLoading(true);
      
      if (editingGuide) {
        await updateGuide(editingGuide.id, formData);
        toast.success("Guía actualizado exitosamente");
      } else {
        await createGuide(formData);
        toast.success("Guía creado exitosamente");
      }
      
      setShowForm(false);
      loadGuides();
    } catch (error) {
      toast.error("Error al guardar guía");
    } finally {
      setFormLoading(false);
    }
  };

  // Confirmar eliminación
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    
    try {
      await deleteGuide(deleteId);
      toast.success("Guía eliminado exitosamente");
      loadGuides();
    } catch (error) {
      toast.error("Error al eliminar guía");
    } finally {
      setDeleteId(null);
    }
  };

  // Columnas de la tabla
  const columns: Column<Guide>[] = [
    { 
      key: "name", 
      header: "Nombre", 
      accessor: (g) => g.name 
    },
    { 
      key: "email", 
      header: "Email", 
      accessor: (g) => g.email || "-",
      hideOnMobile: true,
    },
    { 
      key: "phone", 
      header: "Teléfono", 
      accessor: (g) => g.phone || "-",
      hideOnMobile: true,
    },
    {
      key: "isLeader",
      header: "Líder",
      width: "120px",
      align: "center",
      render: (g) => (
        <Badge variant={g.isLeader ? "success" : "secondary"}>
          {g.isLeader ? "Sí" : "No"}
        </Badge>
      ),
    },
    {
      key: "maxPartySize",
      header: "Máx. Personas",
      width: "140px",
      align: "center",
      accessor: (g) => g.maxPartySize ?? "-",
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Estado",
      width: "120px",
      align: "center",
      render: (g) => (
        <Badge variant={g.status ? "success" : "danger"}>
          {g.status ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      width: "120px",
      align: "center",
      render: (g) => (
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(g)}
            icon={<Edit size={16} />}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(g.id)}
            icon={<Trash2 size={16} />}
          />
        </div>
      ),
    },
  ];

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <TableCard<Guide>
        title="Lista de guías"
        loading={loading}
        data={guides}
        columns={columns}
        rowKey={(g) => g.id}
        emptyText={
          <EmptyState
            icon={<UserCircle2 />}
            title="No hay guías"
            message="Comienza creando tu primer guía"
            action={
              <Button onClick={handleCreate} icon={<Plus size={18} />}>
                Crear Guía
              </Button>
            }
          />
        }
        headerExtra={
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar guías..."
              size="md"
            />
            <Button onClick={handleCreate} icon={<Plus size={18} />}>
              Nuevo Guía
            </Button>
          </div>
        }
        footer={
          totalPages > 1 && (
            <Pagination
              current={page}
              total={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              showPageSizeSelector
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )
        }
      />

      {/* Modal de Formulario */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingGuide ? "Editar Guía" : "Nuevo Guía"}
        size="md"
      >
        {formLoading ? (
          <Loading variant="spinner" size="md" message="Guardando..." />
        ) : (
          <form onSubmit={handleSubmit}>
            <FormInput
              label="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              fullWidth
              error={!formData.name ? "El nombre es requerido" : undefined}
            />

            <FormInput
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />

            <FormInput
              label="Teléfono"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />

            <FormInput
              label="Máximo de Personas"
              type="number"
              value={formData.maxPartySize}
              onChange={(e) => setFormData({ ...formData, maxPartySize: parseInt(e.target.value) || 0 })}
              min={1}
              fullWidth
            />

            <FormCheckbox
              label="Es Líder"
              checked={formData.isLeader}
              onChange={(e) => setFormData({ ...formData, isLeader: e.target.checked })}
            />

            <FormCheckbox
              label="Activo"
              checked={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
            />

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "24px" }}>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                loading={formLoading}
              >
                {editingGuide ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Diálogo de Confirmación de Eliminación */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Guía"
        message="¿Estás seguro de que deseas eliminar este guía? Esta acción no se puede deshacer."
        variant="danger"
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      {/* Diálogo de Confirmación Global (si usas useConfirm) */}
      <ConfirmDialogComponent />
    </>
  );
}
```

---

## 📝 Ejemplo Simplificado: Solo Lista y Búsqueda

```typescript
import { TableCard } from "@/components/ui/TableCard";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { useDebounce } from "@/hooks/useDebounce";

export default function SimpleListPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  
  // Usar debouncedSearch en tu fetch
  useEffect(() => {
    fetchData(debouncedSearch);
  }, [debouncedSearch]);

  return (
    <TableCard
      title="Mi Lista"
      data={data}
      columns={columns}
      headerExtra={
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar..."
        />
      }
    />
  );
}
```

---

## 🎨 Ejemplo: Formulario con Validación

```typescript
import { FormInput, FormSelect, FormCheckbox } from "@/components/form";
import { useToastContext } from "@/contexts/ToastContext";
import * as yup from "yup";

const schema = yup.object().shape({
  name: yup.string().required("El nombre es requerido"),
  email: yup.string().email("Email inválido"),
  phone: yup.string().matches(/^[0-9]+$/, "Solo números"),
});

function MyForm() {
  const toast = useToastContext();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await schema.validate(formData, { abortEarly: false });
      setErrors({});
      
      // Guardar datos
      toast.success("Guardado exitosamente");
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const validationErrors: Record<string, string> = {};
        err.inner.forEach((error) => {
          if (error.path) {
            validationErrors[error.path] = error.message;
          }
        });
        setErrors(validationErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Nombre"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
        fullWidth
      />

      <FormInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        fullWidth
      />

      <FormCheckbox
        label="Activo"
        checked={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.checked })}
      />

      <Button type="submit">Guardar</Button>
    </form>
  );
}
```

---

## ✅ Checklist de Implementación

- [x] FormInput
- [x] FormSelect
- [x] FormTextarea
- [x] FormCheckbox
- [x] ConfirmDialog
- [x] Pagination
- [x] SearchInput
- [x] EmptyState
- [x] useDebounce
- [x] useConfirm

---

## 🚀 Próximos Pasos

1. Implementar los servicios de API (createGuide, updateGuide, deleteGuide)
2. Añadir validación con Yup
3. Crear más componentes según necesidad (DatePicker, FileUpload, etc.)
4. Optimizar performance con React.memo donde sea necesario

