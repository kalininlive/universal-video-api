import express from "express";
import fetch from "node-fetch";
import ytdl from "ytdl-core";
import igdl from "instagram-url-direct";
import TikTokScraper from "tiktok-scraper";

const app = express();
const PORT = process.env.PORT || 3000;

// TikTok
app.get("/api/tiktok", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // используем публичный API как прокси
    const apiUrl = `https://api.tiklydown.me/api/download?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    return res.json({
      status: "ok",
      video: data.video.noWatermark,
      music: data.music
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Instagram
app.get("/api/instagram", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const result = await igdl.getInfo(url);
    return res.json({
      status: "ok",
      video: result.url_list[0]
    });
  } catch (err) {
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
    return res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("Universal Video API is running!");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
