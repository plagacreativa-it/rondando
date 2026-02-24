import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/hash';
import { generateToken } from '@/lib/tokens';
import db from '@/db/database';

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === 'admin';
}

export async function GET(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const clients = db.prepare(
    'SELECT id, username, token, status, created_at FROM clients ORDER BY created_at DESC'
  ).all();

  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin(request))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
  }

  const exists = db.prepare('SELECT id FROM clients WHERE username = ?').get(username);
  if (exists) {
    return NextResponse.json({ error: 'El usuario ya existe' }, { status: 409 });
  }

  const hashedPassword = await hashPassword(password);
  const token = generateToken();

  const result = db.prepare(
    'INSERT INTO clients (token, username, password) VALUES (?, ?, ?)'
  ).run(token, username, hashedPassword);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const clientUrl = `${baseUrl}/c/${token}`;

  return NextResponse.json({
    id: result.lastInsertRowid,
    username,
    token,
    clientUrl,
    status: 'pendiente',
  }, { status: 201 });
}
