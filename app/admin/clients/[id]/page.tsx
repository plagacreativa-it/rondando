'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ClientDetail {
  id: number;
  username: string;
  token: string;
  status: 'pendiente' | 'completo';
  created_at: string;
  nombre_apellido: string | null;
  cumpleanos: string | null;
  edad: number | null;
  telefono: string | null;
  direccion: string | null;
  tipo_sangre: string | null;
  medicacion: string | null;
  comentarios: string | null;
  cud_path: string | null;
  foto_dni_path: string | null;
  carnet_path: string | null;
}

type Tab = 'personal' | 'salud' | 'documentos';

export default function ClientDetail() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('personal');
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/clients/${params.id}`)
      .then((r) => {
        if (r.status === 401) { router.push('/admin/login'); return null; }
        if (r.status === 404) { router.push('/admin'); return null; }
        return r.json();
      })
      .then((data) => { if (data) { setClient(data); setLoading(false); } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function copyLink() {
    if (!client) return;
    navigator.clipboard.writeText(`${window.location.origin}/c/${client.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar el perfil de ${client?.username}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    await fetch(`/api/admin/clients/${params.id}`, { method: 'DELETE' });
    router.push('/admin');
  }

  function fileUrl(filePath: string) {
    return `/api/admin/files/${filePath.replace('uploads/', '')}`;
  }

  function initials(name: string | null) {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }
  if (!client) return null;

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── Header azul ── */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-6 pt-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <Link href="/admin" className="inline-flex items-center text-blue-200 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {client.nombre_apellido || client.username}
              </h1>
              {client.direccion && (
                <p className="text-blue-200 text-sm mt-1 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {client.direccion}
                </p>
              )}
              <span className={`inline-flex items-center mt-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                client.status === 'completo'
                  ? 'bg-green-400/20 text-green-100 border border-green-300/30'
                  : 'bg-yellow-400/20 text-yellow-100 border border-yellow-300/30'
              }`}>
                {client.status === 'completo' ? '● Completo' : '● Pendiente'}
              </span>
            </div>

            <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0 ml-4">
              <span className="text-white text-xl font-bold">{initials(client.nombre_apellido)}</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-6 mt-6 border-b border-blue-400/40">
            {(['personal', 'salud', 'documentos'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 text-sm font-medium capitalize transition-colors ${
                  tab === t ? 'text-white border-b-2 border-white' : 'text-blue-200 hover:text-white'
                }`}>
                {t === 'personal' ? 'Personal' : t === 'salud' ? 'Salud' : 'Documentos'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="max-w-2xl mx-auto px-6 -mt-10 pb-8 space-y-4">

        {tab === 'personal' && (
          <>
            <Card title="Información personal">
              <Grid>
                <DataField label="Nombre y Apellido" value={client.nombre_apellido} span={2} />
                <DataField label="Fecha de nacimiento" value={client.cumpleanos
                  ? new Date(client.cumpleanos + 'T12:00:00').toLocaleDateString('es-AR') : null} />
                <DataField label="Edad" value={client.edad != null ? `${client.edad} años` : null} />
                <DataField label="Teléfono" value={client.telefono} />
                <DataField label="Dirección" value={client.direccion} span={2} />
              </Grid>
            </Card>

            <AccessCard
              clientId={String(params.id)}
              token={client.token}
              createdAt={client.created_at}
              copied={copied}
              onCopyLink={copyLink}
            />
          </>
        )}

        {tab === 'salud' && (
          <Card title="Información de salud">
            <Grid>
              <DataField label="Tipo de sangre" value={client.tipo_sangre} />
            </Grid>
            {(client.medicacion || client.comentarios) && <div className="border-t border-gray-100 my-1" />}
            {client.medicacion && <DataField label="Medicación" value={client.medicacion} multiline />}
            {client.comentarios && <DataField label="Comentarios relevantes" value={client.comentarios} multiline />}
            {!client.tipo_sangre && !client.medicacion && !client.comentarios && (
              <p className="text-sm text-gray-400 italic text-center py-4">Sin información de salud cargada</p>
            )}
          </Card>
        )}

        {tab === 'documentos' && (
          <Card title="Documentación">
            <div className="divide-y divide-gray-100">
              <DocRow label="CUD" filePath={client.cud_path} fileUrl={fileUrl} />
              <DocRow label="Foto DNI" filePath={client.foto_dni_path} fileUrl={fileUrl} />
              <DocRow label="Carnet Obra Social" filePath={client.carnet_path} fileUrl={fileUrl} />
            </div>
          </Card>
        )}

        <div className="pt-2 text-center">
          <button onClick={handleDelete} disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors">
            {deleting ? 'Eliminando...' : 'Eliminar perfil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Access card (enlace + reset contraseña) ─────────────────────────────────

function AccessCard({ clientId, token, createdAt, copied, onCopyLink }: {
  clientId: string;
  token: string;
  createdAt: string;
  copied: boolean;
  onCopyLink: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [copiedPwd, setCopiedPwd] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMsg(''); setError('');
    setSaving(true);
    const res = await fetch(`/api/admin/clients/${clientId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setMsg('Contraseña actualizada.');
      setTimeout(() => setMsg(''), 4000);
    } else {
      setError((await res.json()).error || 'Error al actualizar');
    }
    setSaving(false);
  }

  function copyPassword() {
    if (!newPassword) return;
    navigator.clipboard.writeText(newPassword);
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <h3 className="font-semibold text-gray-800">Acceso del cliente</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Creado el {new Date(createdAt).toLocaleDateString('es-AR')}
        </p>
      </div>

      {/* Enlace */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Enlace de acceso</p>
        <div className="flex items-center gap-2">
          <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg flex-1 overflow-x-auto text-gray-600">
            {typeof window !== 'undefined' ? `${window.location.origin}/c/${token}` : ''}
          </code>
          <button onClick={onCopyLink}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap px-1">
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="mx-5 border-t border-gray-100" />

      {/* Resetear contraseña */}
      <div className="px-5 pt-3 pb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Resetear contraseña</p>
        <form onSubmit={handleReset} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={4}
            />
            <button
              type="button"
              onClick={copyPassword}
              disabled={!newPassword}
              title="Copiar contraseña"
              className="px-3 py-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 disabled:opacity-30 transition-colors text-sm"
            >
              {copiedPwd ? '✓' : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {msg && <p className="text-green-600 text-xs bg-green-50 px-3 py-2 rounded-lg">{msg}</p>}
        </form>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>;
}

function DataField({ label, value, span, multiline }: {
  label: string; value: string | null | undefined; span?: number; multiline?: boolean;
}) {
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      {value
        ? <p className={`text-sm text-gray-800 ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</p>
        : <p className="text-sm text-gray-300 italic">—</p>
      }
    </div>
  );
}

function DocRow({ label, filePath, fileUrl }: {
  label: string; filePath: string | null; fileUrl: (p: string) => string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${filePath ? 'bg-blue-50' : 'bg-gray-100'}`}>
          <svg className={`w-5 h-5 ${filePath ? 'text-blue-500' : 'text-gray-300'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-400">{filePath ? filePath.split('/').pop() : 'Sin archivo'}</p>
        </div>
      </div>
      {filePath ? (
        <a href={fileUrl(filePath)} target="_blank" rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver</a>
      ) : (
        <span className="text-xs text-gray-300">Pendiente</span>
      )}
    </div>
  );
}
