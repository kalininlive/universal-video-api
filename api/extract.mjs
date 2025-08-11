// api/extract.mjs
// Важно: на Vercel в Settings → Environment Variables должна быть переменная N8N_WEBHOOK_URL
// Пример: https://n8n.kalininlive.ru/webhook/api/extract

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'method_not_allowed' });
      return;
    }

    // Базовая валидация входа
    const { api_key, link, cookies } = req.body || {};
    if (!api_key || typeof api_key !== 'string' || !link || typeof link !== 'string') {
      res.status(200).json({ ok: false, error: 'bad_request', details: ['api_key or link missing'] });
      return;
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      res.status(500).json({ ok: false, error: 'server_misconfigured', details: 'N8N_WEBHOOK_URL missing' });
      return;
    }

    // Проксируем на n8n
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s таймаут

    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key, link, cookies }),
      signal: controller.signal,
    }).catch((e) => {
      // fetch-level ошибка (таймаут, сеть)
      return { ok: false, _fetchError: e?.message || String(e) };
    });

    clearTimeout(timeout);

    // Если случился fail на уровне fetch
    if (resp && resp.ok === false && resp._fetchError) {
      res.status(200).json({ ok: false, error: 'upstream_unreachable', details: resp._fetchError });
      return;
    }

    // Читаем JSON из n8n
    let data;
    try {
      data = await resp.json();
    } catch {
      // если n8n вернул не-JSON
      const text = resp && resp.text ? await resp.text() : '';
      res.status(200).json({ ok: false, error: 'upstream_invalid_json', details: text?.slice(0, 500) });
      return;
    }

    // Возвращаем как есть (n8n уже включает ok / error / поля видео)
    res.status(200).json(data);
  } catch (err) {
    res.status(200).json({ ok: false, error: 'unexpected', details: String(err?.message || err) });
  }
}

