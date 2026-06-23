/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON middleware
  app.use(express.json());

  // Log requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Helper to identify local hostnames/IPs
  const isLocalAddress = (testUrl: string): boolean => {
    try {
      const parsed = new URL(testUrl);
      const host = parsed.hostname;
      return (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.startsWith("192.168.") ||
        host.startsWith("10.") ||
        host.startsWith("172.16.") ||
        host.startsWith("172.17.") ||
        host.startsWith("172.18.") ||
        host.startsWith("172.19.") ||
        host.startsWith("172.20.") ||
        host.startsWith("172.21.") ||
        host.startsWith("172.22.") ||
        host.startsWith("172.23.") ||
        host.startsWith("172.24.") ||
        host.startsWith("172.25.") ||
        host.startsWith("172.26.") ||
        host.startsWith("172.27.") ||
        host.startsWith("172.28.") ||
        host.startsWith("172.29.") ||
        host.startsWith("172.30.") ||
        host.startsWith("172.31.")
      );
    } catch (e) {
      const lowercase = testUrl.toLowerCase();
      return lowercase.includes("localhost") || lowercase.includes("127.0.0.1");
    }
  };

  // API Route: Test LM Studio connection
  app.post("/api/check-lmstudio", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ status: "error", error: "URL is required" });
      return;
    }

    if (isLocalAddress(url)) {
      res.json({
        status: "error",
        error: "LOCALHOST_ROUTING_CONFLICT: Since this decrypter proxy runs in a Cloud Container, calling 'localhost' or '127.0.0.1' accesses our cloud server instead of your computer! Please switch your 'ROUTING SYSTEM' to 'BROWSER DIRECT' in Settings to connect directly."
      });
      return;
    }

    try {
      // Create a short-timeout signal to verify connection
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);

      // Call models list endpoint of LM Studio (or OpenAPI compliant server)
      const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      const testUrl = `${cleanUrl}/models`;

      console.log(`Checking LM Studio connection at: ${testUrl}`);
      const response = await fetch(testUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(id);

      if (response.ok) {
        const data = await response.json();
        res.json({ status: "ok", models: data.data || [] });
      } else {
        res.json({ status: "error", code: response.status, error: `Server returned status ${response.status} ${response.statusText}` });
      }
    } catch (err: any) {
      res.json({ status: "error", error: err.message || "Connection timed out" });
    }
  });

  // API Route: Proxy Chat Completion to local LM Studio
  app.post("/api/gemma", async (req, res) => {
    const { url, model, messages, temperature = 0.3, max_tokens = 400 } = req.body;

    if (!url) {
      res.status(400).json({ error: "LM Studio URL is required" });
      return;
    }

    if (isLocalAddress(url)) {
      res.status(400).json({
        error: "LOCALHOST_ROUTING_CONFLICT: Since the proxy operates in a Cloud Container, calling 'localhost' or '127.0.0.1' pointers to the cloud server, not your local computer. To target your local LM Studio, please switch your 'ROUTING SYSTEM' Inside Settings to 'BROWSER DIRECT'."
      });
      return;
    }

    try {
      const cleanUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      const completionUrl = `${cleanUrl}/chat/completions`;

      console.log(`Proxying chat completion to: ${completionUrl} (model: ${model})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35-sec timeout for running locally

      const response = await fetch(completionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send key header if needed (usually empty for LM Studio)
          "Authorization": "Bearer lm-studio",
        },
        body: JSON.stringify({
          model: model || "",
          messages,
          temperature,
          max_tokens,
          response_format: { type: "json_object" } // request JSON natively if supported
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`LM Studio error: ${response.status} - ${errorText}`);
        res.status(response.status).json({ error: `LM Studio returned an error: ${errorText}` });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("Gemma API Proxy Exception:", err);
      res.status(500).json({ error: `Failed to communicate with LM Studio. Details: ${err.message || "Unknown error"}` });
    }
  });

  // Serve Vite/React application
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // @ts-ignore
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Chess Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
