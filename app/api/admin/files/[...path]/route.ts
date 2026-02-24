import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const payload = await verifyToken(token);
  if (payload?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const uploadsBase = process.env.NODE_ENV === 'production'
    ? '/app/data/uploads'
    : path.join(process.cwd(), 'uploads');

  const filePath = path.join(uploadsBase, ...params.path);

  // Prevent path traversal
  if (!filePath.startsWith(uploadsBase)) {
    return NextResponse.json({ error: 'Ruta inválida' }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${path.basename(filePath)}"`,
    },
  });
}
