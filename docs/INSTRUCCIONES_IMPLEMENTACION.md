# 🚀 Instrucciones de Implementación

## ✅ Lo que ya está listo

Toda la estructura base está creada y lista para usar:

1. ✅ **Tipos TypeScript** - Todas las entidades definidas
2. ✅ **Servicios** - Funciones para todas las operaciones CRUD
3. ✅ **Componentes Base** - Formularios, UI, modales, etc.
4. ✅ **Hooks** - useDebounce, useConfirm, useMediaQuery
5. ✅ **Sistema de Toast** - Notificaciones globales

---

## 📝 Cómo empezar

### Paso 1: Conectar con tu API Backend

Los servicios están preparados para conectarse a tu API. Solo necesitas:

1. **Verificar las rutas de API** en los servicios:
   - `src/services/reservationService.ts`
   - `src/services/activityService.ts`
   - etc.

2. **Ajustar las rutas** si tu backend usa rutas diferentes:
   ```typescript
   // Actual: /api/reservations/list
   // Si tu backend usa: /api/v1/reservations
   // Cambia en el servicio correspondiente
   ```

3. **Verificar formato de respuesta**:
   - Los servicios esperan `PaginatedResponse<T>` para listas
   - Ajusta si tu API devuelve un formato diferente

### Paso 2: Crear tu primera página (Recomendado: Actividades)

#### Ejemplo: Página de Actividades

```typescript
// src/page/activities/ActivitiesPage.tsx
import { useState, useEffect } from 'react';
import { TableCard, type Column } from '@/components/ui/TableCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastContext } from '@/contexts/ToastContext';
import { useConfirm } from '@/hooks/useConfirm';
import { 
  fetchActivities, 
  createActivity, 
  updateActivity, 
  deleteActivity,
  type Activity 
} from '@/services/activityService';
import { ActivityForm } from './ActivityForm';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function ActivitiesPage() {
  const toast = useToastContext();
  const { confirm, ConfirmDialogComponent } = useConfirm();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await fetchActivities({ page: 1, pageSize: 100 });
      setActivities(data.items);
    } catch (error) {
      toast.error('Error al cargar actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingActivity(null);
    setShowForm(true);
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Eliminar Actividad',
      message: '¿Estás seguro de que deseas eliminar esta actividad?',
      variant: 'danger',
    });

    if (confirmed) {
      try {
        await deleteActivity(id);
        toast.success('Actividad eliminada');
        loadActivities();
      } catch (error) {
        toast.error('Error al eliminar actividad');
      }
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, formData);
        toast.success('Actividad actualizada');
      } else {
        await createActivity(formData);
        toast.success('Actividad creada');
      }
      setShowForm(false);
      loadActivities();
    } catch (error) {
      toast.error('Error al guardar actividad');
    }
  };

  const columns: Column<Activity>[] = [
    { key: 'name', header: 'Nombre', accessor: (a) => a.name },
    { key: 'duration', header: 'Duración (min)', accessor: (a) => a.duration },
    { key: 'capacity', header: 'Capacidad', accessor: (a) => a.capacity },
    {
      key: 'status',
      header: 'Estado',
      render: (a) => (
        <Badge variant={a.status === 'activa' ? 'success' : 'secondary'}>
          {a.status === 'activa' ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (a) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="sm" variant="outline" onClick={() => handleEdit(a)}>
            <Edit size={16} />
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(a.id)}>
            <Trash2 size={16} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <TableCard
        title="Actividades Turísticas"
        data={activities}
        columns={columns}
        loading={loading}
        emptyText={
          <EmptyState
            title="No hay actividades"
            message="Comienza creando tu primera actividad"
            action={
              <Button onClick={handleCreate} icon={<Plus size={18} />}>
                Crear Actividad
              </Button>
            }
          />
        }
        headerExtra={
          <Button onClick={handleCreate} icon={<Plus size={18} />}>
            Nueva Actividad
          </Button>
        }
      />

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingActivity ? 'Editar Actividad' : 'Nueva Actividad'}
      >
        <ActivityForm
          activity={editingActivity}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <ConfirmDialogComponent />
    </>
  );
}
```

### Paso 3: Crear el formulario

```typescript
// src/page/activities/ActivityForm.tsx
import { useState, useEffect } from 'react';
import { FormInput, FormSelect, FormTextarea, FormCheckbox } from '@/components/form';
import { Button } from '@/components/ui/Button';
import type { Activity, ActivityFormData } from '@/types/entities';

interface ActivityFormProps {
  activity?: Activity | null;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  onCancel: () => void;
}

export function ActivityForm({ activity, onSubmit, onCancel }: ActivityFormProps) {
  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    description: '',
    duration: 60,
    capacity: 20,
    status: 'activa',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activity) {
      setFormData({
        name: activity.name,
        description: activity.description || '',
        duration: activity.duration,
        capacity: activity.capacity,
        minCapacity: activity.minCapacity,
        price: activity.price,
        adultPrice: activity.adultPrice,
        childPrice: activity.childPrice,
        status: activity.status,
      });
    }
  }, [activity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormInput
        label="Nombre"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
        fullWidth
      />

      <FormTextarea
        label="Descripción"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        fullWidth
        rows={3}
      />

      <FormInput
        label="Duración (minutos)"
        type="number"
        value={formData.duration}
        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
        min={1}
        required
        fullWidth
      />

      <FormInput
        label="Capacidad Máxima"
        type="number"
        value={formData.capacity}
        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
        min={1}
        required
        fullWidth
      />

      <FormCheckbox
        label="Activa"
        checked={formData.status === 'activa'}
        onChange={(e) => setFormData({ 
          ...formData, 
          status: e.target.checked ? 'activa' : 'inactiva' 
        })}
      />

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {activity ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
```

---

## 🎯 Orden de Implementación Recomendado

### 1. Actividades (Más simple) ⭐
- CRUD completo
- Lista y formulario
- Validaciones básicas

### 2. Guías (Ya existe, mejorar) ⭐
- Ya tienes `GuidesPage.tsx`
- Mejorar con los nuevos componentes
- Agregar CRUD completo

### 3. Reservas (Más complejo) ⭐⭐⭐
- Formulario completo con todos los campos
- Búsqueda por número de referencia
- Calendario básico (luego expandir a 5 años)

### 4. Operaciones (Vista del día) ⭐⭐
- Lista de reservas del día
- Asignación de guías
- Disponibilidad de unidades

### 5. Reportes ⭐
- Reportes básicos
- Exportación

---

## 📚 Recursos Disponibles

### Documentación:
- `PLAN_IMPLEMENTACION.md` - Plan completo
- `RESUMEN_ESTRUCTURA_CREADA.md` - Resumen de lo creado
- `EJEMPLO_USO_CRUD.md` - Ejemplos de uso
- `COMPONENTES_CRUD_NECESARIOS.md` - Lista de componentes

### Código:
- `src/types/entities.ts` - Todos los tipos
- `src/services/` - Todos los servicios
- `src/components/` - Todos los componentes

---

## 💡 Tips Importantes

1. **Siempre usa los tipos**: `import type { Reservation } from '@/types/entities'`
2. **Usa los servicios**: Ya están preparados, solo conectar con tu API
3. **Reutiliza componentes**: `FormInput`, `FormSelect`, etc.
4. **Toast para feedback**: `useToastContext()` para mensajes
5. **Confirmaciones**: `useConfirm()` para eliminar
6. **Validaciones**: Usa Yup para esquemas de validación

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@/types/entities'"
**Solución**: Verifica que `tsconfig.json` tenga el path `@/*` configurado

### Error: "API returns different format"
**Solución**: Ajusta los servicios para adaptarse a tu formato de API

### Error: "Component not found"
**Solución**: Verifica que todos los componentes estén exportados en `index.ts`

---

## ✅ Checklist antes de empezar

- [x] Tipos creados
- [x] Servicios creados
- [x] Componentes base listos
- [ ] Conectar con tu API backend
- [ ] Crear primera página (Actividades)
- [ ] Probar CRUD completo
- [ ] Continuar con otras páginas

---

## 🎉 ¡Listo para empezar!

Toda la base está preparada. Solo necesitas:
1. Conectar con tu API
2. Crear las páginas
3. Implementar la lógica de negocio

**¡Buena suerte con la implementación!** 🚀

