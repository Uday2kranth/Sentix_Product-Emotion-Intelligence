import type { AnalysisResult, BatchItem, BatchProgress, ColumnMapping, BatchStatsResponse } from '../types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000/api';

const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorResponse = response.clone();
    let detail = response.statusText;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (typeof payload.detail === 'string') {
        detail = payload.detail;
      }
    } catch {
      try {
        const text = await errorResponse.text();
        if (text) {
          detail = text;
        }
      } catch {
        // Ignore unreadable bodies and keep the status text.
      }
    }

    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export async function analyzeSingle(text: string, metadata: Record<string, unknown> | null = null): Promise<AnalysisResult> {
  return requestJson<AnalysisResult>('/analyze/single', {
    method: 'POST',
    body: JSON.stringify({ text, metadata })
  });
}

export async function analyzeBatch(items: BatchItem[]): Promise<AnalysisResult[]> {
  return requestJson<AnalysisResult[]>('/analyze/batch', {
    method: 'POST',
    body: JSON.stringify({ items })
  });
}

export async function suggestColumns(headers: string[]): Promise<ColumnMapping> {
  return requestJson<ColumnMapping>('/dataset/suggest-columns', {
    method: 'POST',
    body: JSON.stringify({ headers })
  });
}

function buildWebSocketUrl(): string {
  const url = new URL(`${apiBaseUrl.replace(/\/$/, '')}/analyze/batch/ws`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

export function analyzeBatchStream(
  items: BatchItem[],
  onProgress?: (progress: BatchProgress) => void,
): Promise<AnalysisResult[]> {
  if (typeof window === 'undefined' || typeof WebSocket === 'undefined') {
    return analyzeBatch(items);
  }

  return new Promise<AnalysisResult[]>((resolve, reject) => {
    const socket = new WebSocket(buildWebSocketUrl());

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ items }));
    });

    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(event.data as string) as
          | { type: 'progress'; completed: number; total: number; latestResult?: AnalysisResult }
          | { type: 'complete'; results: AnalysisResult[] }
          | { type: 'error'; message: string };

        if (payload.type === 'progress') {
          onProgress?.({ completed: payload.completed, total: payload.total, latestResult: payload.latestResult });
          return;
        }

        if (payload.type === 'complete') {
          resolve(payload.results);
          socket.close();
          return;
        }

        if (payload.type === 'error') {
          reject(new Error(payload.message));
          socket.close();
        }
      } catch (error) {
        reject(error);
        socket.close();
      }
    });

    socket.addEventListener('error', () => {
      socket.close();
      void analyzeBatch(items)
        .then(resolve)
        .catch(reject);
    });

    socket.addEventListener('close', () => {
      if (socket.readyState !== WebSocket.CLOSED) {
        void analyzeBatch(items)
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

export async function sendChatMessage(
  sessionId: string,
  message: string,
  provider: string,
  model: string,
  apiKey: string,
  reviewContext?: string
): Promise<{ response: string }> {
  const backendProvider = (provider === 'Google' || provider === 'NVIDIA') ? 'OpenRouter' : provider;
  return requestJson<{ response: string }>('/chat', {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      message,
      provider: backendProvider,
      model,
      api_key: apiKey,
      review_context: reviewContext ?? null
    })
  });
}

export async function fetchBatchStats(results: AnalysisResult[]): Promise<BatchStatsResponse> {
  return requestJson<BatchStatsResponse>('/analyze/batch-stats', {
    method: 'POST',
    body: JSON.stringify({ results })
  });
}


