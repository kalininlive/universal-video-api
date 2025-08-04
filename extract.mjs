import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Only POST allowed' });
  }

  const { api_key, link } = req.body;

  if (!api_key || !link) {
    return res.status(400).json({ status: 'error', message: 'Missing api_key or link' });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('request_count, monthly_limit, is_active')
    .eq('api_key', api_key)
    .single();

  if (error || !data || !data.is_active) {
    return res.status(403).json({ status: 'error', message: 'Ключ недействителен или отключён' });
  }

  const remaining = data.monthly_limit - data.request_count;

  if (remaining <= 0) {
    return res.status(403).json({ status: 'error', message: 'Кредиты исчерпаны' });
  }

  // Пока возвращаем просто успешный ответ (временно)
  return res.status(200).json({
    status: 'ok',
    link,
    message: 'Ключ валиден. Пока без скачивания.',
    remaining_requests: remaining - 1
  });
}
