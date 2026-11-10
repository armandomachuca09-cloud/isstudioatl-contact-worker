import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Contact Worker API', () => {
  it('GET /health returns status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const data = (await res.json()) as { status: string; service: string };
    expect(data.status).toBe('ok');
    expect(data.service).toBe('isstudioatl-contact-worker');
  });

  it('OPTIONS /contact returns CORS headers for allowed origins', async () => {
    const res = await app.request('/contact', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://isstudioatl.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://isstudioatl.com'
    );
  });

  it('POST /contact returns 400 when missing required fields', async () => {
    const res = await app.request('/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Carlos' }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { success: boolean; errors: string[] };
    expect(data.success).toBe(false);
    expect(data.errors).toBeDefined();
    expect(data.errors.length).toBeGreaterThan(0);
  });
});

