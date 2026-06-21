# Cafetería Gourmet — NoSQLatte

Proyecto Final — Base de Datos Distribuidas
Universidad Autónoma de Aguascalientes · Centro de Ciencias Básicas
Departamento de Sistemas Electrónicos · Ingeniería en Sistemas Computacionales

> Esta documentación cubre los cuatro entregables documentales que pide el
> enunciado del proyecto: marco **teórico**, documentación **técnica**,
> **diseño** de datos y **diagramas de arquitectura**.

---

## 1. Resumen ejecutivo

NoSQLatte emula el sistema de ventas de una cadena tipo Oxxo/tienda de
abarrotes con **20 sucursales** (tiendas) operando sobre una única base de
datos **distribuida**. Cada sucursal:

- Tiene su propio catálogo de productos e inventario.
- Registra sus propias ventas (altas de pedidos).
- Puede ser consultada de forma independiente en reportes.
- Está restringida: un empleado solo puede operar y ver los datos de la
  sucursal a la que está asignado; un administrador ve todas.

El sistema está compuesto por tres piezas:

| Capa | Tecnología | Carpeta |
|---|---|---|
| Frontend (cliente web) | Angular 19 (standalone) | `cafeteria-web/cafeteria-web` |
| Backend (API REST) | Node.js + Express 5 | `cafeteria-backend` |
| Base de datos distribuida | Apache Cassandra (vía DataStax Astra DB, cloud) | keyspace `cafeteria_gourmet` |

---

## 2. Marco teórico

El proyecto se apoya en los siguientes conceptos de bases de datos
distribuidas:

- **Modelo de datos de amplia columna (wide-column / Cassandra)**: en lugar
  de un modelo relacional normalizado, las tablas se diseñan a partir de las
  consultas que el sistema necesita resolver ("query-first modeling"),
  desnormalizando deliberadamente.
- **Fragmentación horizontal (sharding) por clave de partición**: Cassandra
  distribuye físicamente las filas entre los nodos del clúster según el
  hash de la **partition key**. En este proyecto la partition key de las
  tablas de negocio es `sucursal_id`, por lo que cada tienda corresponde a
  una partición propia y, en un clúster real, puede vivir en un nodo (o
  conjunto de nodos por replicación) distinto.
- **Replicación**: Astra DB (y el `docker-compose.yml` incluido para un
  clúster local) replican cada partición en varios nodos para tolerancia a
  fallos, siguiendo el modelo *peer-to-peer sin nodo maestro* de Cassandra
  (a diferencia de una arquitectura primario-réplica).
- **Consistencia ajustable**: las operaciones usan el nivel de consistencia
  `QUORUM`, balanceando disponibilidad y consistencia (teorema CAP) en vez
  de consistencia estricta o disponibilidad pura.
- **Transparencia de distribución**: el cliente (frontend) y la API nunca
  hablan con un nodo en particular; el driver de Cassandra resuelve a qué
  nodo enrutar cada consulta según la partition key, dando transparencia de
  ubicación y de fragmentación a la capa de aplicación.

---

## 3. Arquitectura del sistema

### 3.1 Arquitectura lógica (despliegue actual)

```mermaid
flowchart LR
    subgraph Cliente["Cliente Web"]
        UI[Angular 19 SPA]
    end

    subgraph API["Backend API REST"]
        EX[Express.js]
        MW[Middleware JWT<br/>auth + rol + sucursal]
        EX --> MW
    end

    subgraph DB["DataStax Astra DB (Cassandra como servicio)"]
        KS[(Keyspace cafeteria_gourmet)]
        P1[Partición sucursal_id=1]
        P2[Partición sucursal_id=2]
        P3[Partición sucursal_id=...]
        P20[Partición sucursal_id=20]
        KS --- P1
        KS --- P2
        KS --- P3
        KS --- P20
    end

    UI -- "HTTPS REST + JWT Bearer" --> EX
    MW -- "CQL (cassandra-driver)" --> KS
```

- El **frontend Angular** consume la API vía `HttpClient`; un
  **interceptor** (`auth.interceptor.ts`) adjunta automáticamente el JWT de
  la sesión a cada petición.
- El **backend Express** expone endpoints REST y aplica el middleware de
  autenticación/autorización (`authMiddleware.js`) antes de tocar la base
  de datos.
- La **base de datos** es un clúster Cassandra administrado (Astra DB);
  cada una de las 20 sucursales corresponde a una partición lógica
  independiente dentro del mismo keyspace.

### 3.2 Arquitectura física alterna (clúster on-prem multi-nodo)

El repositorio incluye además [`docker-compose.yml`](docker-compose.yml)
con la definición de un **clúster Cassandra de 3 nodos** desplegable en dos
máquinas (`MAQUINA_A`, `MAQUINA_B`) usando `GossipingPropertyFileSnitch`,
pensado como alternativa autohospedada al servicio cloud, para fines de
demostración del particionamiento/replicación "a mano" si se requiere en la
entrevista:

```mermaid
flowchart TB
    subgraph MaquinaA["Máquina A"]
        N1[cassandra-node1<br/>seed]
    end
    subgraph MaquinaB["Máquina B / red local"]
        N2[cassandra-node2]
        N3[cassandra-node3]
    end
    N1 <-->|Gossip protocol<br/>puerto 7000| N2
    N1 <-->|Gossip protocol| N3
    N2 <-->|Gossip protocol| N3
```

### 3.3 Flujo de autenticación y autorización

```mermaid
sequenceDiagram
    participant U as Usuario (empleado/admin/cliente)
    participant FE as Angular SPA
    participant BE as API Express
    participant MW as Middleware JWT
    participant DB as Cassandra (Astra DB)

    U->>FE: Ingresa usuario/contraseña
    FE->>BE: POST /api/auth/login
    BE->>DB: SELECT usuarios WHERE username=?
    DB-->>BE: password_hash, rol, sucursal_asignada_id
    BE->>BE: bcrypt.compare()
    BE-->>FE: { user, token JWT (rol + sucursal) }
    FE->>FE: guarda token en localStorage

    U->>FE: Solicita reporte de sucursal X
    FE->>BE: GET /api/pedidos/sucursal/X<br/>Authorization: Bearer <token>
    BE->>MW: authenticateToken()
    MW->>MW: restringirAccesoASucursal()<br/>admin: cualquiera<br/>empleado: solo su sucursal
    alt autorizado
        MW->>DB: SELECT pedidos WHERE sucursal_id=X
        DB-->>BE: filas de la partición X
        BE-->>FE: 200 OK + datos
    else no autorizado
        MW-->>FE: 403 Forbidden
    end
```

---

## 4. Modelo de datos y fragmentación

Keyspace `cafeteria_gourmet` (verificado en vivo contra Astra DB):

### `pedidos` (ventas / altas)
```
sucursal_id      int        PARTITION KEY   -- fragmenta por sucursal
fecha_pedido     timestamp  CLUSTERING KEY
pedido_id        timeuuid   CLUSTERING KEY
producto         text
categoria        text
cantidad         int
precio_unitario  decimal
total            decimal
username         text
```

### `productos_por_sucursal` (catálogo + inventario)
```
sucursal_id          int     PARTITION KEY   -- fragmenta por sucursal
producto_id          text    CLUSTERING KEY
nombre_producto       text
categoria             text
descripcion           text
precio_unitario       decimal
cantidad_disponible   int
esta_activo           boolean
```

### `usuarios` (cuentas, cualquier rol)
```
username               text  PARTITION KEY   -- catálogo global de cuentas
nombre_completo        text
password_hash          text
rol                    text  -- 'registrado' | 'empleado' | 'admin'
sucursal_asignada_id   int
```

**Estrategia de fragmentación:** `pedidos` y `productos_por_sucursal` usan
`sucursal_id` como partition key, por lo que cada una de las 20 sucursales
es una partición física independiente: las consultas por sucursal
(`WHERE sucursal_id = ?`) se resuelven en una sola partición sin
`ALLOW FILTERING` y sin tocar datos de otras tiendas. `usuarios` se
mantiene como catálogo global (partición por `username`) porque las cuentas
no pertenecen a una sola tienda (un admin opera sobre todas).

### Estado actual de los datos (snapshot verificado)

| Tabla | Registros | Sucursales distintas |
|---|---|---|
| `pedidos` | ≥257 | 20 (1–20) |
| `productos_por_sucursal` | 200 | 20 (1–20), 10 productos c/u |
| `usuarios` | 203 | — (catálogo global) |

Cumple los mínimos del enunciado: **≥10 tiendas distribuidas** (hay 20) y
**≥200 registros por tabla**.

---

## 5. Seguridad y control de acceso

Requisito del proyecto: *"El sistema deberá restringir el acceso a usuarios
no autorizados dentro de cada sucursal."*

Implementación (`cafeteria-backend/authMiddleware.js`):

- **Autenticación**: login emite un **JWT** (firmado con `JWT_SECRET`,
  expira en 8h) con `username`, `rol` y `sucursal_asignada_id` embebidos.
  Todas las rutas protegidas exigen `Authorization: Bearer <token>`
  (`authenticateToken`).
- **Autorización por rol**: las rutas `/api/admin/*` exigen rol `admin`
  (`requireRole('admin')`).
- **Autorización por sucursal**:
  - Al **registrar una venta** (`POST /api/pedidos`), si quien la registra
    es un `empleado` con sucursal asignada, el backend **sobrescribe**
    `sucursal_id` con la sucursal real del token — un empleado no puede
    registrar ventas a nombre de otra tienda aunque manipule el body de la
    petición (`forzarSucursalEnPedido`).
  - Al **consultar reportes** (`GET /api/pedidos/sucursal/:id`), un
    `empleado` con sucursal asignada solo puede ver la suya; `admin` (y un
    empleado corporativo sin sucursal asignada) puede ver cualquiera
    (`restringirAccesoASucursal`).
- En el frontend, los *route guards* (`auth.guard.ts`, `admin-auth.guard.ts`)
  ocultan rutas según rol, y un **interceptor HTTP**
  (`interceptors/auth.interceptor.ts`) adjunta el JWT a cada request — pero
  la fuente de verdad de la autorización es siempre el backend, no el
  cliente.

Verificado manualmente contra la base de datos real:

| Caso | Resultado |
|---|---|
| Sin token, a cualquier ruta protegida | `401` |
| Token de empleado de sucursal 20 pidiendo su propia sucursal | `200` |
| Token de empleado de sucursal 20 pidiendo la sucursal 1 | `403` |
| Token de empleado en ruta `/api/admin/*` | `403` |
| Token de admin en cualquier sucursal o ruta admin | `200` |
| Empleado de sucursal 20 enviando `sucursal_id: 1` al registrar una venta | la venta se guarda en la sucursal **20** (la real), ignorando el valor manipulado |

> Antes de este cambio, el middleware `isAdmin` era un *no-op*
> (`next()` sin validar nada) y los endpoints de ventas/reportes no exigían
> sesión — cualquiera podía leer o escribir datos de cualquier sucursal
> llamando la API directo. Esto ya quedó corregido.

---

## 6. Funcionalidades (los 3 rubros que pide el enunciado)

| Rubro | Endpoint(s) | Pantalla Angular |
|---|---|---|
| **Altas (ventas)** | `POST /api/pedidos` | `registrar-pedido` |
| **Reportes de ventas** | `GET /api/pedidos/sucursal/:id` | `reportes` (cualquiera de las 20 sucursales para admin; ≥5 sucursales cubiertas de sobra) |
| **Administración** (productos/usuarios) | `/api/admin/*` | `admin/gestion-productos`, `admin/gestion-usuarios` |

---

## 7. Cómo ejecutar el proyecto

### Backend
```bash
cd cafeteria-backend
npm install
# Requiere cafeteria-backend/.env con JWT_SECRET=<valor aleatorio>
npm start        # http://localhost:3000
```

### Frontend
```bash
cd cafeteria-web/cafeteria-web
npm install
ng serve          # http://localhost:4200
```

La conexión a la base de datos usa el *secure connect bundle* de Astra DB
incluido en `cafeteria-backend/secure-connect-nosqlatte-db/`.

---

## 8. Checklist contra los requisitos del proyecto

| Requisito del enunciado | Estado |
|---|---|
| ≥10 tiendas distribuidas | ✅ 20 sucursales |
| ≥200 registros por tabla | ✅ 200–257 según tabla |
| Altas (ventas) y reportes de ≥5 tiendas | ✅ ventas + reportes de las 20 |
| Particionamiento/distribución de datos | ✅ partition key `sucursal_id` en tablas de negocio |
| Restricción de acceso por sucursal | ✅ JWT + roles + verificación de sucursal en backend |
| Documentación técnica/teórica/diseño/arquitectura | ✅ este documento |
| Ejecutable + código fuente / disponible hasta revisión | Pendiente de confirmar despliegue público (Vercel/Heroku via `vercel.json` / `Procfile`) |

## 9. Pendientes recomendados antes de entregar

- **Rotar el token de Astra DB**: está hardcodeado en
  `cafeteria-backend/cassandraService.js` y comprometido en el historial de
  git junto con los certificados de `secure-connect-nosqlatte-db/` y el
  archivo `.env` raíz. Mover a variables de entorno y rotar credenciales en
  la consola de Astra antes de compartir el repositorio públicamente.
- Confirmar con el profesor la fecha de entrega definitiva.
