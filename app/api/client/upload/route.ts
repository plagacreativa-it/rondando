import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { calcStatus } from '@/lib/status';
import db from '@/db/database';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const COLUMN_MAP: Record<string, string> = {
  cud: 'cud_path',
  foto_dni: 'foto_dni_path',
  carnet: 'carnet_path',
};

async function getClientFromRequest(request: NextRequest) {
  const token = request.cookies.get('client_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (payload?.role !== 'client') return null;
  return payload as { clientId: number; token: string };
}


export async function POST(request: NextRequest) {
  const session = await getClientFromRequest(request);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Error al leer el formulario' }, { status: 400 });
  }

  const fileType = formData.get('type') as string;
  if (!fileType || !Object.keys(COLUMN_MAP).includes(fileType)) {
    return NextResponse.json(
      { error: 'Tipo inválido. Use "cud", "foto_dni" o "carnet"' },
      { status: 400 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
  }

  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: 'Tipo de archivo no permitido. Solo PDF, JPG, PNG o WEBP' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'El archivo supera el límite de 10MB' }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), 'uploads', String(session.clientId));
  fs.mkdirSync(uploadDir, { recursive: true });

  const ext = EXTENSIONS[file.type] || 'bin';
  const filename = `${fileType}-${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, filename);

  const column = COLUMN_MAP[fileType];

  // Delete old file if exists
  const existing = db.prepare(`SELECT ${column} FROM clients WHERE id = ?`).get(session.clientId) as Record<string, string | null> | undefined;
  if (existing?.[column]) {
    const oldPath = path.join(process.cwd(), existing[column] as string);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  // Write new file
  const arrayBuffer = await file.arrayBuffer();
  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

  const relativePath = path.relative(process.cwd(), filePath);
  db.prepare(`UPDATE clients SET ${column} = ? WHERE id = ?`).run(relativePath, session.clientId);

  // Recalculate status
  const updated = db.prepare(
    'SELECT nombre_apellido, cumpleanos, edad, telefono, direccion, cud_path, foto_dni_path, carnet_path FROM clients WHERE id = ?'
  ).get(session.clientId) as Record<string, unknown>;

  const status = calcStatus(updated);
  db.prepare('UPDATE clients SET status = ? WHERE id = ?').run(status, session.clientId);

  return NextResponse.json({ ok: true, path: relativePath, status });
}
