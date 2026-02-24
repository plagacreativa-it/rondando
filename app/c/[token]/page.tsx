'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Profile {
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
  status: string;
}

type View = 'loading' | 'not-found' | 'password' | 'form';

export default function ClientPage() {
  const params = useParams();
  const token = params.token as string;
  const [view, setView] = useState<View>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(async () => {
    const res = await fetch('/api/client/profile');
    if (res.ok) {
      setProfile(await res.json());
      setView('form');
    } else {
      setView('password');
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  if (view === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }
  if (view === 'not-found') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">404</p>
          <p className="text-gray-600">Enlace inválido o expirado.</p>
        </div>
      </div>
    );
  }
  if (view === 'password') {
    return (
      <PasswordForm
        token={token}
        onSuccess={(data) => { setProfile(data); setView('form'); }}
        onNotFound={() => setView('not-found')}
      />
    );
  }
  return <ProfileForm initialProfile={profile!} onUpdate={setProfile} />;
}

// ─── Password screen ────────────────────────────────────────────────────────

function PasswordForm({
  token, onSuccess, onNotFound,
}: {
  token: string;
  onSuccess: (profile: Profile) => void;
  onNotFound: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const authRes = await fetch('/api/client/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    if (authRes.status === 404) { onNotFound(); return; }
    if (!authRes.ok) {
      setError((await authRes.json()).error || 'Contraseña incorrecta');
      setLoading(false);
      return;
    }
    const profileRes = await fetch('/api/client/profile');
    onSuccess(await profileRes.json());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Bienvenido</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Ingresá tu contraseña para continuar</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors">
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Profile form ────────────────────────────────────────────────────────────

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'No sé'];

function ProfileForm({ initialProfile, onUpdate }: { initialProfile: Profile; onUpdate: (p: Profile) => void }) {
  // Información personal
  const [nombre, setNombre] = useState(initialProfile.nombre_apellido || '');
  const [cumpleanos, setCumpleanos] = useState(initialProfile.cumpleanos || '');
  const [edad, setEdad] = useState(initialProfile.edad != null ? String(initialProfile.edad) : '');
  const [telefono, setTelefono] = useState(initialProfile.telefono || '');
  const [direccion, setDireccion] = useState(initialProfile.direccion || '');

  // Salud
  const [tipoSangre, setTipoSangre] = useState(initialProfile.tipo_sangre || '');
  const [medicacion, setMedicacion] = useState(initialProfile.medicacion || '');
  const [comentarios, setComentarios] = useState(initialProfile.comentarios || '');

  // Archivos
  const [cudPath, setCudPath] = useState<string | null>(initialProfile.cud_path);
  const [fotoDniPath, setFotoDniPath] = useState<string | null>(initialProfile.foto_dni_path);
  const [carnetPath, setCarnetPath] = useState<string | null>(initialProfile.carnet_path);

  const [cudFile, setCudFile] = useState<File | null>(null);
  const [fotoDniFile, setFotoDniFile] = useState<File | null>(null);
  const [carnetFile, setCarnetFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [fileError, setFileError] = useState('');

  async function uploadFile(file: File, type: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    const res = await fetch('/api/client/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al subir archivo');
    return data;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, type: 'cud' | 'foto_dni' | 'carnet') {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');
    setUploading((u) => ({ ...u, [type]: true }));
    try {
      const result = await uploadFile(file, type);
      if (type === 'cud') { setCudPath(result.path); setCudFile(file); }
      if (type === 'foto_dni') { setFotoDniPath(result.path); setFotoDniFile(file); }
      if (type === 'carnet') { setCarnetPath(result.path); setCarnetFile(file); }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Error al subir archivo');
    }
    setUploading((u) => ({ ...u, [type]: false }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg(''); setSaveError(''); setSaving(true);
    const res = await fetch('/api/client/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_apellido: nombre, cumpleanos, edad: Number(edad),
        telefono, direccion, tipo_sangre: tipoSangre, medicacion, comentarios,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSaveMsg('Información guardada correctamente.');
      onUpdate({
        nombre_apellido: nombre, cumpleanos, edad: Number(edad),
        telefono, direccion, tipo_sangre: tipoSangre, medicacion, comentarios,
        cud_path: cudPath, foto_dni_path: fotoDniPath, carnet_path: carnetPath,
        status: data.status,
      });
      setTimeout(() => setSaveMsg(''), 4000);
    } else {
      setSaveError(data.error || 'Error al guardar');
    }
    setSaving(false);
  }

  const isComplete = nombre && cumpleanos && edad && telefono && direccion && cudPath && fotoDniPath && carnetPath;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-800 text-center">Mi información</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-4">
        {isComplete && (
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
            Tu información está completa. Podés editarla cuando quieras.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ── Información personal ── */}
          <Section title="Información personal">
            <Field label="Nombre y Apellido" required>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
                className={inputClass} placeholder="Ej: Juan Pérez" required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento" required>
                <input type="date" value={cumpleanos} onChange={(e) => setCumpleanos(e.target.value)}
                  className={inputClass} required />
              </Field>
              <Field label="Edad" required>
                <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)}
                  min={0} max={150} className={inputClass} placeholder="Ej: 35" required />
              </Field>
            </div>
            <Field label="Teléfono de contacto" required>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                className={inputClass} placeholder="Ej: +54 11 1234-5678" required />
            </Field>
            <Field label="Dirección" required>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                className={inputClass} placeholder="Ej: Av. Corrientes 1234, CABA" required />
            </Field>
          </Section>

          {/* ── Salud ── */}
          <Section title="Salud">
            <Field label="Tipo de sangre">
              <select value={tipoSangre} onChange={(e) => setTipoSangre(e.target.value)} className={inputClass}>
                <option value="">Seleccionar...</option>
                {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Medicación">
              <textarea value={medicacion} onChange={(e) => setMedicacion(e.target.value)}
                className={`${inputClass} resize-none`} rows={3}
                placeholder="Listá los medicamentos que tomás habitualmente..." />
            </Field>
            <Field label="Comentarios relevantes">
              <textarea value={comentarios} onChange={(e) => setComentarios(e.target.value)}
                className={`${inputClass} resize-none`} rows={3}
                placeholder="Alergias, condiciones especiales, información importante..." />
            </Field>
          </Section>

          {/* Botón guardar */}
          {saveError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">{saveError}</p>}
          {saveMsg && <p className="text-green-600 text-sm bg-green-50 px-3 py-2 rounded-md">{saveMsg}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-md transition-colors">
            {saving ? 'Guardando...' : 'Guardar información'}
          </button>
        </form>

        {/* ── Documentación ── */}
        <Section title="Documentación">
          {fileError && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-md">{fileError}</p>}
          <FileUploadField
            label="CUD" hint="PDF, JPG, PNG o WEBP — máx. 10MB"
            currentPath={cudPath} file={cudFile}
            uploading={!!uploading['cud']}
            onChange={(e) => handleFileChange(e, 'cud')}
            inputId="cud-input"
          />
          <FileUploadField
            label="Foto DNI" hint="JPG, PNG o WEBP — máx. 10MB"
            currentPath={fotoDniPath} file={fotoDniFile}
            uploading={!!uploading['foto_dni']}
            onChange={(e) => handleFileChange(e, 'foto_dni')}
            inputId="foto-dni-input"
          />
          <FileUploadField
            label="Carnet de Obra Social" hint="PDF, JPG, PNG o WEBP — máx. 10MB"
            currentPath={carnetPath} file={carnetFile}
            uploading={!!uploading['carnet']}
            onChange={(e) => handleFileChange(e, 'carnet')}
            inputId="carnet-input"
          />
        </Section>
      </main>
    </div>
  );
}

// ─── Reusable components ─────────────────────────────────────────────────────

const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function FileUploadField({
  label, hint, currentPath, file, uploading, onChange, inputId,
}: {
  label: string; hint: string; currentPath: string | null; file: File | null;
  uploading: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputId: string;
}) {
  const hasFile = currentPath || file;
  const displayName = file?.name || (currentPath ? currentPath.split('/').pop() : null);

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        hasFile ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
      }`}>
        {uploading ? (
          <p className="text-sm text-gray-500">Subiendo...</p>
        ) : hasFile ? (
          <div className="space-y-1">
            <p className="text-sm text-green-700 font-medium">Archivo subido</p>
            <p className="text-xs text-gray-500 truncate">{displayName}</p>
            <label htmlFor={inputId} className="inline-block text-xs text-blue-600 hover:text-blue-800 cursor-pointer underline">
              Cambiar archivo
            </label>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-gray-500">Sin archivo</p>
            <label htmlFor={inputId} className="inline-block text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline">
              Seleccionar archivo
            </label>
          </div>
        )}
        <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={onChange} className="hidden" />
      </div>
      <p className="text-xs text-gray-400 mt-1">{hint}</p>
    </div>
  );
}
