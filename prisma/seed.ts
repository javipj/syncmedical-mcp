import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpiar base de datos
  await prisma.reservation.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.specialty.deleteMany();

  // Crear especialidades
  const cardiologia = await prisma.specialty.create({
    data: {
      name: 'Cardiología',
      description: 'Especialidad médica dedicada al estudio y tratamiento de las enfermedades del corazón.',
    },
  });

  const medicinaGeneral = await prisma.specialty.create({
    data: {
      name: 'Medicina General',
      description: 'Primer nivel de atención médica, prevención y manejo de enfermedades comunes.',
    },
  });

  const dermatologia = await prisma.specialty.create({
    data: {
      name: 'Dermatología',
      description: 'Especialidad médica encargada del estudio y las enfermedades de la piel.',
    },
  });

  // Crear médicos
  const medico1 = await prisma.doctor.create({
    data: {
      name: 'Dr. Alejandro Gómez',
      specialtyId: cardiologia.id,
    },
  });

  const medico2 = await prisma.doctor.create({
    data: {
      name: 'Dra. María Fernández',
      specialtyId: medicinaGeneral.id,
    },
  });

  const medico3 = await prisma.doctor.create({
    data: {
      name: 'Dr. Roberto Sánchez',
      specialtyId: dermatologia.id,
    },
  });

  // Crear disponibilidades para los próximos 3 días (desde mañana)
  const doctors = [medico1, medico2, medico3];
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
  
  const today = new Date();
  
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];
    
    for (const doctor of doctors) {
      // Dejar algunos huecos aleatorios simulando que ya pasó o no trabaja
      const doctorSlots = timeSlots.filter(() => Math.random() > 0.2);
      
      for (const time of doctorSlots) {
        await prisma.availability.create({
          data: {
            doctorId: doctor.id,
            date: dateStr,
            time: time,
            isBooked: false,
          },
        });
      }
    }
  }

  console.log('Base de datos inicializada con datos de prueba.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
