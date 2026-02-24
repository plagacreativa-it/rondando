export interface ProfileFields {
  nombre_apellido?: string | null;
  cumpleanos?: string | null;
  edad?: number | null;
  telefono?: string | null;
  direccion?: string | null;
  cud_path?: string | null;
  foto_dni_path?: string | null;
  carnet_path?: string | null;
}

/**
 * Un perfil es "completo" cuando tiene todos los datos personales obligatorios
 * (nombre, cumpleaños, edad, teléfono, dirección) y los 3 documentos cargados.
 */
export function calcStatus(fields: ProfileFields): 'completo' | 'pendiente' {
  const complete =
    fields.nombre_apellido?.trim() &&
    fields.cumpleanos?.trim() &&
    fields.edad != null &&
    fields.telefono?.trim() &&
    fields.direccion?.trim() &&
    fields.cud_path &&
    fields.foto_dni_path &&
    fields.carnet_path;

  return complete ? 'completo' : 'pendiente';
}
