# isstudioatl-contact-worker

> Worker serverless en Cloudflare con TypeScript y D1 Database para el formulario de contacto de [isstudioatl.com](https://isstudioatl.com).
> Ticket: **[CLOUDFLARE-01]**

---

## 🛠️ Stack Tecnológico

- **Runtime:** [Cloudflare Workers](https://workers.cloudflare.com/) (Edge Serverless)
- **Framework:** [Hono v4](https://hono.dev/) (ultraligero, enrutamiento rápido y middleware CORS nativo)
- **Base de Datos:** [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite distribuido en el Edge)
- **Lenguaje:** TypeScript (Strict Mode)

---

## 📁 Estructura del Proyecto

```text
isstudioatl-contact-worker/
├── src/
│   └── index.ts          # Lógica del worker, validaciones, CORS y persistencia D1
├── schema.sql            # Definición de la tabla contacts e índices en D1
├── wrangler.jsonc        # Configuración del Worker y bindings de D1
├── package.json          # Dependencias y scripts de desarrollo
├── tsconfig.json         # Configuración de TypeScript para Cloudflare Workers
└── README.md             # Guía de uso y comandos
```

---

## 🚀 Guía de Inicio Rápido

### 1. Instalación de dependencias

```bash
npm install
```

### 2. Configurar la Base de Datos D1

#### Modo Local (Desarrollo)
Para ejecutar la base de datos de manera local (utiliza SQLite local administrado por Wrangler):

```bash
# Aplica el esquema schema.sql a la base de datos local
npm run db:migrate:local
# o directamente:
npx wrangler d1 execute isstudioatl-contact-db --local --file=./schema.sql
```

#### Modo Producción (Cloudflare Edge)
Crea la base de datos en tu cuenta de Cloudflare:

```bash
# Inicia sesión en Cloudflare si aún no lo has hecho
npx wrangler login

# Crea la base de datos en la nube
npx wrangler d1 create isstudioatl-contact-db
```

El comando devolverá un bloque similar a:
```jsonc
[[d1_databases]]
binding = "DB"
database_name = "isstudioatl-contact-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copia ese `database_id` y reemplázalo en `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "isstudioatl-contact-db",
    "database_id": "TU-DATABASE-ID-AQUI"
  }
]
```

Luego, aplica el esquema en producción:
```bash
npm run db:migrate:remote
# o directamente:
npx wrangler d1 execute isstudioatl-contact-db --remote --file=./schema.sql
```

---

### 3. Iniciar el Servidor de Desarrollo

```bash
npm run dev
# o:
npx wrangler dev
```

El worker iniciará típicamente en `http://localhost:8787`.

---

## 🧪 Pruebas Locales (Endpoints)

### Health Check (`GET /health`)
```bash
curl -i http://localhost:8787/health
```

### Prueba de Preflight CORS (`OPTIONS /contact`)
```bash
curl -i -X OPTIONS http://localhost:8787/contact \
  -H "Origin: https://isstudioatl.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

### Enviar Formulario de Contacto (`POST /contact`)
```bash
curl -i -X POST http://localhost:8787/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://isstudioatl.com" \
  -d '{
    "name": "Arman Desarrollador",
    "email": "contacto@ejemplo.com",
    "phone": "+1 (555) 019-2834",
    "message": "Hola, me interesa solicitar una cotización para un proyecto web."
  }'
```

### Consultar registros almacenados en local
```bash
npx wrangler d1 execute isstudioatl-contact-db --local --command="SELECT * FROM contacts ORDER BY created_at DESC;"
```

---

## 🚢 Despliegue a Producción

```bash
npm run deploy
```

