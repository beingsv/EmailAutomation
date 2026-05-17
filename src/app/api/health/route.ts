import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.OLLAMA_BASE_URL || "https://ollama.com";
  const apiKey = process.env.OLLAMA_API_KEY;

  // If API key is missing or placeholder, report disconnected
  if (!apiKey || apiKey === "your-ollama-api-key-here") {
    return NextResponse.json({
      status: "disconnected",
      error: "API key not configured",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const startTime = Date.now();
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startTime;

    if (response.ok) {
      return NextResponse.json({
        status: "connected",
        latencyMs,
      });
    }

    return NextResponse.json({
      status: "disconnected",
      error: `API returned status ${response.status}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      status: "disconnected",
      error: message.includes("abort")
        ? "Connection timed out (10s)"
        : message,
    });
  } finally {
    clearTimeout(timeout);
  }
}
