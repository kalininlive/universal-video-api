import express from "express";
import fetch from "node-fetch";
import ytdl from "ytdl-core";

const app = express();
const PORT = process.env.PORT || 3000;

// TikTok (через публичный no-watermark API)
app.get("/api/tiktok", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.data && data.data.play) {
      return res.json({
        status: "ok",
        video: data.data.play, // прямая ссылка на mp4
        music: data.data.music
      });
    } else {
      return res.status(500).json({ error: "Invalid response from TikTok API" });
    }
  } catch (err) {
    console.error("TikTok error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Instagram
app.get("/api/instagram", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Заглушка: пока возвращаем просто сам URL
    return res.json({
      status: "ok",
      message: "Instagram downloader пока в разработке",
      receivedUrl: url
    });
  } catch (err) {
    console.error("Instagram error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// YouTube Shorts (через публичный API)
app.get("/api/youtube", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const apiUrl = `https://api.vevioz.com/api/button/mp3/${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const html = await response.text();

    // ищем ссылку на MP4 в html
    const match = html.match(/href="([^"]+\.mp4[^"]*)"/);
    if (!match) {
      return res.status(410).json({ error: "Video not available" });
    }

    return res.json({
      status: "ok",
      video: match[1]
    });
  } catch (err) {
    console.error("YouTube error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Проверочный маршрут
app.get("/", (req, res) => {
  res.send("✅ Universal Video API is running!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

