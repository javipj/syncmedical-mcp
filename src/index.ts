import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'test-api-key-123';

// Setup MCP server
const mcp = new Server(
  {
    name: 'syncmedical-reservations-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
mcp.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_specialties',
        description: 'Obtener la lista de especialidades médicas disponibles.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_doctors',
        description: 'Obtener la lista de médicos, opcionalmente filtrada por ID de especialidad.',
        inputSchema: {
          type: 'object',
          properties: {
            specialtyId: { type: 'string', description: 'ID de la especialidad (opcional)' },
          },
        },
      },
      {
        name: 'get_availability',
        description: 'Obtener la disponibilidad de un médico para una fecha específica.',
        inputSchema: {
          type: 'object',
          properties: {
            doctorId: { type: 'string', description: 'ID del médico' },
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
          },
          required: ['doctorId', 'date'],
        },
      },
      {
        name: 'make_reservation',
        description: 'Realizar una reserva para un paciente en una fecha y hora disponible.',
        inputSchema: {
          type: 'object',
          properties: {
            doctorId: { type: 'string', description: 'ID del médico' },
            patientName: { type: 'string', description: 'Nombre completo del paciente' },
            patientPhone: { type: 'string', description: 'Teléfono del paciente' },
            date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
            time: { type: 'string', description: 'Hora en formato HH:mm' },
          },
          required: ['doctorId', 'patientName', 'patientPhone', 'date', 'time'],
        },
      },
    ],
  };
});

mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'get_specialties') {
      const specialties = await prisma.specialty.findMany();
      return { content: [{ type: 'text', text: JSON.stringify(specialties, null, 2) }] };
    }

    if (name === 'get_doctors') {
      const { specialtyId } = (args || {}) as { specialtyId?: string };
      const doctors = await prisma.doctor.findMany({
        where: specialtyId ? { specialtyId } : undefined,
        include: { specialty: true },
      });
      return { content: [{ type: 'text', text: JSON.stringify(doctors, null, 2) }] };
    }

    if (name === 'get_availability') {
      const { doctorId, date } = args as { doctorId: string; date: string };
      const availabilities = await prisma.availability.findMany({
        where: { doctorId, date, isBooked: false },
        orderBy: { time: 'asc' },
      });
      return { content: [{ type: 'text', text: JSON.stringify(availabilities, null, 2) }] };
    }

    if (name === 'make_reservation') {
      const { doctorId, patientName, patientPhone, date, time } = args as {
        doctorId: string;
        patientName: string;
        patientPhone: string;
        date: string;
        time: string;
      };

      // Transaction to ensure slot is still available and update it
      const result = await prisma.$transaction(async (tx) => {
        const slot = await tx.availability.findFirst({
          where: { doctorId, date, time, isBooked: false },
        });

        if (!slot) {
          throw new Error('Lo sentimos, esa franja horaria ya no está disponible o no existe.');
        }

        await tx.availability.update({
          where: { id: slot.id },
          data: { isBooked: true },
        });

        const reservation = await tx.reservation.create({
          data: {
            doctorId,
            patientName,
            patientPhone,
            date,
            time,
          },
        });

        return reservation;
      });

      return {
        content: [
          {
            type: 'text',
            text: `Reserva confirmada con éxito. Detalles:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }

    throw new Error(`Tool unknown: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error al procesar herramientas: ${error.message}` }],
      isError: true,
    };
  }
});

// Setup Express map
app.use(cors());

// Auth middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const xApiKey = (req.headers['x-api-key'] || '') as string;
  
  // Checking if the API_KEY is present anywhere in either Authorization or x-api-key header
  if (!authHeader.includes(API_KEY) && !xApiKey.includes(API_KEY)) {
    console.warn(`[Auth Failed] Path: ${req.path} | Headers received:`, JSON.stringify(req.headers));
    return res.status(401).json({ error: 'Unauthorized, invalid or missing API key.' });
  }
  next();
});

let transport: SSEServerTransport | null = null;

app.get('/mcp/sse', async (req, res) => {
  transport = new SSEServerTransport('/mcp/messages', res);
  await mcp.connect(transport);
});

app.post('/mcp/messages', express.json(), async (req, res) => {
  if (!transport) {
    return res.status(500).json({ error: 'SSE Transport not completely initialized yet' });
  }
  await transport.handlePostMessage(req, res);
});

app.listen(port, () => {
  console.log(`Medical MCP server is running on port ${port} with SSE at /mcp/sse`);
});
