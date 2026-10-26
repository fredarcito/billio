# Billio

Plataforma de facturación ágil construida con **Next.js 14 (App Router, JavaScript/JSX)**, **Tailwind CSS**, **shadcn/ui**, **pdf-lib**, **Resend** y **Supabase** (Postgres + Auth).

Cada usuario configura su perfil una vez (emisor, destinatario, importe, moneda y concepto) y desde ese momento puede:

- **Emitir y enviar una factura en un clic**: solo elige el mes y pulsa «Generar y Enviar Factura». Billio genera el PDF y lo envía por email con Resend.
- **Automatizar el envío mensual**: un cron de Vercel ejecuta `/api/cron` el día 1 de cada mes a las 14:00 UTC y emite las facturas de los usuarios con envío automático activado, sin duplicados.
- **Consultar el historial**: todas las facturas (manuales y automáticas) con fecha, periodo, destinatario, importe, concepto, origen y estado, además de la descarga del PDF.

---

## 1. Stack y estructura

```
billio/
├── .env.example
├── jsconfig.json
├── next.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── tailwind.config.js
├── vercel.json                      # cron "0 14 1 * *" -> /api/cron
├── app/
│   ├── globals.css
│   ├── layout.js                    # layout raíz + Toaster (Sonner)
│   ├── page.js                      # landing pública
│   ├── login/page.jsx
│   ├── register/page.jsx
│   ├── (app)/
│   │   ├── layout.js                # layout protegido (redirige a /login)
│   │   ├── dashboard/page.jsx       # emisión rápida + resumen
│   │   ├── invoices/page.jsx        # historial
│   │   └── profile/page.jsx         # perfil de facturación
│   └── api/
│       ├── auth/register/route.js   # POST  alta de usuario
│       ├── auth/login/route.js      # POST  login (cookie de sesión)
│       ├── auth/logout/route.js     # POST  logout
│       ├── auth/me/route.js         # GET   usuario + perfil
│       ├── profile/route.js         # GET / PUT perfil
│       ├── invoices/route.js        # GET historial / POST emisión manual
│       ├── invoices/[id]/pdf/route.js  # GET descarga del PDF
│       └── cron/route.js            # GET envío automático (Bearer CRON_SECRET)
├── components/
│   ├── app-nav.jsx
│   ├── auth-form.jsx
│   ├── invoice-history.jsx
│   ├── profile-form.jsx
│   ├── quick-issue.jsx
│   └── ui/                          # componentes shadcn/ui
│       ├── badge.jsx
│       ├── button.jsx
│       ├── card.jsx
│       ├── dialog.jsx
│       ├── input.jsx
│       ├── label.jsx
│       ├── select.jsx
│       ├── separator.jsx
│       ├── sonner.jsx
│       └── table.jsx
├── middleware.js                    # renueva la sesión de Supabase en cada petición
├── supabase/
│   └── migrations/
│       └── 20261026120000_create_profiles_and_invoices.sql
└── lib/
    ├── api.js                       # helpers de respuesta JSON y validación
    ├── db.js                        # acceso a datos (profiles, invoices) con la sesión
    ├── format.js                    # meses, moneda, fechas, periodos
    ├── invoices.js                  # issueInvoice (idempotente, PDF + email)
    ├── pdf.js                       # generación del PDF con pdf-lib
    ├── resend.js                    # envío del email con Resend
    ├── utils.js                     # cn()
    └── supabase/
        ├── admin.js                 # cliente con la clave secreta (solo el cron)
        ├── browser.js               # cliente del navegador (login/logout)
        ├── server.js                # cliente del servidor con la sesión
        └── session.js               # refresco de la sesión (middleware)
```

### Modelo de datos

Dos tablas en `public`, una fila por cuenta y una por factura (ver la migración):

| Tabla | Contenido |
|---|---|
| `profiles` | Datos de facturación de cada cuenta: emisor, destinatario, importe, moneda, concepto y `auto_send`. `user_id` es la clave primaria. |
| `invoices` | Facturas emitidas: periodo, importe, origen (`manual`/`cron`), estado (`pending`/`sent`/`failed`), `resend_id` y fechas. |

Los usuarios viven en **Supabase Auth** (`auth.users`); ambas tablas apuntan ahí con `on delete cascade`.

### Cómo funciona la idempotencia

`invoices` tiene el índice único `(user_id, year, month)`. `issueInvoice` inserta la factura antes de enviarla:

- Si el insert choca con el índice, ya existe una factura para ese periodo → **409** (`already_issued`). Si Vercel reintenta el cron, no se duplica nada.
- Si el envío falla, la factura se borra (no queda en el historial) y el periodo vuelve a estar libre para reintentar.

No hacen falta candados: la base de datos garantiza la unicidad aunque dos peticiones lleguen a la vez.

### Seguridad

- Registro, login y contraseñas los gestiona **Supabase Auth** (sesión en cookies `httpOnly` que el middleware renueva en cada petición).
- **RLS activado** en `profiles` e `invoices`: cada persona solo lee y escribe sus filas (`auth.uid() = user_id`). Se revocan los privilegios por defecto y se conceden solo los necesarios.
- La clave secreta (`SUPABASE_SECRET_KEY`) solo se usa en el servidor, en el cron, para leer los perfiles con envío automático.
- `/api/cron` exige `Authorization: Bearer <CRON_SECRET>`; si falta o no coincide devuelve **401**.

---

## 2. Instalación de shadcn/ui

Los componentes de `components/ui/` se han generado con la CLI oficial de shadcn (`shadcn@latest`), no están escritos a mano. Las dependencias que añade la CLI (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react`, `sonner`, `next-themes`) ya están en `package.json`.

> Tailwind es la versión **v4**: no hay `theme.extend` en `tailwind.config.js` (los colores viven en `app/globals.css` con variables `oklch()`) y las animaciones las aporta `tw-animate-css` en lugar de `tailwindcss-animate`.

Si quieres regenerarlos o añadir más:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label select table badge dialog separator sonner
```

Los componentes importan `cn` desde `@/lib/utils` y los primitivos desde el paquete unificado `radix-ui`.

`components.json` (equivalente al que genera `shadcn init`):

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": false,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores:

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase (`https://xxxx.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_...`). Puede llegar al navegador. |
| `SUPABASE_SECRET_KEY` | Clave secreta (`sb_secret_...`). **Solo servidor** (cron). Nunca con prefijo `NEXT_PUBLIC_`. |
| `RESEND_API_KEY` | API key de Resend (`re_...`). |
| `RESEND_FROM` | Remitente. En pruebas usa `Billio <onboarding@resend.dev>`; en producción, un dominio verificado. |
| `CRON_SECRET` | Secreto del cron. Vercel envía `Authorization: Bearer $CRON_SECRET` automáticamente. |

---

## 4. Configuración de servicios

### 4.1 Resend

1. Crea una cuenta en <https://resend.com> y genera una API key en **API Keys**.
2. Para producción, añade y verifica tu dominio en **Domains** (registros DNS que te indica Resend) y usa un remitente de ese dominio en `RESEND_FROM`.
3. Mientras el dominio no esté verificado, Resend solo permite enviar desde `onboarding@resend.dev` y únicamente a la dirección de tu propia cuenta.

### 4.2 Supabase (Postgres + Auth)

1. Crea un proyecto en <https://supabase.com/dashboard>.
2. Aplica la migración. Con la CLI de Supabase:

   ```bash
   pnpm dlx supabase@latest link --project-ref <ref-del-proyecto>
   pnpm dlx supabase@latest db push
   ```

   O pega el contenido de `supabase/migrations/20261026120000_create_profiles_and_invoices.sql` en el **SQL Editor** del dashboard.
3. Copia de **Settings → API** la URL, la clave publicable y la clave secreta a `.env.local` (y a las variables de entorno de Vercel).
4. En **Authentication → Providers → Email** decide si quieres confirmar el email: con confirmación activada, tras registrarse la persona recibe un correo y entra después; sin ella, el registro abre sesión directamente.
5. En **Authentication → URL Configuration** añade la URL de producción y `http://localhost:3000` como *Redirect URLs*.

### 4.3 Cron

`vercel.json` ya contiene:

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 14 1 * *" }]
}
```

Vercel llama a `/api/cron` el día 1 de cada mes a las 14:00 UTC con la cabecera `Authorization: Bearer $CRON_SECRET`. El endpoint procesa el periodo del mes en curso para todos los usuarios con `autoSend` activado.

---

## 5. Despliegue en Vercel

1. Sube el repositorio a GitHub/GitLab/Bitbucket.
2. En Vercel, **Add New → Project** e importa el repositorio. Framework: **Next.js** (detectado automáticamente); Vercel usa `pnpm install` por el `pnpm-lock.yaml`.
3. En **Settings → Environment Variables** añade las seis variables de `.env.example` (Supabase, Resend y `CRON_SECRET`).
4. **Deploy**. El cron aparece en **Settings → Cron Jobs**.
5. Abre la URL, crea una cuenta, configura el perfil y prueba la emisión manual.

> El plan Hobby de Vercel permite crons con una ejecución diaria; `0 14 1 * *` (mensual) encaja. En planes Pro puedes ajustar el horario.

---

## 6. Probar en local

```bash
pnpm install
cp .env.example .env.local   # rellena los valores
pnpm dev                     # http://localhost:3000
```

Flujo de prueba de la emisión manual:

1. Regístrate en `/register`.
2. En `/profile` rellena emisor, email destinatario, importe, moneda y concepto, y guarda.
3. En `/dashboard` elige el mes y pulsa **Generar y Enviar Factura**.
4. Comprueba el correo en la bandeja del destinatario (o en **Emails** de Resend) y la fila en `/invoices`.
5. Repite con el mismo mes: la API responde **409** (`already_issued`).

### Probar `/api/cron` con curl

```bash
# Sin cabecera -> 401
curl -i http://localhost:3000/api/cron

# Con secreto incorrecto -> 401
curl -i -H "Authorization: Bearer incorrecto" http://localhost:3000/api/cron

# Con el secreto correcto -> 200 y resumen
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron | jq
```

Respuesta de ejemplo:

```json
{
  "period": { "year": 2026, "month": 10 },
  "processed": 1,
  "sent": 1,
  "skipped": 0,
  "failed": 0,
  "results": [{ "userId": "...", "status": "sent", "invoiceId": "...", "number": "BIL-202610-XXXXXX" }]
}
```

Ejecútalo dos veces seguidas: la segunda debe devolver `skipped` con `reason: "already_issued"` para los usuarios ya facturados.

### Probar el resto de endpoints

```bash
# Registro (responde { signedIn: false } si Supabase pide confirmar el email)
curl -c cookies.txt -X POST http://localhost:3000/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"name":"Ana","email":"ana@test.com","password":"password123"}'

curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"ana@test.com","password":"password123"}'

# Perfil
curl -b cookies.txt -X PUT http://localhost:3000/api/profile \
  -H 'content-type: application/json' \
  -d '{"issuerName":"Ana García","recipientEmail":"cliente@empresa.com","amount":1200,"currency":"EUR","description":"Servicios de diseño web","autoSend":true}'

# Emisión manual
curl -b cookies.txt -X POST http://localhost:3000/api/invoices \
  -H 'content-type: application/json' -d '{"year":2026,"month":9}'

# Historial
curl -b cookies.txt http://localhost:3000/api/invoices
```

### Notas de prueba

- Con una `RESEND_API_KEY` inválida, la emisión responde **502** (`send_failed`) y la factura **no** se guarda en el historial; el periodo queda libre para reintentar.
- El PDF se puede regenerar y descargar en cualquier momento desde `/api/invoices/<id>/pdf`.

---

## 7. Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo. |
| `pnpm build` | Build de producción. |
| `pnpm start` | Servidor de producción (requiere `pnpm build`). |
| `pnpm lint` | ESLint (`next lint`). |
