# Despliegue

---

## Opción A — Fly.io (gratuito)

Fly.io tiene un plan gratuito que incluye 3 máquinas y 3 GB de almacenamiento persistente. Es la opción más sencilla para esta app.

### Requisitos previos
- Cuenta en [fly.io](https://fly.io) (gratis)
- `flyctl` instalado: `curl -L https://fly.io/install.sh | sh`
- El código subido a cualquier directorio local (no necesita GitHub)

### 1. Autenticarse

```bash
fly auth login
```

### 2. Elegir un nombre único para la app

Editar `fly.toml` y cambiar la primera línea con un nombre único (solo letras, números y guiones):

```toml
app = "mi-app-rodando"   # ← cambiar esto
```

### 3. Crear la app en Fly.io

Desde el directorio del proyecto:

```bash
fly apps create mi-app-rodando
```

### 4. Crear los volúmenes persistentes

```bash
fly volumes create rodando_data    --app mi-app-rodando --region gru --size 1
fly volumes create rodando_uploads --app mi-app-rodando --region gru --size 2
```

> ⚠️ Sin volúmenes los datos se pierden al reiniciar. Crear los volúmenes **antes** del primer deploy.

### 5. Configurar variables de entorno

```bash
fly secrets set \
  ADMIN_USERNAME=admin \
  ADMIN_PASSWORD=tu_clave_segura \
  JWT_SECRET=$(openssl rand -base64 48) \
  --app mi-app-rodando
```

El `NEXT_PUBLIC_BASE_URL` se puede agregar luego cuando conozcas la URL:

```bash
fly secrets set NEXT_PUBLIC_BASE_URL=https://mi-app-rodando.fly.dev --app mi-app-rodando
```

### 6. Hacer el deploy

```bash
fly deploy --app mi-app-rodando
```

Fly.io construye la imagen Docker y la despliega. La primera vez tarda ~3 minutos.

### 7. Abrir la app

```bash
fly open --app mi-app-rodando
```

La URL pública es `https://mi-app-rodando.fly.dev`.

### Comandos útiles

```bash
# Ver logs en tiempo real
fly logs --app mi-app-rodando

# Ver estado de la máquina
fly status --app mi-app-rodando

# Acceder a la consola SSH
fly ssh console --app mi-app-rodando

# Redesplegar después de cambios
fly deploy --app mi-app-rodando
```

---

## Opción B — Railway (~$5/mes)

Railway no tiene plan gratuito pero es muy simple de configurar y tiene mejor performance.

### 1. Crear cuenta y proyecto
1. Ir a [railway.app](https://railway.app) → crear cuenta → New Project → Deploy from GitHub repo
2. Conectar el repositorio de GitHub con este proyecto

### 2. Configurar variables de entorno
En el panel de Railway → tu servicio → Variables, agregar:

```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=tu_clave_segura_aqui
JWT_SECRET=genera_una_clave_aleatoria_larga
NEXT_PUBLIC_BASE_URL=https://tu-app.up.railway.app
```

Para generar `JWT_SECRET` en la terminal:
```bash
openssl rand -base64 48
```

### 3. Crear volúmenes persistentes
En Railway → tu proyecto → + New → Volume:
- **Mount Path**: `/app/data`  (para la base de datos SQLite)
- Crear otro volumen con **Mount Path**: `/app/uploads`  (para los archivos)

### 4. Deploy
Railway detecta automáticamente el `Dockerfile` y hace el build.
Una vez desplegado, la URL pública aparece en el panel.

---

## Variables locales de desarrollo

Editar `.env.local`:
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=cualquier-clave-para-desarrollo
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Ejecutar localmente
```bash
npm run dev
```
Acceder a: http://localhost:3000
- Admin: http://localhost:3000/admin
- Usuario: admin / Contraseña: admin123
