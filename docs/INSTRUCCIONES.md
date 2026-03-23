# Sistema de Reservas Médicas (Servidor MCP)

Este proyecto implementa un Servidor MCP (Model Context Protocol) bajo transporte HTTP/SSE que permite a Agentes AI (como Telnyx) consultar disponibilidad médica y efectuar reservas de pacientes.

## Arquitectura

- **Framework**: Node.js + Express
- **Protocolo**: MCP (Model Context Protocol SDK via SSETransport)
- **Base de Datos**: PostgreSQL almacenada en Neon (Serverless)
- **ORM**: Prisma (Migraciones y modelos relacionales)
- **Despliegue**: Railway (con la plataforma enlazada al dominio público)

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo local usando `tsx` y genera el esquema de Prisma.
- `npm run build`: Genera el código para producción en la carpeta `/dist`.
- `npm run start`: Arranca el código precompilado montado en producción.

## Estructura de Base de Datos y Seed

La base de datos contiene cuatro tablas principales:
1. **Specialty** (Especialidades médicas)
2. **Doctor** (Médicos asociados a una especialidad)
3. **Availability** (Franjas horarias disponibles para reservas)
4. **Reservation** (Reservas completadas de un paciente)

Para recrear y rellenar los datos en una nueva DB (o resetear los actuales), se puede ejecutar:
```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```
*(Nota: El archivo de seed.ts borra los datos existentes y crea nueva disponibilidad ficticia para los próximos 3 días a partir del día de su ejecución).*

## Despliegue en Railway

1. Instalar la CLI de Railway y enlazar el proyecto (`railway login`, `railway link`).
2. Configurar las variables `DATABASE_URL` y `API_KEY`.
3. Ejecutar comando para desplegar `railway up` o simplemente pushear a GitHub y Railway reconstruirá el proyecto automáticamente.
