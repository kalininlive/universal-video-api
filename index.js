import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Конфиг: куда проксировать yt-dlp (можно переопределить через ENV)
const YTDLP_SERVICE_BASE = process.env.YTDLP_SERVICE_URL || "http://90.156.253.98:5001/extract";

// TikTok (через публичный no-watermark API)
app.get("/api/tiktok", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const r = await fetch(apiUrl);
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "TikTok backend error", details: text });
    }
    const data = await r.json();

    if (data?.data?.play) {
      return res.json({
        status: "ok",
        video: data.data.play,
        music: data.data.music || null
      });
    } else {
      return res.status(502).json({ error: "Unexpected TikTok API response", raw: data });
    }
  } catch (err) {
    console.error("TikTok error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Instagram заглушка (добавим позже реальную реализацию)
app.get("/api/instagram", (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL is required" });
  return res.json({
    status: "ok",
    message: "Instagram downloader пока в разработке",
    receivedUrl: url
  });
});

// YouTube через твой локальный yt-dlp API с дебагом
app.get("/api/youtube", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const proxyUrl = `${YTDLP_SERVICE_BASE}?url=${encodeURIComponent(url)}`;
    console.log("Proxying to yt-dlp:", proxyUrl);

    const r = await fetch(proxyUrl);
    const text = await r.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("yt-dlp returned non-JSON:", text);
      return res.status(502).json({ error: "Invalid JSON from yt-dlp", raw: text });
    }

    if (!r.ok) {
      console.error("yt-dlp responded error:", r.status, data);
      return res.status(r.status).json({ error: data.error || "yt-dlp service error", details: data });
    }

    if (!data.video && !data.audio) {
      return res.status(410).json({
        error: "No video/audio URL returned from yt-dlp",
        debug: data
      });
    }

    return res.json({
      status: data.status || "ok",
      title: data.title,
      video: data.video,
      audio: data.audio
    });
  } catch (err) {
    console.error("YouTube proxy error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Здоровый чек
app.get("/", (req, res) => {
  res.send("✅ Universal Video API is running!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
