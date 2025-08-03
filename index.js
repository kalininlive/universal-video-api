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

import fs from "fs";
import configData from "./config.json" assert { type: "json" };

// YouTube Shorts через Invidious с fallback по инстансам
app.get("/api/youtube", async (req, res) => {
  try {
    const instances = configData.invidious_instances;
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const match = url.match(/(?:watch\?v=|\/shorts\/)([A-Za-z0-9_-]+)/);
    if (!match) return res.status(400).json({ error: "Invalid YouTube link" });

    const videoId = match[1];
    let lastError = null;

    for (const instance of instances) {
      try {
        const apiUrl = `${instance}/api/v1/videos/${videoId}`;
        const r = await fetch(apiUrl);
        if (!r.ok) {
          lastError = `Instance ${instance} returned status ${r.status}`;
          continue; // пробуем следующий
        }

        const json = await r.json();
        const { title, formatStreams } = json;
        if (!formatStreams || !Array.isArray(formatStreams)) {
          lastError = `No formatStreams from ${instance}`;
          continue;
        }

        const fmt = formatStreams.find(f => f.url && f.container === "mp4");
        if (!fmt) {
          lastError = `No mp4 stream on ${instance}`;
          continue;
        }

        // Успешно нашли
        return res.json({
          status: "ok",
          title,
          video: fmt.url,
          quality: fmt.qualityLabel || fmt.quality || null,
          mime: fmt.container
        });
      } catch (e) {
        lastError = `Error on ${instance}: ${e.message}`;
        // идём к следующему
      }
    }

    // Если дошли до конца и ничего не отработало
    return res.status(410).json({
      error: "No available format from any Invidious instance",
      details: lastError
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
