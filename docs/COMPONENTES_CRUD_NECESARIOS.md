# 🧩 Componentes Necesarios para CRUDs

## 📋 Componentes Críticos para Operaciones CRUD

### 🔴 **ALTA PRIORIDAD** (Esenciales para CRUDs)

#### 1. **FormInput** - Campo de formulario reutilizable
**Necesario para**: Todos los formularios de Create/Edit
- ✅ Label, error, helper text
- ✅ Iconos izquierda/derecha
- ✅ Validación integrada
- ✅ Estados: error, success, disabled
- ✅ Tipos: text, email, password, number, tel, url, etc.

#### 2. **FormSelect** - Select dropdown reutilizable
**Necesario para**: Selección de opciones (estados, roles, categorías)
- ✅ Opciones con label/value
- ✅ Placeholder
- ✅ Búsqueda opcional
- ✅ Múltiple opcional
- ✅ Estados: error, disabled

#### 3. **FormTextarea** - Área de texto reutilizable
**Necesario para**: Descripciones, observaciones, notas
- ✅ Auto-resize opcional
- ✅ Contador de caracteres
- ✅ Validación de longitud
- ✅ Estados: error, disabled

#### 4. **FormCheckbox** - Checkbox reutilizable
**Necesario para**: Booleanos (activo/inactivo, líder/no líder)
- ✅ Label integrado
- ✅ Estados: checked, disabled

#### 5. **ConfirmDialog** - Diálogo de confirmación
**Necesario para**: Confirmar eliminaciones y acciones destructivas
- ✅ Variantes: danger, warning, info
- ✅ Botones personalizables
- ✅ Mensaje personalizable

#### 6. **Pagination** - Componente de paginación
**Necesario para**: Listas con muchos registros
- ✅ Navegación: primera, anterior, siguiente, última
- ✅ Info de página actual/total
- ✅ Selección de tamaño de página
- ✅ Responsive

#### 7. **SearchInput** - Input de búsqueda con debounce
**Necesario para**: Búsquedas en listas
- ✅ Debounce automático
- ✅ Botón de limpiar
- ✅ Icono de búsqueda
- ✅ Loading state opcional

#### 8. **EmptyState** - Estado vacío mejorado
**Necesario para**: Cuando no hay datos
- ✅ Icono/ilustración
- ✅ Título y descripción
- ✅ Acción sugerida (botón crear)

---

### 🟡 **MEDIA PRIORIDAD** (Mejoran UX)

#### 9. **DataTable** - Tabla completa con funcionalidades
**Necesario para**: Tablas avanzadas con filtros, ordenamiento, etc.
- ✅ Filtros por columna
- ✅ Ordenamiento
- ✅ Selección múltiple
- ✅ Acciones en lote
- ✅ Exportar datos

#### 10. **Form** - Wrapper para formularios
**Necesario para**: Validación y manejo de estado
- ✅ Integración con Formik/Yup
- ✅ Manejo de errores
- ✅ Submit handler
- ✅ Loading state

#### 11. **FormRadio** - Radio buttons reutilizable
**Necesario para**: Opciones exclusivas
- ✅ Grupo de radios
- ✅ Layout horizontal/vertical

#### 12. **FormSwitch** - Switch/Toggle
**Necesario para**: Booleanos con mejor UX
- ✅ On/Off visual
- ✅ Estados: checked, disabled

#### 13. **DatePicker** - Selector de fechas
**Necesario para**: Fechas en formularios
- ✅ Selección de fecha
- ✅ Rango de fechas opcional
- ✅ Formato configurable

#### 14. **FileUpload** - Upload de archivos
**Necesario para**: Imágenes, documentos
- ✅ Drag & drop
- ✅ Preview de imágenes
- ✅ Validación de tipo/tamaño
- ✅ Progreso de upload

---

### 🟢 **BAJA PRIORIDAD** (Opcionales)

#### 15. **FormNumber** - Input numérico especializado
**Necesario para**: Números con formato específico
- ✅ Min/max
- ✅ Step
- ✅ Formato (moneda, porcentaje)

#### 16. **FormAutocomplete** - Autocompletado
**Necesario para**: Búsquedas con sugerencias
- ✅ Búsqueda asíncrona
- ✅ Sugerencias
- ✅ Selección múltiple opcional

#### 17. **FormMultiSelect** - Select múltiple
**Necesario para**: Selección de múltiples opciones
- ✅ Tags seleccionados
- ✅ Búsqueda integrada

#### 18. **FormRichText** - Editor de texto enriquecido
**Necesario para**: Descripciones con formato
- ✅ Bold, italic, lists
- ✅ Links
- ✅ Imágenes

---

## 🎯 Plan de Implementación Recomendado

### **Fase 1: Componentes Base para CRUD** (Prioridad 1)
1. ✅ FormInput
2. ✅ FormSelect
3. ✅ FormTextarea
4. ✅ FormCheckbox
5. ✅ ConfirmDialog
6. ✅ Pagination
7. ✅ SearchInput
8. ✅ EmptyState

### **Fase 2: Hooks y Utilidades** (Prioridad 2)
9. ✅ useDebounce
10. ✅ useForm (wrapper para Formik)
11. ✅ useConfirm (hook para ConfirmDialog)

### **Fase 3: Componentes Avanzados** (Prioridad 3)
12. ✅ DataTable
13. ✅ Form
14. ✅ DatePicker
15. ✅ FileUpload

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Formulario de Crear/Editar Guía

```typescript
import { FormInput, FormSelect, FormCheckbox, FormTextarea, Modal, Button } from '@/components';

function GuideForm({ isOpen, onClose, guide, onSubmit }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={guide ? "Editar Guía" : "Nuevo Guía"}>
      <form onSubmit={onSubmit}>
        <FormInput
          label="Nombre"
          name="name"
          required
          error={errors.name}
        />
        
        <FormInput
          label="Email"
          name="email"
          type="email"
          error={errors.email}
        />
        
        <FormInput
          label="Teléfono"
          name="phone"
          type="tel"
          error={errors.phone}
        />
        
        <FormInput
          label="Máximo de Personas"
          name="maxPartySize"
          type="number"
          min={1}
          error={errors.maxPartySize}
        />
        
        <FormCheckbox
          label="Es Líder"
          name="isLeader"
          checked={values.isLeader}
        />
        
        <FormCheckbox
          label="Activo"
          name="status"
          checked={values.status}
        />
        
        <FormTextarea
          label="Observaciones"
          name="observations"
          rows={3}
        />
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit" loading={isSubmitting}>
            {guide ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

### Ejemplo 2: Lista con Búsqueda y Paginación

```typescript
import { TableCard, SearchInput, Pagination, EmptyState, ConfirmDialog } from '@/components';

function GuidesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const confirm = useConfirm();
  
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Eliminar Guía",
      message: "¿Estás seguro de que deseas eliminar este guía?",
      variant: "danger"
    });
    
    if (confirmed) {
      // Eliminar
    }
  };
  
  return (
    <>
      <TableCard
        title="Guías"
        data={guides}
        columns={columns}
        headerExtra={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar guías..."
            />
            <Button onClick={() => setShowForm(true)}>Nuevo Guía</Button>
          </>
        }
        footer={
          <Pagination
            current={page}
            total={totalPages}
            onPageChange={setPage}
          />
        }
        emptyState={
          <EmptyState
            icon={<Users />}
            title="No hay guías"
            message="Comienza creando tu primer guía"
            action={
              <Button onClick={() => setShowForm(true)}>Crear Guía</Button>
            }
          />
        }
      />
      
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId!)}
        title="Eliminar Guía"
        message="Esta acción no se puede deshacer"
        variant="danger"
      />
    </>
  );
}
```

---

## 📦 Dependencias Necesarias

Ya tienes:
- ✅ Formik (para formularios)
- ✅ Yup (para validación)
- ✅ Lucide React (iconos)

Puedes necesitar (opcional):
- `react-datepicker` - Para DatePicker
- `react-dropzone` - Para FileUpload
- `react-select` - Para Select avanzado (opcional, puedes hacerlo custom)

---

## 🚀 Orden de Implementación Sugerido

1. **FormInput** - Base para todos los formularios
2. **FormSelect** - Muy común en CRUDs
3. **FormCheckbox** - Simple y necesario
4. **ConfirmDialog** - Seguridad para delete
5. **Pagination** - Mejora UX en listas
6. **SearchInput** - Búsqueda con debounce
7. **FormTextarea** - Para descripciones
8. **EmptyState** - Mejora UX cuando no hay datos

