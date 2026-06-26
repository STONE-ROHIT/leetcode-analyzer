import type { SupportedLanguage } from "../types/index.js";

// Standard Judge0 CE language IDs - stable for years across Judge0
// releases, but VERIFY against your own instance's GET /languages once
// it's running, since custom builds can renumber these.
const LANGUAGE_IDS: Record<SupportedLanguage, number> = {
  python: 71, // Python 3.8.1
  cpp: 54, // C++ (GCC 9.2.0)
  java: 62, // Java (OpenJDK 13.0.1)
};

export interface Judge0Result {
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  statusDescription: string;
  time: string | null;
  memory: number | null;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function runOnJudge0(source: string, language: SupportedLanguage): Promise<Judge0Result> {
  const baseUrl = process.env.JUDGE0_BASE_URL;
  if (!baseUrl) throw new Error("JUDGE0_BASE_URL is not set");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_AUTH_TOKEN) {
    headers["X-Auth-Token"] = process.env.JUDGE0_AUTH_TOKEN;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${baseUrl}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        source_code: source,
        language_id: LANGUAGE_IDS[language],
        cpu_time_limit: 5,
        memory_limit: 256000,
      }),
    });

    if (!res.ok) {
      throw new Error(`Judge0 request failed: ${res.status} ${res.statusText}`);
    }

    interface Judge0ApiResponse {
      stdout: string | null;
      stderr: string | null;
      compile_output: string | null;
      status?: { description: string };
      time: string | null;
      memory: number | null;
    }

    const data = (await res.json()) as Judge0ApiResponse;
    return {
      stdout: data.stdout ?? null,
      stderr: data.stderr ?? null,
      compileOutput: data.compile_output ?? null,
      statusDescription: data.status?.description ?? "Unknown",
      time: data.time ?? null,
      memory: data.memory ?? null,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        stdout: null,
        stderr: null,
        compileOutput: null,
        statusDescription: "Judge0 request timed out",
        time: null,
        memory: null,
      };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
