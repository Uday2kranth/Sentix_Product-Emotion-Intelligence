import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import { emotionOrder, type AnalysisResult, type BatchItem, type ColumnMapping, type DatasetRow, type EmotionName, type HistoryEntry } from '../types';

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'has',
  'have',
  'i',
  'in',
  'is',
  'it',
  'its',
  'my',
  'of',
  'on',
  'or',
  'that',
  'the',
  'this',
  'to',
  'was',
  'we',
  'with',
  'you',
  'your'
]);

const JOY_WORDS = new Set(['amazing', 'awesome', 'brilliant', 'crisp', 'excellent', 'fantastic', 'great', 'impressive', 'love', 'perfect', 'reliable', 'smooth', 'stunning', 'wonderful', 'bright', 'fast', 'sleek']);
const ANGER_WORDS = new Set(['angry', 'annoying', 'bad', 'broken', 'buggy', 'defective', 'frustrating', 'horrible', 'laggy', 'poor', 'slow', 'terrible', 'weak']);
const SADNESS_WORDS = new Set(['disappointed', 'disappointing', 'dull', 'flat', 'mediocre', 'regret', 'sad', 'underwhelming', 'worse']);
const FEAR_WORDS = new Set(['afraid', 'anxious', 'concerned', 'fragile', 'risky', 'uncertain', 'worried']);
const SURPRISE_WORDS = new Set(['astonishing', 'unexpected', 'remarkable', 'surprising', 'shock', 'shocked', 'wow']);
const DISGUST_WORDS = new Set(['dirty', 'gross', 'nasty', 'offensive', 'repulsive', 'smelly', 'ugh']);

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function scoreToken(token: string, scores: Record<EmotionName, number>): void {
  if (JOY_WORDS.has(token)) {
    scores.JOY += 1.8;
    scores.SURPRISE += 0.2;
  }
  if (ANGER_WORDS.has(token)) {
    scores.ANGER += 1.7;
  }
  if (SADNESS_WORDS.has(token)) {
    scores.SADNESS += 1.5;
  }
  if (FEAR_WORDS.has(token)) {
    scores.FEAR += 1.4;
  }
  if (SURPRISE_WORDS.has(token)) {
    scores.SURPRISE += 1.6;
  }
  if (DISGUST_WORDS.has(token)) {
    scores.DISGUST += 1.5;
  }
}

function buildRawEmotionScores(tokens: string[], customKeywords: string[] = []): Record<EmotionName, number> {
  const scores: Record<EmotionName, number> = {
    JOY: 1,
    ANGER: 0.75,
    SADNESS: 0.75,
    FEAR: 0.5,
    SURPRISE: 0.5,
    DISGUST: 0.5,
    NEUTRAL: 1.25
  };

  for (const token of tokens) {
    scoreToken(token, scores);
  }

  for (const keyword of customKeywords) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (normalizedKeyword && tokens.includes(normalizedKeyword)) {
      scores.JOY += 0.8;
      scores.NEUTRAL += 0.15;
    }
  }

  return scores;
}

function normalizeEmotionScores(rawScores: Record<EmotionName, number>) {
  const total = Object.values(rawScores).reduce((sum, value) => sum + value, 0) || 1;
  return emotionOrder.map((emotion) => ({
    emotion,
    score: clamp(rawScores[emotion] / total, 0, 1)
  }));
}

function extractTags(tokens: string[], customKeywords: string[] = []): string[] {
  const tags: string[] = [];

  for (const token of tokens) {
    if (STOPWORDS.has(token) || token.length < 3 || tags.includes(token)) {
      continue;
    }
    tags.push(token);
    if (tags.length === 5) {
      return tags;
    }
  }

  for (const keyword of customKeywords) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword || tags.includes(normalizedKeyword)) {
      continue;
    }
    tags.push(normalizedKeyword);
    if (tags.length === 5) {
      return tags;
    }
  }

  return tags.length > 0 ? tags : ['review'];
}

function sentimentFromScores(rawScores: Record<EmotionName, number>): number {
  const positive = rawScores.JOY + rawScores.SURPRISE * 0.4;
  const negative = rawScores.ANGER + rawScores.SADNESS + rawScores.FEAR + rawScores.DISGUST;
  const denominator = Math.max(1, positive + negative);
  return Number(clamp((positive - negative) / denominator, -1, 1).toFixed(3));
}

function primaryEmotionFromScores(rawScores: Record<EmotionName, number>): EmotionName {
  return emotionOrder.reduce((bestEmotion, emotion) => (rawScores[emotion] > rawScores[bestEmotion] ? emotion : bestEmotion), 'NEUTRAL');
}

function confidenceFromScores(tokens: string[], rawScores: Record<EmotionName, number>): number {
  const dominant = Math.max(...Object.values(rawScores));
  const richness = Math.min(1, new Set(tokens).size / 18);
  const confidence = 0.55 + 0.35 * (dominant / Math.max(Object.values(rawScores).reduce((sum, value) => sum + value, 0), 1)) + 0.1 * richness;
  return Number(clamp(confidence, 0, 1).toFixed(3));
}

function buildSummary(emotion: EmotionName, sentiment: number, tags: string[]): string {
  const tone = sentiment > 0.15 ? 'Positive' : sentiment < -0.15 ? 'Negative' : 'Mixed';
  const focus = tags.slice(0, 3).join(', ') || 'the product';
  return `${tone} review with a ${emotion.toLowerCase()} signal, centered on ${focus}.`;
}

function cleanRow(row: Record<string, unknown>): DatasetRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === null || value === undefined ? null : String(value).trim() || null])
  );
}

export function mapHeadersToColumns(headers: string[]): ColumnMapping {
  const reviewColumn = bestMatch(headers, ['review', 'comment', 'feedback', 'opinion', 'content', 'text', 'message', 'remark']);
  const productName = bestMatch(headers, ['product name', 'item name', 'product title', 'product', 'item', 'device', 'device name', 'title']);
  const brand = bestMatch(headers, ['brand', 'manufacturer', 'maker', 'label']);
  const modelNumber = bestMatch(headers, ['model number', 'model no', 'model', 'sku', 'part number', 'serial number', 'number', 'no']);

  return {
    reviewColumn,
    productName,
    brand,
    modelNumber
  };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function bestMatch(headers: string[], keywords: string[], minimumScore = 2): string | null {
  let bestHeader: string | null = null;
  let bestScore = minimumScore - 1;

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    let score = 0;

    for (const keyword of keywords) {
      if (normalized === keyword) {
        score += 4;
      } else if (normalized.includes(keyword)) {
        score += 2;
      } else if (normalized.split(' ').includes(keyword)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestHeader = header;
    }
  }

  return bestScore >= minimumScore ? bestHeader : null;
}

export function buildDemoAnalysisResult(input: { id: string; text: string; metadata?: Record<string, unknown> | null; customKeywords?: string[] }): AnalysisResult {
  const tokens = tokenize(input.text);
  const rawScores = buildRawEmotionScores(tokens, input.customKeywords ?? []);
  const emotions = normalizeEmotionScores(rawScores);
  const primaryEmotion = primaryEmotionFromScores(rawScores);
  const sentiment = sentimentFromScores(rawScores);
  const tags = extractTags(tokens, input.customKeywords ?? []);

  return {
    id: input.id,
    text: input.text,
    sentiment,
    primaryEmotion,
    emotions,
    tags,
    summary: buildSummary(primaryEmotion, sentiment, tags),
    confidenceScore: confidenceFromScores(tokens, rawScores),
    timestamp: Date.now(),
    metadata: input.metadata ?? null
  };
}

export async function parseDatasetFile(file: File): Promise<DatasetRow[]> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    const text = await file.text();
    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true
    }) as { data?: Array<Record<string, unknown>>; errors: Array<{ message: string }> };

    if (result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return (result.data ?? []).map((row: Record<string, unknown>) => cleanRow(row));
  }

  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const payload = JSON.parse(text) as unknown;

    if (Array.isArray(payload)) {
      return payload.map((row) => cleanRow(row as Record<string, unknown>));
    }

    if (payload && typeof payload === 'object') {
      const objectPayload = payload as Record<string, unknown>;
      const rows = objectPayload.rows ?? objectPayload.items ?? objectPayload.data;
      if (Array.isArray(rows)) {
        return rows.map((row) => cleanRow(row as Record<string, unknown>));
      }
      return [cleanRow(objectPayload)];
    }

    throw new Error('Unsupported JSON dataset format');
  }

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: null });
    return rows.map((row) => cleanRow(row));
  }

  throw new Error('Unsupported file type. Please upload CSV, JSON, or Excel files.');
}

export function buildMappedBatch(rows: DatasetRow[], mapping: ColumnMapping): BatchItem[] {
  const mapped: BatchItem[] = [];

  rows.forEach((row, index) => {
    const reviewColumn = mapping.reviewColumn ?? '';
    const reviewText = normalizeCell(reviewColumn ? row[reviewColumn] : row.review ?? row.text ?? '');

    if (!reviewText) {
      return;
    }

    const metadata: Record<string, unknown> = { ...row };
    if (mapping.reviewColumn) {
      delete metadata[mapping.reviewColumn];
    }

    mapped.push({
      id: normalizeCell((row.id ?? row.ID ?? row.Id) as unknown) || `row-${index + 1}`,
      text: reviewText,
      metadata
    });
  });

  return mapped;
}

export function buildHistoryEntry(params: {
  kind: 'single' | 'batch';
  title: string;
  results: AnalysisResult[];
  sourceName?: string;
}): HistoryEntry {
  const averageSentiment = params.results.length > 0 ? params.results.reduce((sum, result) => sum + result.sentiment, 0) / params.results.length : 0;
  const primaryEmotion = aggregatePrimaryEmotion(params.results);

  return {
    id: crypto.randomUUID(),
    kind: params.kind,
    title: params.title,
    sourceName: params.sourceName,
    results: params.results,
    primaryEmotion,
    averageSentiment: Number(averageSentiment.toFixed(3)),
    createdAt: Date.now()
  };
}


export function aggregatePrimaryEmotion(results: AnalysisResult[]): EmotionName {
  const scores = emotionOrder.reduce<Record<EmotionName, number>>(
    (accumulator, emotion) => ({ ...accumulator, [emotion]: 0 }),
    {} as Record<EmotionName, number>
  );

  for (const result of results) {
    scores[result.primaryEmotion] += 1;
  }

  return emotionOrder.reduce((bestEmotion, emotion) => (scores[emotion] > scores[bestEmotion] ? emotion : bestEmotion), 'NEUTRAL');
}

export function averageEmotionRadarData(results: AnalysisResult[]) {
  const aggregate = emotionOrder.reduce<Record<EmotionName, number>>(
    (accumulator, emotion) => ({ ...accumulator, [emotion]: 0 }),
    {} as Record<EmotionName, number>
  );

  if (results.length === 0) {
    return emotionOrder.map((emotion) => ({ emotion, score: 0 }));
  }

  for (const result of results) {
    for (const entry of result.emotions) {
      aggregate[entry.emotion] += entry.score;
    }
  }

  return emotionOrder.map((emotion) => ({ emotion, score: Number((aggregate[emotion] / results.length).toFixed(3)) }));
}

export function primaryEmotionDistribution(results: AnalysisResult[]) {
  const counts = emotionOrder.reduce<Record<EmotionName, number>>(
    (accumulator, emotion) => ({ ...accumulator, [emotion]: 0 }),
    {} as Record<EmotionName, number>
  );

  for (const result of results) {
    counts[result.primaryEmotion] += 1;
  }

  return emotionOrder.map((emotion) => ({ emotion, count: counts[emotion] }));
}

export function sentimentTimeline(results: AnalysisResult[]) {
  return results.map((result, index) => ({
    index: index + 1,
    sentiment: result.sentiment,
    label: result.id || `row-${index + 1}`
  }));
}

export function summarizeResults(results: AnalysisResult[]) {
  const averageSentiment = results.length > 0 ? results.reduce((sum, result) => sum + result.sentiment, 0) / results.length : 0;
  const averageConfidence = results.length > 0 ? results.reduce((sum, result) => sum + result.confidenceScore, 0) / results.length : 0;
  const primaryEmotion = aggregatePrimaryEmotion(results);

  return {
    total: results.length,
    averageSentiment: Number(averageSentiment.toFixed(3)),
    averageConfidence: Number(averageConfidence.toFixed(3)),
    primaryEmotion,
    positiveCount: results.filter((result) => result.sentiment > 0.15).length,
    negativeCount: results.filter((result) => result.sentiment < -0.15).length,
    neutralCount: results.filter((result) => Math.abs(result.sentiment) <= 0.15).length
  };
}
