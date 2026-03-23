# Especificaciones y Pruebas del API (MCP Server)

## Especificación del Transporte SSE (Server-Sent Events)

Al utilizar el SDK oficial del Model Context Protocol con transporte web, la conexión entre el agente AI (Cliente) y el backend Node.js (Servidor) debe iniciar estableciendo la conexión HTTP GET hacia el Server-Sent Events.

- **URL Base de Conexión**: `[URL]/mcp/sse`
- **Seguridad / Header**: `Authorization: Bearer test-api-key-123`

### Flujo de Conexión del Agente:
1. El agente abre una conexión HTTP `GET /mcp/sse` con el header de autorización.
2. Si es válido (Status 200), el servidor emite un streaming de Eventos. El primer evento será de tipo `endpoint` e indicará la ruta POST real por la cual debe enviar los request JSON-RPC (ej. `POST /mcp/messages?sessionId=...`).
3. El agente envía los mensajes (Call Tools o List Tools) vía Web Petición HTTP formato JSON-RPC hacia ese endpoint POST resultante.

---

## Modos de Prueba

Debido a que bibliotecas limitadas como el polyfill de `EventSource` en Node.js **no soportan el envío nativo de cabeceras HTTP customizadas (Headers)**, los clientes Node limitados pueden arrojar error `401 Unauthorized` si intentan conectarse sin el token inyectable.

Para comprobar la funcionalidad local y pública, prueba usando cliente cURL directo:

### Verificación manual de Conexión (CLI)
Con esta línea, confirmamos que recibimos la URL del websocket interno, demostrando que el Auth Header fue exitoso:

```bash
curl -v -H "Authorization: Bearer test-api-key-123" https://syncmedical-mcp-production.up.railway.app/mcp/sse
```

Expected result:
```http
HTTP/2 200
event: endpoint
data: /mcp/messages?sessionId=...
```

---

## Funciones (Tools) Expuestas por el MCP

El agente AI reconocerá automáticamente las siguientes herramientas a través del protocolo:

### 1. `get_specialties`
Obtiene las especialidades médicas. Sin parámetros de entrada.
- Retorna JSON con: *id, name, description*.

### 2. `get_doctors`
Obtiene los médicos disponibles en el centro.
- Parámetro opcional: `specialtyId` (String). Filtra según el ID de una especialidad.
- Retorna JSON con: *id, name, specialtyId*.

### 3. `get_availability`
Obtiene las horas libres de un especialista en un día concreto. Retorna franjas con estado `isBooked: false`.
- **Requerido**: `doctorId` (ID UUID del Doctor).
- **Requerido**: `date` (Fecha buscada en formato `YYYY-MM-DD`).

### 4. `make_reservation`
Inserta una nueva reserva en el sistema, lo cual marca inmediatamente la franja en `Availability` como `isBooked: true` y guarda el recibo en la tabla de Reservas.
- **Requeridos**:
  - `doctorId` (String)
  - `patientName` (String)
  - `patientPhone` (String)
  - `date` (String, formato YYYY-MM-DD)
  - `time` (String, formato HH:mm)
- Retorna: JSON del recibo final e internal ID de la confirmación.

*(Importante: Si la franja horaria especificada ya fue bloqueada o no existe, la función retornará un Error al agente, lo cual será transmitido al usuario).*
