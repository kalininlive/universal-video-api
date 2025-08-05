import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Only POST allowed' });
  }

  const { api_key, link } = req.body;
  if (!api_key || !link) {
    return res.status(400).json({ status: 'error', message: 'Missing api_key or link' });
  }

  // 1) Проверяем ключ в Supabase
  const { data: keyRow, error: keyError } = await supabase
    .from('api_keys')
    .select('request_count, monthly_limit, is_active')
    .eq('api_key', api_key)
    .single();

  if (keyError || !keyRow || !keyRow.is_active) {
    return res.status(403).json({ status: 'error', message: 'Ключ недействителен или отключён' });
  }

  // 2) Проверяем оставшиеся кредиты
  const remaining = keyRow.monthly_limit - keyRow.request_count;
  if (remaining <= 0) {
    return res.status(403).json({ status: 'error', message: 'У вас недостаточно кредитов' });
  }

  // 3) Выбираем нужный extractor по ссылке
  let extractorUrl;
  if (link.includes('tiktok.com')) {
    extractorUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`;
  } else {
    const base = process.env.YTDLP_SERVICE_URL || 'http://90.156.253.98:5001/extract';
    extractorUrl = `${base}?url=${encodeURIComponent(link)}`;
  }

  // 4) Запрашиваем у внешнего сервиса
  let fetched;
  try {
    const r = await fetch(extractorUrl);
    const text = await r.text();
    const payload = JSON.parse(text);
    if (!r.ok) throw new Error(payload.error || 'Extractor error');
    fetched = payload;
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(502).json({ status: 'error', message: 'Ошибка извлечения', details: err.message });
  }

  // 5) Увеличиваем request_count на 1
  await supabase
    .from('api_keys')
    .update({ request_count: keyRow.request_count + 1 })
    .eq('api_key', api_key);

  // 6) Отдаём результат
  return res.status(200).json({
    status: 'ok',
    link,
    video: fetched.video || null,
    audio: fetched.audio || null,
    remaining_requests: remaining - 1
  });
}
