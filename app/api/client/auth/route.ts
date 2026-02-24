import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/hash';
import { signToken } from '@/lib/auth';
import db from '@/db/database';

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  }

  const client = db.prepare('SELECT * FROM clients WHERE token = ?').get(token) as {
    id: number;
    password: string;
  } | undefined;

  if (!client) {
    return NextResponse.json({ error: 'Enlace inválido' }, { status: 404 });
  }

  const valid = await verifyPassword(password, client.password);
  if (!valid) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const jwt = await signToken({ role: 'client', clientId: client.id, token }, '24h');

  const response = NextResponse.json({ ok: true });
  response.cookies.set('client_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 horas
  });

  return response;
}
