import { Hono } from 'hono';
import { cors } from 'hono/cors';

export interface Env {
  DB: D1Database;
}

interface ContactInput {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}

const app = new Hono<{ Bindings: Env }>();

/**
 * Validates if the request origin is authorized.
 * Permitted:
 * - Production: https://isstudioatl.com, https://www.isstudioatl.com
 * - Local Dev: http://localhost:* or http://127.0.0.1:*
 */
function isAllowedOrigin(origin: string): boolean {
  if (
    origin === 'https://isstudioatl.com' ||
    origin === 'https://www.isstudioatl.com'
  ) {
    return true;
  }

  // Regex matches http://localhost, http://localhost:3000, http://localhost:5173, etc.
  const localhostRegex = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  return localhostRegex.test(origin);
}

// Global CORS Middleware handles OPTIONS preflight and injects response headers
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return '*';
      return isAllowedOrigin(origin) ? origin : null;
    },
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Accept'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  })
);

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'isstudioatl-contact-worker',
    timestamp: new Date().toISOString(),
  });
});

// Simple email format verification regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /contact
 * Handles form submissions, validates input, and records them into Cloudflare D1.
 */
app.post('/contact', async (c) => {
  let body: unknown;

  // 1. Safe JSON parsing
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        success: false,
        error: 'Cuerpo de solicitud inválido. Se requiere formato JSON.',
      },
      400
    );
  }

  if (!body || typeof body !== 'object') {
    return c.json(
      {
        success: false,
        error: 'El cuerpo de la solicitud debe ser un objeto JSON.',
      },
      400
    );
  }

  const payload = body as Record<string, unknown>;

  const rawName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const rawEmail = typeof payload.email === 'string' ? payload.email.trim() : '';
  const rawPhone = typeof payload.phone === 'string' ? payload.phone.trim() : null;
  const rawMessage = typeof payload.message === 'string' ? payload.message.trim() : '';

  // 2. Input validation
  const errors: string[] = [];

  if (!rawName) {
    errors.push('El campo "name" (nombre) es obligatorio.');
  } else if (rawName.length > 100) {
    errors.push('El campo "name" no puede exceder 100 caracteres.');
  }

  if (!rawEmail) {
    errors.push('El campo "email" (correo electrónico) es obligatorio.');
  } else if (!EMAIL_REGEX.test(rawEmail)) {
    errors.push('El formato del correo electrónico es inválido.');
  } else if (rawEmail.length > 255) {
    errors.push('El correo electrónico no puede exceder 255 caracteres.');
  }

  if (!rawMessage) {
    errors.push('El campo "message" (mensaje) es obligatorio.');
  } else if (rawMessage.length > 5000) {
    errors.push('El campo "message" no puede exceder 5000 caracteres.');
  }

  if (rawPhone && rawPhone.length > 30) {
    errors.push('El campo "phone" no puede exceder 30 caracteres.');
  }

  if (errors.length > 0) {
    return c.json(
      {
        success: false,
        errors,
      },
      400
    );
  }

  const contactData: ContactInput = {
    name: rawName,
    email: rawEmail.toLowerCase(),
    phone: rawPhone || null,
    message: rawMessage,
  };

  // 3. Database insertion into D1
  const contactId = crypto.randomUUID();

  try {
    const result = await c.env.DB.prepare(
      `INSERT INTO contacts (id, name, email, phone, message)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        contactId,
        contactData.name,
        contactData.email,
        contactData.phone,
        contactData.message
      )
      .run();

    if (!result.success) {
      console.error('Error insertando en D1:', result.error);
      return c.json(
        {
          success: false,
          error: 'Error al registrar el contacto en la base de datos.',
        },
        500
      );
    }

    return c.json(
      {
        success: true,
        message: 'Mensaje de contacto recibido y almacenado exitosamente.',
        id: contactId,
      },
      200
    );
  } catch (dbError) {
    console.error('Excepción en base de datos D1:', dbError);
    return c.json(
      {
        success: false,
        error: 'Ocurrió un error interno al procesar su solicitud.',
      },
      500
    );
  }
});

// Fallback 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Ruta no encontrada.',
    },
    404
  );
});

// Global error handler
app.onError((err, c) => {
  console.error('Unhandled Worker Exception:', err);
  return c.json(
    {
      success: false,
      error: 'Error interno del servidor.',
    },
    500
  );
});

export default app;

