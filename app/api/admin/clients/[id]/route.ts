import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import db from '@/db/database';
import fs from 'fs';
import path from 'path';

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === 'admin';
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const client = db.prepare(`
    SELECT id, token, username, created_at,
           nombre_apellido, cumpleanos, edad, telefono, direccion,
           tipo_sangre, medicacion, comentarios,
           cud_path, foto_dni_path, carnet_path, status
    FROM clients WHERE id = ?
  `).get(params.id);
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(params.id) as { id: number } | undefined;
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const uploadDir = path.join(process.cwd(), 'uploads', String(params.id));
  if (fs.existsSync(uploadDir)) {
    fs.rmSync(uploadDir, { recursive: true });
  }

  db.prepare('DELETE FROM clients WHERE id = ?').run(params.id);

  return NextResponse.json({ ok: true });
}
