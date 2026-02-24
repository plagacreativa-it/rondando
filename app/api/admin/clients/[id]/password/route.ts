import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/hash';
import db from '@/db/database';

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === 'admin';
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { password } = await request.json();

  if (!password || password.length < 4) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
  }

  const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(params.id);
  if (!client) {
    return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
  }

  const hashed = await hashPassword(password);
  db.prepare('UPDATE clients SET password = ? WHERE id = ?').run(hashed, params.id);

  return NextResponse.json({ ok: true });
}
