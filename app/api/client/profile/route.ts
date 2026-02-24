import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calcStatus } from '@/lib/status';
import db from '@/db/database';

async function getClientFromRequest(request: NextRequest) {
  const token = request.cookies.get('client_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (payload?.role !== 'client') return null;
  return payload as { clientId: number; token: string };
}

export async function GET(request: NextRequest) {
  const session = await getClientFromRequest(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const client = db.prepare(`
    SELECT nombre_apellido, cumpleanos, edad, telefono, direccion,
           tipo_sangre, medicacion, comentarios,
           cud_path, foto_dni_path, carnet_path, status
    FROM clients WHERE id = ?
  `).get(session.clientId);

  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

  return NextResponse.json(client);
}

export async function PUT(request: NextRequest) {
  const session = await getClientFromRequest(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const {
    nombre_apellido, cumpleanos, edad, telefono, direccion,
    tipo_sangre, medicacion, comentarios,
  } = body;

  if (!nombre_apellido || !cumpleanos || edad == null || !telefono || !direccion) {
    return NextResponse.json(
      { error: 'Nombre, cumpleaños, edad, teléfono y dirección son requeridos' },
      { status: 400 }
    );
  }

  if (typeof edad !== 'number' || edad < 0 || edad > 150) {
    return NextResponse.json({ error: 'Edad inválida' }, { status: 400 });
  }

  const current = db.prepare(
    'SELECT cud_path, foto_dni_path, carnet_path FROM clients WHERE id = ?'
  ).get(session.clientId) as { cud_path: string | null; foto_dni_path: string | null; carnet_path: string | null } | undefined;

  const status = calcStatus({
    nombre_apellido, cumpleanos, edad, telefono, direccion,
    cud_path: current?.cud_path,
    foto_dni_path: current?.foto_dni_path,
    carnet_path: current?.carnet_path,
  });

  db.prepare(`
    UPDATE clients
    SET nombre_apellido = ?, cumpleanos = ?, edad = ?, telefono = ?, direccion = ?,
        tipo_sangre = ?, medicacion = ?, comentarios = ?, status = ?
    WHERE id = ?
  `).run(
    nombre_apellido, cumpleanos, edad, telefono, direccion,
    tipo_sangre || null, medicacion || null, comentarios || null,
    status, session.clientId
  );

  return NextResponse.json({ ok: true, status });
}
