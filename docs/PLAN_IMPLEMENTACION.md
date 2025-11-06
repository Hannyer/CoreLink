# 📋 Plan de Implementación - Sistema de Gestión Operaciones Turísticas

## 🎯 Objetivo General

Implementar un sistema completo para la gestión de operaciones y planificación de actividades turísticas con dos etapas principales.

---

## 📊 Etapa 1: Panel de Inicio e Ingreso de Reservas

### Panel 1: Inicio de Sesión ✅ (Ya implementado)
- ✅ Sistema de autenticación con roles
- ✅ Usuario Administrador
- ✅ Usuario Operativo

### Panel 2: Ingreso y Gestión de Reservas 📝 (Pendiente)

#### Funcionalidades Requeridas:

1. **Búsqueda de Reservas**
   - Búsqueda por número de referencia
   - Filtros avanzados

2. **Formulario de Reserva**
   - Datos del cliente (nombre)
   - Datos de la agencia (nombre + porcentaje de comisión)
   - Calendario (5 años de proyección)
   - Actividad turística (select)
   - Horario (select)
   - Clasificación: niños/adultos
   - Incluye transporte (sí/no)
   - Punto de recogida (si incluye transporte)
   - Notas/comentarios
   - Condiciones de pago (select: cuenta por cobrar, efectivo, tarjeta, transferencia)
   - Comisión (sí/no)
   - Transporte (lista de puntos de recogida y horarios)

3. **Reportes**
   - Por número de clientes
   - Por día
   - Por horario
   - Reportes periódicos de comisiones

---

## 📊 Etapa 2: Panel de Operaciones y Asignación de Recursos

### Panel 3: Gestión de Actividades Operativas 📝 (Pendiente)

#### Funcionalidades Requeridas:

1. **Gestión de Actividades**
   - Lista de actividades disponibles
   - CRUD de actividades

2. **Asignación de Guías**
   - Lista de guías disponibles por día
   - Estado: ocupado/libre
   - Clasificación: Líder/Normal
   - Asignación automática de guía líder según cantidad de personas
   - Edición manual de rotación

3. **Transporte**
   - Lista de unidades disponibles
   - Información: capacidad, modelo, estado (activo/fuera de circulación)

4. **Horarios**
   - Ajuste de horarios diarios por tour

---

## 🗂️ Estructura de Datos Necesaria

### Entidades Principales:

1. **Reservation (Reserva)**
   - id
   - referenceNumber (número de referencia)
   - clientName
   - agencyName
   - agencyCommissionPercentage
   - activityId
   - schedule (horario)
   - date
   - classification (niños/adultos)
   - includesTransport
   - pickupPoint
   - pickupTime
   - notes
   - paymentMethod (cuenta por cobrar, efectivo, tarjeta, transferencia)
   - hasCommission
   - status (pendiente, confirmada, cancelada, completada)
   - createdAt
   - updatedAt

2. **Activity (Actividad Turística)**
   - id
   - name
   - description
   - duration
   - capacity
   - status (activa/inactiva)

3. **Guide (Guía)**
   - id
   - name
   - email
   - phone
   - isLeader
   - maxPartySize
   - status (activo/inactivo)
   - assignments (asignaciones)

4. **Vehicle (Unidad de Transporte)**
   - id
   - model
   - capacity
   - licensePlate
   - status (activo/fuera de circulación)

5. **PickupPoint (Punto de Recogida)**
   - id
   - name
   - address
   - availableTimes

6. **Schedule (Horario)**
   - id
   - activityId
   - time
   - dayOfWeek
   - isActive

7. **GuideAssignment (Asignación de Guía)**
   - id
   - reservationId
   - guideId
   - date
   - isLeader
   - assignedBy

---

## 📁 Estructura de Archivos a Crear

```
src/
├── types/
│   └── entities.ts          # Tipos de las entidades
├── services/
│   ├── reservationService.ts
│   ├── activityService.ts
│   ├── guideService.ts
│   ├── vehicleService.ts
│   ├── pickupPointService.ts
│   └── scheduleService.ts
├── page/
│   ├── reservations/
│   │   ├── ReservationsPage.tsx
│   │   ├── ReservationForm.tsx
│   │   ├── ReservationList.tsx
│   │   └── ReservationCalendar.tsx
│   ├── activities/
│   │   ├── ActivitiesPage.tsx
│   │   └── ActivityForm.tsx
│   ├── operations/
│   │   ├── OperationsPage.tsx
│   │   ├── GuideAssignment.tsx
│   │   └── ScheduleManagement.tsx
│   └── reports/
│       ├── ReportsPage.tsx
│       └── CommissionReports.tsx
└── components/
    ├── calendar/
    │   └── ReservationCalendar.tsx
    └── reports/
        └── ReportGenerator.tsx
```

---

## 🗓️ Orden de Implementación Sugerido

### Fase 1: Base de Datos y Tipos (Semana 1)
- [ ] Definir tipos TypeScript para todas las entidades
- [ ] Crear servicios base para API
- [ ] Configurar validaciones con Yup

### Fase 2: Gestión de Actividades (Semana 2)
- [ ] CRUD de Actividades
- [ ] Lista de actividades
- [ ] Formulario de actividad

### Fase 3: Gestión de Reservas (Semana 3-4)
- [ ] CRUD de Reservas
- [ ] Búsqueda de reservas
- [ ] Calendario de reservas (5 años)
- [ ] Formulario completo de reserva

### Fase 4: Gestión de Guías y Transporte (Semana 5)
- [ ] CRUD de Guías
- [ ] CRUD de Unidades de Transporte
- [ ] CRUD de Puntos de Recogida
- [ ] Gestión de Horarios

### Fase 5: Asignaciones y Operaciones (Semana 6)
- [ ] Asignación automática de guías
- [ ] Asignación manual de guías
- [ ] Gestión de rotación
- [ ] Vista de operaciones del día

### Fase 6: Reportes (Semana 7)
- [ ] Reportes por clientes
- [ ] Reportes por día/horario
- [ ] Reportes de comisiones
- [ ] Exportación de reportes

---

## 🔧 Componentes Necesarios Adicionales

1. **ReservationCalendar** - Calendario para 5 años
2. **DatePicker** - Selector de fechas
3. **TimePicker** - Selector de horarios
4. **ActivitySelector** - Selector de actividades con filtros
5. **PaymentMethodSelector** - Selector de método de pago
6. **CommissionCalculator** - Calculadora de comisiones
7. **GuideAvailabilityList** - Lista de disponibilidad de guías
8. **VehicleStatusList** - Lista de estado de unidades

---

## 📝 Validaciones Necesarias

### Reserva:
- Número de referencia único
- Cliente requerido
- Actividad requerida
- Fecha requerida y válida (hasta 5 años)
- Si incluye transporte, punto de recogida requerido
- Si tiene comisión, porcentaje requerido

### Actividad:
- Nombre requerido y único
- Capacidad > 0

### Guía:
- Nombre requerido
- Email válido (si se proporciona)
- Si es líder, maxPartySize > 0

---

## 🎨 Interfaces de Usuario Necesarias

1. **Página de Reservas**
   - Lista de reservas con filtros
   - Calendario mensual/anual
   - Formulario modal de crear/editar
   - Vista de detalle de reserva

2. **Página de Actividades**
   - Lista de actividades
   - Formulario de crear/editar

3. **Página de Operaciones**
   - Vista de día seleccionado
   - Lista de reservas del día
   - Asignación de guías
   - Disponibilidad de unidades

4. **Página de Reportes**
   - Filtros de fecha
   - Tablas de reportes
   - Gráficos (opcional)
   - Exportación

---

## ✅ Checklist de Inicio

### Preparación:
- [x] Componentes base creados (FormInput, FormSelect, etc.)
- [x] Sistema de Toast
- [x] Modal y ConfirmDialog
- [ ] Definir tipos de entidades
- [ ] Crear servicios base
- [ ] Configurar rutas

### Implementación:
- [ ] CRUD de Actividades
- [ ] CRUD de Reservas
- [ ] Calendario de reservas
- [ ] CRUD de Guías
- [ ] CRUD de Unidades
- [ ] Sistema de asignaciones
- [ ] Reportes

---

## 🚀 Próximos Pasos Inmediatos

1. Crear tipos TypeScript para todas las entidades
2. Crear servicios base para cada entidad
3. Crear componentes específicos (Calendar, DatePicker, etc.)
4. Implementar CRUD de Actividades primero (más simple)
5. Luego CRUD de Reservas (más complejo)
6. Implementar sistema de asignaciones
7. Implementar reportes

