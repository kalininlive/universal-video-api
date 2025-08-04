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

  // пока заглушка
  return res.status(200).json({
    status: 'ok',
    link,
    video: 'https://example.com/video.mp4',
    audio: 'https://example.com/audio.mp3',
    remaining_requests: remaining - 1
  });
}
