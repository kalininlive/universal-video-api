import express from "express";
import fetch from "node-fetch";
import ytdl from "ytdl-core";

const app = express();
const PORT = process.env.PORT || 3000;

// TikTok
app.get("/api/tiktok", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const apiUrl = `https://api.tiklydown.me/api/download?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    return res.json({
      status: "ok",
      video: data.video.noWatermark,
      music: data.music
    });
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

// YouTube Shorts
app.get("/api/youtube", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    if (!ytdl.validateURL(url))
      return res.status(400).json({ error: "Invalid YouTube URL" });

    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: "highest" });

    return res.json({
      status: "ok",
      video: format.url
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
