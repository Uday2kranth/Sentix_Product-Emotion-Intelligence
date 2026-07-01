import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  Activity,
  Brain,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileText,
  FileUp,
  History,
  LayoutDashboard,
  Loader2,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Wand2,
  Compass,
  Home,
  Play,
  HelpCircle,
  BookOpen
} from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentType } from 'react';

import { EmotionDistributionPanel, EmotionRadarPanel, SentimentTimelinePanel, TopicModelingPanel } from './components/charts';
import ChatDrawer, { ProviderName } from './components/ChatDrawer';
import { Badge, Button, FieldLabel, MetricCard, Panel, Select, TextArea, TextInput } from './components/ui';
import { aggregatePrimaryEmotion, buildDemoAnalysisResult, buildHistoryEntry, buildMappedBatch, mapHeadersToColumns, parseDatasetFile, summarizeResults } from './lib/analysis';
import { cn } from './lib/utils';
import { ApiError, analyzeBatchStream, analyzeSingle, suggestColumns, sendChatMessage, fetchBatchStats } from './services/api';
import { emotionOrder, type AnalysisResult, type BatchItem, type BatchProgress, type ColumnMapping, type DatasetRow, type EmotionName, type HistoryEntry, type TopicCluster, type ForecastPoint, type BatchStatsResponse } from './types';


type TabKey = 'welcome' | 'single' | 'batch' | 'eda' | 'history';
type BannerTone = 'success' | 'error' | 'warning' | 'info';
type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';

interface BannerState {
  tone: BannerTone;
  message: string;
}

interface NavigationItem {
  id: TabKey;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

const NAVIGATION: NavigationItem[] = [
  { id: 'welcome', label: 'Welcome Portal', description: 'Quick-start guide & features overview.', icon: Compass },
  { id: 'single', label: 'Single Analysis', description: 'Inspect one review in depth.', icon: Sparkles },
  { id: 'batch', label: 'Batch Analysis', description: 'Upload a dataset and map columns.', icon: Database },
  { id: 'eda', label: 'EDA Dashboard', description: 'Visual distributions, correlations, and matrices.', icon: LayoutDashboard },
  { id: 'history', label: 'History', description: 'Review local browser history.', icon: History }
];

const SENTIMENT_FILTER_OPTIONS: Array<{ value: SentimentFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' }
];

const EMPTY_MAPPING: ColumnMapping = {
  reviewColumn: null,
  productName: null,
  brand: null,
  modelNumber: null
};

const ROOT_VARIANTS: Variants = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -18, transition: { duration: 0.18 } }
};

const LOCAL_HISTORY_KEY = 'sentix:history';


function readLocalJson<T>(key: string): T | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeLocalJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in locked-down browsers.
  }
}

function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '0.00';
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function sentimentLabel(value: number): string {
  if (value > 0.15) {
    return 'Positive';
  }
  if (value < -0.15) {
    return 'Negative';
  }
  return 'Neutral';
}

function sentimentTone(value: number): 'success' | 'warning' | 'danger' {
  if (value > 0.15) {
    return 'success';
  }
  if (value < -0.15) {
    return 'danger';
  }
  return 'warning';
}

function describeApiError(error: ApiError): string {
  switch (error.status) {
    case 400:
      return 'The request payload is invalid or empty.';
    case 401:
      return 'The provided API key was rejected.';
    case 429:
      return 'Rate limit exceeded. Please try again later.';
    case 500:
      return 'The backend could not process the analysis request.';
    default:
      return error.message;
  }
}

function bannerClassName(tone: BannerTone): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100';
    case 'error':
      return 'border-red-400/30 bg-red-500/10 text-red-100';
    case 'warning':
      return 'border-amber-400/30 bg-amber-500/10 text-amber-100';
    case 'info':
      return 'border-sentix-accent/30 bg-sentix-accent/10 text-sentix-text';
    default:
      return 'border-sentix-border bg-black/40 text-sentix-text';
  }
}

function TabButton({ item, active, onClick, collapsed }: { item: NavigationItem; active: boolean; onClick: () => void; collapsed: boolean }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentix-accent',
        active ? 'border-sentix-accent bg-sentix-accent/10' : 'border-sentix-border bg-black/20 hover:border-white/20 hover:bg-white/5',
        collapsed ? 'w-12 h-12 justify-center p-0' : 'w-full gap-3 px-4 py-3 text-left'
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', active ? 'border-sentix-accent bg-sentix-accent text-black' : 'border-sentix-border bg-white/5 text-sentix-text')}>
        <Icon className="h-4 w-4" />
      </span>
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-[0.3em] text-sentix-text">{item.label}</span>
          <span className="mt-1 block text-xs leading-5 text-sentix-muted">{item.description}</span>
        </span>
      )}
    </button>
  );
}

function SparkleBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute right-0 top-1/4 h-[26rem] w-[26rem] rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-lime-500/8 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,255,136,0.08),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(34,197,94,0.05),transparent_24%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-20" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:18px_18px]" />
    </div>
  );
}

function ResultCard({
  result,
  active,
  onSelect
}: {
  result: AnalysisResult;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentix-accent',
        active ? 'border-sentix-accent bg-sentix-accent/10 shadow-[0_0_0_1px_rgba(0,255,136,0.2)]' : 'border-sentix-border bg-black/30 hover:border-white/20 hover:bg-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">{result.id}</p>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-sentix-text">{result.text}</p>
        </div>
        <Badge className={cn(result.sentiment > 0.15 ? 'border-emerald-400/40 text-emerald-200' : result.sentiment < -0.15 ? 'border-red-400/40 text-red-200' : 'border-amber-400/40 text-amber-200')}>
          {sentimentLabel(result.sentiment)}
        </Badge>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{result.primaryEmotion}</Badge>
        <Badge>{formatNumber(result.confidenceScore * 100)}% confidence</Badge>
        <Badge>{formatNumber(result.sentiment, 3)} sentiment</Badge>
      </div>

      <div className="mt-4 space-y-2">
        {result.emotions.map((emotion) => (
          <div key={emotion.emotion} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-sentix-muted">
              <span>{emotion.emotion}</span>
              <span>{formatPercent(emotion.score)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-sentix-accent" style={{ width: `${Math.max(emotion.score * 100, 3)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-sm leading-6 text-sentix-muted">{result.summary}</p>
    </button>
  );
}

function HistoryCard({
  entry,
  active,
  onSelect
}: {
  entry: HistoryEntry;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentix-accent',
        active ? 'border-sentix-accent bg-sentix-accent/10' : 'border-sentix-border bg-black/30 hover:border-white/20 hover:bg-white/5'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">{entry.kind.toUpperCase()}</p>
          <p className="mt-2 text-sm font-semibold text-sentix-text">{entry.title}</p>
          <p className="mt-1 text-xs text-sentix-muted">{entry.sourceName ?? 'Browser-local history'}</p>
        </div>
        <Badge>{entry.primaryEmotion}</Badge>
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-sentix-muted">
        <span>{formatDate(entry.createdAt)}</span>
        <span>{entry.results.length} results</span>
      </div>
    </button>
  );
}

function Banner({ banner, onClear }: { banner: BannerState | null; onClear: () => void }) {
  if (!banner) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('rounded-3xl border px-4 py-3 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.25)]', bannerClassName(banner.tone))}
    >
      <div className="flex items-center justify-between gap-4">
        <p>{banner.message}</p>
        <button type="button" onClick={onClear} className="text-xs font-bold uppercase tracking-[0.25em] opacity-70 transition hover:opacity-100">
          Dismiss
        </button>
      </div>
    </motion.div>
  );
}

function ProgressBar({ progress }: { progress: BatchProgress | null }) {
  if (!progress) {
    return null;
  }

  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <div className="space-y-2 rounded-3xl border border-sentix-border bg-black/30 p-4">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-sentix-muted">
        <span>Batch Progress</span>
        <span>{progress.completed} / {progress.total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-sentix-accent transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-xs text-sentix-muted">{progress.latestResult ? `Latest result: ${progress.latestResult.id}` : 'Streaming batch analysis in real time.'}</p>
    </div>
  );
}

function EmptyState({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-3xl border border-dashed border-sentix-border bg-black/20 p-8 text-center">
      <Icon className="mx-auto h-7 w-7 text-sentix-accent" />
      <h3 className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-sentix-text">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-sentix-muted">{subtitle}</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('welcome');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isMapping, setIsMapping] = useState(false);
  const [uploadedData, setUploadedData] = useState<DatasetRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [mappedBatch, setMappedBatch] = useState<BatchItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [filterEmotion, setFilterEmotion] = useState<'ALL' | EmotionName>('ALL');
  const [filterSentiment, setFilterSentiment] = useState<SentimentFilter>('all');
  const [batchPage, setBatchPage] = useState(1);

  const [banner, setBanner] = useState<BannerState | null>(null);

  // ── Batch Statistics (LDA & Forecasting) ──
  const [batchStats, setBatchStats] = useState<BatchStatsResponse | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);



  // ── Chatbot State Variables ──
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatProvider, setChatProvider] = useState<ProviderName>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('sentix:chat_provider') as ProviderName) ?? 'OpenRouter';
    }
    return 'OpenRouter';
  });
  const [chatModel, setChatModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('sentix:chat_model') ?? 'openrouter/free';
    }
    return 'openrouter/free';
  });
  const [chatApiKey, setChatApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('sentix:chat_api_key') ?? '';
    }
    return '';
  });
  const [serverKeys, setServerKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchKeysStatus = async () => {
      try {
        const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000/api';
        const res = await fetch(`${apiBaseUrl}/chat/keys-status`);
        if (res.ok) {
          const data = await res.json();
          setServerKeys(data || {});
        }
      } catch (err) {
        console.error("Failed to fetch keys status:", err);
      }
    };
    fetchKeysStatus();
  }, []);

  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      let id = window.localStorage.getItem('sentix:session_id');
      if (!id) {
        id = `session-${Math.random().toString(36).slice(2, 11)}`;
        window.localStorage.setItem('sentix:session_id', id);
      }
      return id;
    }
    return 'session-fallback';
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sentix:chat_provider', chatProvider);
    }
  }, [chatProvider]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sentix:chat_model', chatModel);
    }
  }, [chatModel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sentix:chat_api_key', chatApiKey);
    }
  }, [chatApiKey]);

  // Re-declared helper variables
  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      const emotionMatch = filterEmotion === 'ALL' || result.primaryEmotion === filterEmotion;
      const sentimentMatch =
        filterSentiment === 'all' ||
        (filterSentiment === 'positive' && result.sentiment > 0.15) ||
        (filterSentiment === 'neutral' && result.sentiment <= 0.15 && result.sentiment >= -0.15) ||
        (filterSentiment === 'negative' && result.sentiment < -0.15);

      return emotionMatch && sentimentMatch;
    });
  }, [filterEmotion, filterSentiment, results]);

  const summary = useMemo(() => summarizeResults(filteredResults), [filteredResults]);
  const selectedResult = useMemo(() => filteredResults.find((result) => result.id === selectedResultId) ?? filteredResults[0] ?? null, [filteredResults, selectedResultId]);
  const overallPrimaryEmotion = useMemo(() => aggregatePrimaryEmotion(filteredResults), [filteredResults]);
  const batchPreview = useMemo(() => buildMappedBatch(uploadedData, columnMapping), [columnMapping, uploadedData]);
  const uploadedHeaders = useMemo(() => (uploadedData[0] ? Object.keys(uploadedData[0]) : []), [uploadedData]);
  const selectedHistoryEntry = useMemo(() => history.find((entry) => entry.id === selectedHistoryId) ?? history[0] ?? null, [history, selectedHistoryId]);

  useEffect(() => {
    setBatchPage(1);
  }, [filteredResults]);

  const ITEMS_PER_PAGE = 10;
  const paginatedResults = useMemo(() => {
    const start = (batchPage - 1) * ITEMS_PER_PAGE;
    return filteredResults.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredResults, batchPage]);

  const totalPages = useMemo(() => {
    return Math.max(Math.ceil(filteredResults.length / ITEMS_PER_PAGE), 1);
  }, [filteredResults]);

  useEffect(() => {
    if (filteredResults.length > 0) {
      setStatsError(null);
      fetchBatchStats(filteredResults)
        .then((stats) => {
          setBatchStats(stats);
        })
        .catch((err) => {
          console.error('Error loading batch statistics:', err);
          setStatsError(err instanceof Error ? err.message : 'Detailed analytics failed to load.');
          setBatchStats(null);
        });
    } else {
      setBatchStats(null);
      setStatsError(null);
    }
  }, [filteredResults]);

  // Synchronize active screen state to localStorage for the AI Copilot
  useEffect(() => {
    try {
      const activeScreen = {
        activeTab: activeTab,
        selectedReviewId: selectedResult?.id ?? null,
        selectedReviewText: selectedResult?.text ? (selectedResult.text.length > 200 ? selectedResult.text.slice(0, 200) + '...' : selectedResult.text) : null,
        selectedReviewSentiment: selectedResult?.sentiment ?? null,
        selectedReviewEmotion: selectedResult?.primaryEmotion ?? null,
        batchSummary: results.length > 0 ? {
          total: results.length,
          averageSentiment: summary.averageSentiment,
          averageConfidence: summary.averageConfidence,
          primaryEmotion: overallPrimaryEmotion
        } : null
      };
      localStorage.setItem('sentix:active_screen_context', JSON.stringify(activeScreen));
    } catch (e) {
      console.warn("Failed to save active screen context to localStorage", e);
    }
  }, [activeTab, selectedResult, results, summary, overallPrimaryEmotion]);

  // Chatbot specific effects & handlers (safely referencing selectedResult)
  useEffect(() => {
    if (selectedResult) {
      const greeting = `I have loaded the analysis for review **${selectedResult.id}**.
• **Primary Emotion**: **${selectedResult.primaryEmotion}**
• **Sentiment**: **${sentimentLabel(selectedResult.sentiment)}** (Score: **${selectedResult.sentiment}**, Confidence: **${Math.round(selectedResult.confidenceScore * 100)}%**)
• **Summary**: ${selectedResult.summary}

How can I help you interpret these findings or explore details about the product under review?`;

      setChatMessages([{ role: 'assistant', content: greeting }]);
    } else {
      setChatMessages([
        {
          role: 'assistant',
          content: `Welcome to Sentix AI. I'm ready to assist you.
Please enter a review in the **Single Analysis** tab or upload a dataset in the **Batch Analysis** tab to get started. Once analyzed, I can interpret findings, explain emotional markers, or answer questions about the specific products!`
        }
      ]);
    }
  }, [selectedResult]);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId !== 'session-fallback') {
      const apiBaseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8000/api';
      fetch(`${apiBaseUrl}/chat/${sessionId}`, { method: 'DELETE' }).catch(() => {});
    }
  }, [selectedResult, sessionId]);

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);

    let activeScreenCtx = '';
    try {
      const storedCtx = localStorage.getItem('sentix:active_screen_context');
      if (storedCtx) {
        const parsed = JSON.parse(storedCtx);
        activeScreenCtx = `[Active Screen: Tab=${parsed.activeTab}` +
          (parsed.selectedReviewId ? `, Selected Review=${parsed.selectedReviewId} (Sentiment=${parsed.selectedReviewSentiment}, Emotion=${parsed.selectedReviewEmotion})` : '') +
          (parsed.batchSummary ? `, Batch Summary (Total=${parsed.batchSummary.total}, Avg Sentiment=${parsed.batchSummary.averageSentiment}, Emotion=${parsed.batchSummary.primaryEmotion})` : '') +
          `]`;
      }
    } catch (err) {
      console.warn("Failed to load active screen context", err);
    }

    const reviewContext = selectedResult
      ? `ID: ${selectedResult.id}
Text: "${selectedResult.text.length > 200 ? selectedResult.text.slice(0, 200) + '...' : selectedResult.text}"
Emotion: ${selectedResult.primaryEmotion}
Sentiment: ${selectedResult.sentiment}
Summary: ${selectedResult.summary}
KPIs: ${JSON.stringify(Object.fromEntries(Object.entries(selectedResult.metadata ?? {}).filter(([k]) => ['overall', 'Rating', 'helpful_yes', 'total_vote'].includes(k))))}
${activeScreenCtx}`
      : activeScreenCtx || undefined;

    try {
      const response = await sendChatMessage(
        sessionId,
        userMsg,
        chatProvider,
        chatModel,
        chatApiKey,
        reviewContext
      );
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response.response }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error connecting to AI backend. Make sure the backend is running and configured.';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${errorMsg}` }]);
    }
  }

  // Startup configuration loader
  useEffect(() => {
    const storedHistory = readLocalJson<HistoryEntry[]>(LOCAL_HISTORY_KEY);

    if (storedHistory) {
      setHistory(storedHistory);
      setSelectedHistoryId(storedHistory[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    writeLocalJson(LOCAL_HISTORY_KEY, history);
  }, [history]);

  useEffect(() => {
    if (filteredResults.length === 0) {
      if (selectedResultId !== null) {
        setSelectedResultId(null);
      }
      return;
    }

    if (!selectedResultId || !filteredResults.some((result) => result.id === selectedResultId)) {
      setSelectedResultId(filteredResults[0].id);
    }
  }, [filteredResults, selectedResultId]);

  useEffect(() => {
    if (history.length === 0) {
      return;
    }

    if (!selectedHistoryId || !history.some((entry) => entry.id === selectedHistoryId)) {
      setSelectedHistoryId(history[0].id);
    }
  }, [history, selectedHistoryId]);

  useEffect(() => {
    if (!banner) {
      return;
    }

    const timeout = window.setTimeout(() => setBanner(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  async function handleSingleAnalyze() {
    if (!inputText.trim()) {
      setBanner({ tone: 'error', message: 'Enter a review before running single analysis.' });
      return;
    }

    setIsAnalyzing(true);

    try {
      const result = await analyzeSingle(inputText, { mode: 'single' });
      setResults([result]);
      setSelectedResultId(result.id);
      setHistory((current) => [buildHistoryEntry({ kind: 'single', title: inputText.trim().slice(0, 72) || 'Single review', results: [result] }), ...current].slice(0, 30));
      setBanner({ tone: 'success', message: 'Single review analyzed successfully.' });
    } catch (error) {
      if (error instanceof ApiError) {
        setBanner({ tone: 'error', message: describeApiError(error) });
        return;
      }

      const fallback = buildDemoAnalysisResult({
        id: 'single-local',
        text: inputText,
        metadata: { mode: 'single-local' }
      });

      setResults([fallback]);
      setSelectedResultId(fallback.id);
      setHistory((current) => [buildHistoryEntry({ kind: 'single', title: inputText.trim().slice(0, 72) || 'Single review', results: [fallback] }), ...current].slice(0, 30));
      setBanner({ tone: 'warning', message: 'Backend unavailable. Local demo analysis was used instead.' });
    } finally {
      setIsAnalyzing(false);
      setActiveTab('single');
    }
  }

  async function handleFileSelected(file: File) {
    setIsParsing(true);
    setUploadedFileName(file.name);
    setMappedBatch([]);
    setResults([]);
    setSelectedResultId(null);
    setBatchProgress(null);
    setBanner(null);

    try {
      const rows = await parseDatasetFile(file);
      setUploadedData(rows);

      const headers = rows[0] ? Object.keys(rows[0]) : [];
      let mapping = EMPTY_MAPPING;

      if (headers.length > 0) {
        setIsMapping(true);
        try {
          mapping = await suggestColumns(headers);
        } catch {
          mapping = mapHeadersToColumns(headers);
        } finally {
          setIsMapping(false);
        }
      }

      setColumnMapping(mapping);
      setActiveTab('batch');
      setBanner({ tone: 'success', message: `Loaded ${rows.length} rows from ${file.name}. Review the mapping before analysis.` });
    } catch (error) {
      setBanner({ tone: 'error', message: error instanceof Error ? error.message : 'Unable to parse the selected file.' });
    } finally {
      setIsParsing(false);
    }
  }

  function handleMappingConfirm() {
    const mapped = buildMappedBatch(uploadedData, columnMapping);
    setMappedBatch(mapped);

    if (mapped.length === 0) {
      setBanner({ tone: 'error', message: 'No review column was mapped. Choose a review text column first.' });
      return;
    }

    setBanner({ tone: 'success', message: `Confirmed ${mapped.length} mapped rows for batch analysis.` });
  }

  function handleBatchReset() {
    setUploadedData([]);
    setColumnMapping(EMPTY_MAPPING);
    setMappedBatch([]);
    setUploadedFileName('');
    setBatchProgress(null);
    setResults([]);
    setSelectedResultId(null);
    setBanner({ tone: 'info', message: 'Batch workspace cleared.' });
  }

  function handleLoadSample() {
    const sampleRows = [
      { id: "row-1", productName: "MicroSDXC Ultra 64GB", brand: "SanDisk", modelNumber: "SDSDQUA-064G", reviewText: "The read speed is fantastic, but it failed after 3 months of usage. Very disappointed.", overall: 2.0, day_diff: 10, helpful_yes: 15, Polarity: -0.3 },
      { id: "row-2", productName: "MicroSDXC Ultra 64GB", brand: "SanDisk", modelNumber: "SDSDQUA-064G", reviewText: "This memory card works perfectly in my Galaxy S4! Plenty of space for HD video.", overall: 5.0, day_diff: 12, helpful_yes: 8, Polarity: 0.8 },
      { id: "row-3", productName: "MicroSDXC Ultra 64GB", brand: "SanDisk", modelNumber: "SDSDQUA-064G", reviewText: "Average performance. Speeds are standard, nothing exceptional. Standard value.", overall: 3.0, day_diff: 15, helpful_yes: 2, Polarity: 0.0 },
      { id: "row-4", productName: "MicroSDXC Ultra 64GB", brand: "SanDisk", modelNumber: "SDSDQUA-064G", reviewText: "Extremely fast, reliable card. SanDisk has always been my go-to brand.", overall: 5.0, day_diff: 8, helpful_yes: 22, Polarity: 0.9 },
      { id: "row-5", productName: "MicroSDXC Ultra 64GB", brand: "SanDisk", modelNumber: "SDSDQUA-064G", reviewText: "Do not buy this! It was not recognized by my device out of the box.", overall: 1.0, day_diff: 20, helpful_yes: 5, Polarity: -0.8 }
    ];
    setUploadedData(sampleRows);
    setUploadedFileName('sample_reviews.csv');
    const mapping = {
      reviewColumn: 'reviewText',
      productName: 'productName',
      brand: 'brand',
      modelNumber: 'modelNumber'
    };
    setColumnMapping(mapping);
    const mapped = buildMappedBatch(sampleRows, mapping);
    setMappedBatch(mapped);
    setActiveTab('batch');
    setBanner({ tone: 'success', message: 'Sample e-commerce dataset loaded! Review the column mapping below and click "Start Analysis".' });
  }

  async function handleBatchAnalyze() {
    const batch = mappedBatch;

    if (batch.length === 0) {
      setBanner({ tone: 'error', message: 'Confirm a mapped batch before starting analysis.' });
      return;
    }

    setIsAnalyzing(true);
    setBatchProgress({ completed: 0, total: batch.length });

    try {
      const analyzed = await analyzeBatchStream(batch, setBatchProgress);
      setResults(analyzed);
      setSelectedResultId(analyzed[0]?.id ?? null);
      setHistory((current) => [buildHistoryEntry({ kind: 'batch', title: uploadedFileName || 'Batch analysis', results: analyzed, sourceName: uploadedFileName || undefined }), ...current].slice(0, 30));
      setBanner({ tone: 'success', message: `Batch analysis finished for ${analyzed.length} rows.` });
    } catch (error) {
      if (error instanceof ApiError) {
        setBanner({ tone: 'error', message: describeApiError(error) });
        return;
      }

      const fallback = batch.map((item, index) =>
        buildDemoAnalysisResult({
          id: item.id || `row-${index + 1}`,
          text: item.text,
          metadata: item.metadata ?? null
        })
      );

      setResults(fallback);
      setSelectedResultId(fallback[0]?.id ?? null);
      setHistory((current) => [buildHistoryEntry({ kind: 'batch', title: uploadedFileName || 'Batch analysis', results: fallback, sourceName: uploadedFileName || undefined }), ...current].slice(0, 30));
      setBanner({ tone: 'warning', message: 'Backend unavailable. Local demo batch analysis was used instead.' });
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(null);
      setActiveTab('batch');
    }
  }

  async function handleExportPdf() {
    const report = document.getElementById('analysis-report');
    if (!report) {
      setBanner({ tone: 'error', message: 'No analysis report is available to export yet.' });
      return;
    }

    try {
      const module = await import('html2pdf.js');
      const html2pdf = (module.default ?? module) as unknown as () => {
        set: (options: Record<string, unknown>) => { from: (element: HTMLElement) => { save: () => Promise<void> } };
      };

      await html2pdf()
        .set({
          margin: 0.4,
          filename: 'sentix-analysis-report.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        })
        .from(report)
        .save();

      setBanner({ tone: 'success', message: 'PDF report exported successfully.' });
    } catch {
      setBanner({ tone: 'error', message: 'PDF export failed. Try again after the report finishes rendering.' });
    }
  }

  function handleLoadHistory(entry: HistoryEntry) {
    setSelectedHistoryId(entry.id);
    setResults(entry.results);
    setSelectedResultId(entry.results[0]?.id ?? null);
    setActiveTab(entry.kind);
    setBanner({ tone: 'info', message: `Loaded ${entry.title} from browser history.` });
  }

  function updateMappingField(key: keyof ColumnMapping, value: string) {
    setColumnMapping((current) => ({
      ...current,
      [key]: value === 'NONE' ? null : value
    }));
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-sentix-bg text-sentix-text antialiased">
      <SparkleBackdrop />

      <div className="relative mx-auto flex min-h-screen max-w-[1800px] gap-5 p-4 lg:p-6">
        <aside
          className={cn(
            'flex flex-col rounded-[2rem] border border-sentix-border bg-sentix-surface/90 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300',
            sidebarCollapsed ? 'w-[92px]' : 'w-full lg:w-[320px]'
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-sentix-border pb-4">
            <div className={cn('flex items-center gap-3', sidebarCollapsed && 'justify-center')}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-sentix-accent/30 bg-sentix-accent/10 text-sentix-accent shadow-glow">
                <ShieldCheck className="h-5 w-5" />
              </div>
              {!sidebarCollapsed ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-sentix-muted">Sentix</p>
                  <h1 className="mt-1 text-lg font-black tracking-[0.22em] text-sentix-text">Emotion Intelligence</h1>
                </div>
              ) : null}
            </div>

            <Button variant="ghost" className="h-10 w-10 rounded-2xl px-0" onClick={() => setSidebarCollapsed((value) => !value)} aria-label="Toggle sidebar">
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <div className={cn('mt-5 space-y-3', sidebarCollapsed && 'items-center')}>
            {NAVIGATION.map((item) => (
              <TabButton key={item.id} item={item} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} collapsed={sidebarCollapsed} />
            ))}
          </div>

          {!sidebarCollapsed ? (
            <div className="mt-6 space-y-3 border-t border-sentix-border pt-4">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-sentix-border bg-black/30 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Engine</p>
                  <p className="mt-1 text-sm font-semibold text-sentix-text">SENTIX Core</p>
                </div>
                <Activity className={cn('h-5 w-5', banner?.tone === 'error' ? 'text-red-300' : 'text-sentix-accent')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Results" value={results.length} caption="Current analysis set" />
                <MetricCard label="History" value={history.length} caption="Browser-local entries" />
              </div>

              <div className="rounded-2xl border border-sentix-border bg-black/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Runtime Mode</p>
                <p className="mt-2 text-sm leading-6 text-sentix-text">Local Rule-Based Classifier</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>Joy</Badge>
                  <Badge>Anger</Badge>
                  <Badge>Sadness</Badge>
                  <Badge>Fear</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 border-t border-sentix-border pt-4 text-center text-[10px] uppercase tracking-[0.35em] text-sentix-muted">
              <span>Sentix</span>
              <span>Lab mode</span>
            </div>
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-5">
          <header className="rounded-[2rem] border border-sentix-border bg-sentix-surface/90 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border-sentix-accent/30 bg-sentix-accent/10 text-sentix-accent')}>Lab / Terminal</Badge>
                  <Badge>Sentix Core NLP</Badge>
                  <Badge>{history.length} history items</Badge>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-sentix-muted">Sentix Product Emotion Intelligence</p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight text-sentix-text md:text-4xl">Emotion analysis for product reviews, datasets, and live feedback streams.</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-sentix-muted">Single review analysis, batch uploads, AI-assisted column mapping, and browser-local history.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => void handleExportPdf()} disabled={results.length === 0}>
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Reviews" value={summary.total} caption="Filtered selection" />
              <MetricCard label="Avg Sentiment" value={formatNumber(summary.averageSentiment, 3)} caption={sentimentLabel(summary.averageSentiment)} tone={sentimentTone(summary.averageSentiment)} />
              <MetricCard label="Confidence" value={`${formatNumber(summary.averageConfidence * 100)}%`} caption="Average confidence score" />
              <MetricCard label="Primary Emotion" value={overallPrimaryEmotion} caption="Most common dominant emotion" />
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} variants={ROOT_VARIANTS} initial="initial" animate="animate" exit="exit" className="space-y-5">
              <Banner banner={banner} onClear={() => setBanner(null)} />

              {activeTab === 'welcome' ? (
                <section className="grid gap-5">
                  <Panel
                    title="Welcome to Sentix Portal"
                    subtitle="Learn how to navigate, analyze reviews, and work with your AI assistant."
                  >
                    <div className="space-y-6">
                      <div className="rounded-2xl bg-gradient-to-br from-sentix-accent/20 to-emerald-500/10 p-5 border border-sentix-accent/20">
                        <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-sentix-text flex items-center gap-2">
                          <Compass className="h-5 w-5 text-sentix-accent" />
                          Overview of Features
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-sentix-muted">
                          Sentix is a sophisticated web application designed for deep emotional and sentiment analysis of product reviews. The system uses a hybrid natural language processing engine (combining machine learning models, custom lexicons, and dictionary-based scoring) to parse reviews and extract detailed insights.
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Single Analysis Card */}
                        <div className="group relative rounded-2xl border border-sentix-border bg-black/40 p-5 transition hover:border-sentix-accent/40 hover:bg-black/60">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sentix-accent/10 text-sentix-accent group-hover:scale-110 transition">
                              <Sparkles className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-sentix-text">Single Review Analysis</h4>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-sentix-muted">
                            Type or paste a product feedback text. The hybrid NLP engine extracts sentiment polarity scores and tracks 6 core emotions (Joy, Love, Surprise, Anger, Fear, Sadness) along with auto-generated keywords and summaries.
                          </p>
                          <Button variant="secondary" className="mt-4 w-full justify-center" onClick={() => setActiveTab('single')}>
                            Launch Single Analysis
                          </Button>
                        </div>

                        {/* Batch Analysis Card */}
                        <div className="group relative rounded-2xl border border-sentix-border bg-black/40 p-5 transition hover:border-sentix-accent/40 hover:bg-black/60">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sentix-accent/10 text-sentix-accent group-hover:scale-110 transition">
                              <Database className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-sentix-text">Batch Dataset Processing</h4>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-sentix-muted">
                            Upload a spreadsheet/CSV containing hundreds of rows of feedback. Map columns dynamically (via LLM suggestion or manual selection) and stream results in real time.
                          </p>
                          <Button variant="secondary" className="mt-4 w-full justify-center" onClick={() => setActiveTab('batch')}>
                            Launch Batch Analysis
                          </Button>
                        </div>

                        {/* EDA Dashboard Card */}
                        <div className="group relative rounded-2xl border border-sentix-border bg-black/40 p-5 transition hover:border-sentix-accent/40 hover:bg-black/60">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sentix-accent/10 text-sentix-accent group-hover:scale-110 transition">
                              <LayoutDashboard className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-sentix-text">EDA & Performance Analytics</h4>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-sentix-muted">
                            Inspect rating star distributions, numeric feature correlation heatmaps, and supervised machine learning performance analyses (such as confusion matrices against ground truth).
                          </p>
                          <Button variant="secondary" className="mt-4 w-full justify-center" onClick={() => setActiveTab('eda')}>
                            Open EDA Dashboard
                          </Button>
                        </div>

                        {/* AI Copilot Card */}
                        <div className="group relative rounded-2xl border border-sentix-border bg-black/40 p-5 transition hover:border-sentix-accent/40 hover:bg-black/60">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sentix-accent/10 text-sentix-accent group-hover:scale-110 transition">
                              <Brain className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-sentix-text">AI Copilot & Recommendations</h4>
                          </div>
                          <p className="mt-3 text-xs leading-relaxed text-sentix-muted">
                            Discuss the results of your current batch analysis or single review with the AI Copilot. Ask it for business advice, such as whether to keep, improve, or drop specific product lineups.
                          </p>
                          <Button variant="secondary" className="mt-4 w-full justify-center" onClick={() => setChatOpen(true)}>
                            Open AI Copilot Chat
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-sentix-border bg-black/20 p-5 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-sentix-text flex items-center gap-2">
                          <Play className="h-4 w-4 text-sentix-accent" />
                          Quick Demo: Load Sample Data
                        </h4>
                        <p className="text-xs leading-relaxed text-sentix-muted">
                          Don't have a dataset ready? Click the button below to load a sample e-commerce review dataset into the workspace. It will automatically configure column mappings for you, and you can instantly run the analysis and examine the dashboard.
                        </p>
                        <Button className="w-full justify-center bg-gradient-to-br from-sentix-accent to-emerald-500 text-black hover:opacity-90" onClick={handleLoadSample}>
                          Load Sample Dataset & Open Batch Tab
                        </Button>
                      </div>
                    </div>
                  </Panel>
                </section>
              ) : activeTab === 'single' ? (
                <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <Panel
                    title="Single Analysis"
                    subtitle="Paste a review and let Sentix score the emotions, sentiment, tags, and summary."
                    action={
                      <Button onClick={() => void handleSingleAnalyze()} disabled={isAnalyzing}>
                        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Analyze
                      </Button>
                    }
                  >
                    <div className="space-y-4">
                      <div>
                        <FieldLabel label="Review Text" hint="Required" />
                        <TextArea value={inputText} onChange={(event) => setInputText(event.target.value)} placeholder="Paste a product review here..." />
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <MetricCard label="Engine" value="SENTIX NLP" caption="Classifier engine" />
                        <MetricCard label="Type" value="Rule-Based" caption="Analysis style" />
                        <MetricCard label="Lexicons" value="6 Emotions" caption="Target categories" />
                      </div>

                      <div className="rounded-3xl border border-sentix-border bg-black/30 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Supported Emotional Dimensions</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge>Joy</Badge>
                          <Badge>Anger</Badge>
                          <Badge>Sadness</Badge>
                          <Badge>Fear</Badge>
                          <Badge>Surprise</Badge>
                          <Badge>Disgust</Badge>
                        </div>
                      </div>
                    </div>
                  </Panel>

                  <Panel
                    title="Live Result"
                    subtitle="The result shown here is what will also be stored in local history."
                    action={results.length > 0 ? <Badge>{filteredResults.length} shown</Badge> : null}
                  >
                    {selectedResult ? (
                      <ResultCard result={selectedResult} active onSelect={() => undefined} />
                    ) : (
                      <EmptyState icon={Brain} title="No result yet" subtitle="Run single analysis to populate the result panel and the emotion dashboard." />
                    )}
                  </Panel>
                </section>
              ) : null}

              {activeTab === 'batch' ? (
                <section className="flex flex-col gap-5">
                  <Panel
                    title="Batch Intake"
                    subtitle="Upload CSV, JSON, or Excel data, infer the review column, and confirm the mapping before analysis."
                    action={
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={handleBatchReset}>
                          <RefreshCcw className="h-4 w-4" />
                          Reset
                        </Button>
                      </div>
                    }
                  >
                    <div
                      className="space-y-5"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={async (event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files[0];
                        if (file) {
                          await handleFileSelected(file);
                        }
                      }}
                    >
                      <div className="rounded-3xl border border-dashed border-sentix-border bg-black/20 p-6 text-center">
                        <FileUp className="mx-auto h-8 w-8 text-sentix-accent" />
                        <h3 className="mt-4 text-sm font-bold uppercase tracking-[0.3em] text-sentix-text">Drop dataset files here</h3>
                        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-sentix-muted">Drag and drop a CSV, JSON, XLS, or XLSX file. Sentix will parse the rows and suggest the review text column automatically.</p>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-sentix-border bg-white/5 px-4 py-3 text-sm font-semibold text-sentix-text transition hover:border-sentix-accent hover:bg-sentix-accent/10">
                            {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            <span>Select File</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".csv,.json,.xls,.xlsx"
                              onChange={async (event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  await handleFileSelected(file);
                                }
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                          <Button variant="secondary" onClick={() => void suggestColumns(uploadedHeaders).then(setColumnMapping).catch(() => setColumnMapping(mapHeadersToColumns(uploadedHeaders)))} disabled={uploadedHeaders.length === 0 || isMapping}>
                            <Wand2 className="h-4 w-4" />
                            Suggest Columns
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <MetricCard label="Rows Loaded" value={uploadedData.length} caption={uploadedFileName || 'No file selected yet'} />
                        <MetricCard label="Mapped Rows" value={mappedBatch.length || batchPreview.length} caption="Confirm mapping to stage rows" />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <FieldLabel label="Review Column" />
                          <Select value={columnMapping.reviewColumn ?? 'NONE'} onChange={(event) => updateMappingField('reviewColumn', event.target.value)}>
                            <option value="NONE">None</option>
                            {uploadedHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <FieldLabel label="Brand Column" />
                          <Select value={columnMapping.brand ?? 'NONE'} onChange={(event) => updateMappingField('brand', event.target.value)}>
                            <option value="NONE">None</option>
                            {uploadedHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <FieldLabel label="Product Name Column" />
                          <Select value={columnMapping.productName ?? 'NONE'} onChange={(event) => updateMappingField('productName', event.target.value)}>
                            <option value="NONE">None</option>
                            {uploadedHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <FieldLabel label="Model Number Column" />
                          <Select value={columnMapping.modelNumber ?? 'NONE'} onChange={(event) => updateMappingField('modelNumber', event.target.value)}>
                            <option value="NONE">None</option>
                            {uploadedHeaders.map((header) => (
                              <option key={header} value={header}>{header}</option>
                            ))}
                          </Select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={handleMappingConfirm} disabled={uploadedData.length === 0}>
                          <Wand2 className="h-4 w-4" />
                          Confirm Mapping
                        </Button>
                        <Button onClick={() => void handleBatchAnalyze()} disabled={isAnalyzing || mappedBatch.length === 0}>
                          {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                          Start Analysis
                        </Button>
                      </div>

                      <ProgressBar progress={batchProgress} />

                      <div className="overflow-hidden rounded-3xl border border-sentix-border bg-black/30">
                        <div className="border-b border-sentix-border px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Parsed preview</p>
                        </div>
                        {uploadedData.length > 0 ? (
                          <div className="max-h-[280px] overflow-auto">
                            <table className="w-full border-separate border-spacing-0 text-left text-xs">
                              <thead className="sticky top-0 bg-black/80">
                                <tr>
                                  {uploadedHeaders.map((header) => (
                                    <th key={header} className="border-b border-sentix-border px-4 py-3 font-bold uppercase tracking-[0.25em] text-sentix-muted">{header}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {uploadedData.slice(0, 5).map((row, rowIndex) => (
                                  <tr key={rowIndex} className="border-b border-sentix-border/60">
                                    {uploadedHeaders.map((header) => (
                                      <td key={header} className="max-w-[180px] border-b border-sentix-border/60 px-4 py-3 text-sm text-sentix-text">
                                        {String(row[header] ?? '')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-6">
                            <EmptyState icon={FileText} title="No dataset loaded" subtitle="Upload a file to inspect the parsed header structure and column mapping hints." />
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>

                  <Panel
                    title="Batch Result Workspace"
                    subtitle="Charts, scores, and row-by-row results appear here once the batch is analyzed."
                    action={results.length > 0 ? <Badge>{filteredResults.length} visible</Badge> : null}
                  >
                    {filteredResults.length > 0 ? (
                      <div id="analysis-report" className="space-y-5">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <MetricCard label="Visible Rows" value={summary.total} caption="Filtered by the current controls" />
                          <MetricCard label="Avg Sentiment" value={formatNumber(summary.averageSentiment, 3)} caption={sentimentLabel(summary.averageSentiment)} tone={sentimentTone(summary.averageSentiment)} />
                          <MetricCard label="Avg Confidence" value={`${formatNumber(summary.averageConfidence * 100)}%`} caption="Mean confidence score" />
                          <MetricCard label="Primary Emotion" value={summary.primaryEmotion} caption="Dominant emotion in the selection" />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <FieldLabel label="Emotion Filter" />
                            <Select value={filterEmotion} onChange={(event) => setFilterEmotion(event.target.value as 'ALL' | EmotionName)}>
                              <option value="ALL">All emotions</option>
                              {emotionOrder.map((emotion) => (
                                <option key={emotion} value={emotion}>{emotion}</option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <FieldLabel label="Sentiment Filter" />
                            <Select value={filterSentiment} onChange={(event) => setFilterSentiment(event.target.value as SentimentFilter)}>
                              {SENTIMENT_FILTER_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </Select>
                          </div>
                          <MetricCard label="Positive" value={summary.positiveCount} caption="Rows above the positive threshold" />
                          <MetricCard label="Negative" value={summary.negativeCount} caption="Rows below the negative threshold" />
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <EmotionRadarPanel results={filteredResults} />
                          <EmotionDistributionPanel results={filteredResults} />
                        </div>

                        {statsError ? (
                          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                            <p className="text-sm font-bold uppercase tracking-wider text-red-400">⚠️ Analytics Service Offline</p>
                            <p className="mt-2 text-xs text-red-300">Detailed forecasts and topic modeling clusters could not be computed by the backend.</p>
                          </div>
                        ) : batchStats ? (
                          <>
                            <div className="grid gap-5">
                              <TopicModelingPanel topics={batchStats.topics} />
                            </div>
                            {batchStats.eda_plots && (
                              <div className="grid gap-5 md:grid-cols-3">
                                {batchStats.eda_plots.distribution_plot && (
                                  <Panel title="Feature Distributions" subtitle="Ratings & true polarity spreads.">
                                    <img
                                      src={`data:image/png;base64,${batchStats.eda_plots.distribution_plot}`}
                                      alt="Distribution Plot"
                                      className="w-full rounded-2xl border border-sentix-border bg-black/40"
                                    />
                                  </Panel>
                                )}
                                {batchStats.eda_plots.correlation_heatmap && (
                                  <Panel title="Correlation Matrix" subtitle="Inter-feature numeric associations.">
                                    <img
                                      src={`data:image/png;base64,${batchStats.eda_plots.correlation_heatmap}`}
                                      alt="Correlation Heatmap"
                                      className="w-full rounded-2xl border border-sentix-border bg-black/40"
                                    />
                                  </Panel>
                                )}
                                {batchStats.eda_plots.confusion_matrix && (
                                  <Panel title="ML Performance Analysis" subtitle="True vs predicted confusion matrix.">
                                    <img
                                      src={`data:image/png;base64,${batchStats.eda_plots.confusion_matrix}`}
                                      alt="Confusion Matrix"
                                      className="w-full rounded-2xl border border-sentix-border bg-black/40"
                                    />
                                  </Panel>
                                )}
                              </div>
                            )}
                          </>
                        ) : (
                          <SentimentTimelinePanel results={filteredResults} />
                        )}



                        <div className="grid gap-5 xl:grid-cols-[0.42fr_0.58fr]">
                          <div className="space-y-3">
                            <Panel title="Analysis Rows" subtitle="Click a row to inspect its exact scores and metadata.">
                              <div className="space-y-4">
                                <div className="space-y-3">
                                  {paginatedResults.map((result) => (
                                    <ResultCard key={result.id} result={result} active={selectedResult?.id === result.id} onSelect={() => setSelectedResultId(result.id)} />
                                  ))}
                                </div>
                                {totalPages > 1 && (
                                  <div className="flex items-center justify-between border-t border-sentix-border pt-4">
                                    <button
                                      type="button"
                                      disabled={batchPage === 1}
                                      onClick={() => setBatchPage((p) => Math.max(p - 1, 1))}
                                      className="rounded-xl border border-sentix-border bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-sentix-text transition hover:bg-white/10 disabled:opacity-40"
                                    >
                                      Previous
                                    </button>
                                    <span className="text-xs uppercase tracking-widest text-sentix-muted">
                                      Page {batchPage} of {totalPages}
                                    </span>
                                    <button
                                      type="button"
                                      disabled={batchPage === totalPages}
                                      onClick={() => setBatchPage((p) => Math.min(p + 1, totalPages))}
                                      className="rounded-xl border border-sentix-border bg-white/5 px-3 py-2 text-xs font-bold uppercase tracking-wider text-sentix-text transition hover:bg-white/10 disabled:opacity-40"
                                    >
                                      Next
                                    </button>
                                  </div>
                                )}
                              </div>
                            </Panel>
                          </div>

                          <Panel title="Selected Result" subtitle="Detailed emotion breakdown, summary, and metadata for the chosen review.">
                            {selectedResult ? (
                              <div className="space-y-5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge>{selectedResult.primaryEmotion}</Badge>
                                  <Badge>{sentimentLabel(selectedResult.sentiment)}</Badge>
                                  <Badge>{formatNumber(selectedResult.confidenceScore * 100)}% confidence</Badge>
                                  <Badge>{selectedResult.id}</Badge>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Summary</p>
                                  <p className="mt-3 text-sm leading-7 text-sentix-text">{selectedResult.summary}</p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Emotion Scores</p>
                                  <div className="mt-4 space-y-3">
                                    {selectedResult.emotions.map((emotion) => (
                                      <div key={emotion.emotion} className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-sentix-muted">
                                          <span>{emotion.emotion}</span>
                                          <span>{formatPercent(emotion.score)}</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                                          <div className="h-full rounded-full bg-sentix-accent" style={{ width: `${Math.max(emotion.score * 100, 3)}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Tags</p>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedResult.tags.map((tag) => (
                                      <Badge key={tag}>{tag}</Badge>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Sentiment Engines Comparison</p>
                                  <div className="mt-3 grid grid-cols-3 gap-3">
                                    <div className="rounded-2xl border border-sentix-border bg-black/20 p-3 text-center">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-sentix-muted">VADER Compound</p>
                                      <p className="mt-1 text-sm font-semibold text-cyan-300">
                                        {selectedResult.vaderCompound !== undefined ? selectedResult.vaderCompound.toFixed(3) : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="rounded-2xl border border-sentix-border bg-black/20 p-3 text-center">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-sentix-muted">Subjectivity (TextBlob)</p>
                                      <p className="mt-1 text-sm font-semibold text-purple-300">
                                        {selectedResult.subjectivity !== undefined ? `${Math.round(selectedResult.subjectivity * 100)}%` : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="rounded-2xl border border-sentix-border bg-black/20 p-3 text-center">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-sentix-muted">Supervised ML Polarity</p>
                                      <p className="mt-1 text-sm font-semibold text-emerald-300">
                                        {selectedResult.mlSentiment !== undefined ? selectedResult.mlSentiment.toFixed(3) : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Metadata</p>
                                  <pre className="mt-3 overflow-auto rounded-3xl border border-sentix-border bg-black/30 p-4 text-xs leading-6 text-sentix-text">
                                    {JSON.stringify(selectedResult.metadata ?? {}, null, 2)}
                                  </pre>
                                </div>

                              </div>
                            ) : (
                              <EmptyState icon={Brain} title="Nothing selected" subtitle="Analyze a batch and click any row to inspect the full result payload." />
                            )}
                          </Panel>
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon={Database} title="No batch result yet" subtitle="Upload a dataset, confirm the mapping, and start analysis to populate the dashboard." />
                    )}
                  </Panel>
                </section>
              ) : null}

              {activeTab === 'eda' ? (
                <section className="space-y-5">
                  <Panel
                    title="Exploratory Data Analysis Dashboard"
                    subtitle="Interactive visualizations, feature distributions, and correlation matrices generated by the backend."
                    action={results.length > 0 ? <Badge>{results.length} reviews loaded</Badge> : null}
                  >
                    {statsError ? (
                      <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
                        <p className="text-sm font-bold uppercase tracking-wider text-red-400">⚠️ EDA Visualization Service Offline</p>
                        <p className="mt-2 text-xs text-red-300">The backend returned an error (503/500). Please check if the backend server is running and configured correctly.</p>
                      </div>
                    ) : batchStats?.eda_plots ? (
                      <div className="space-y-6">
                        <div className="grid gap-5 md:grid-cols-3">
                          {batchStats.eda_plots.distribution_plot && (
                            <Panel title="Feature Distributions" subtitle="Ratings & true polarity spreads.">
                              <div className="flex justify-center p-2 bg-black/40 rounded-2xl border border-sentix-border">
                                <img
                                  src={`data:image/png;base64,${batchStats.eda_plots.distribution_plot}`}
                                  alt="Distribution Plot"
                                  className="max-h-[350px] object-contain rounded-xl"
                                />
                              </div>
                            </Panel>
                          )}
                          {batchStats.eda_plots.correlation_heatmap && (
                            <Panel title="Correlation Matrix" subtitle="Inter-feature numeric associations.">
                              <div className="flex justify-center p-2 bg-black/40 rounded-2xl border border-sentix-border">
                                <img
                                  src={`data:image/png;base64,${batchStats.eda_plots.correlation_heatmap}`}
                                  alt="Correlation Heatmap"
                                  className="max-h-[350px] object-contain rounded-xl"
                                />
                              </div>
                            </Panel>
                          )}
                          {batchStats.eda_plots.confusion_matrix && (
                            <Panel title="ML Performance Analysis" subtitle="True vs predicted confusion matrix.">
                              <div className="flex justify-center p-2 bg-black/40 rounded-2xl border border-sentix-border">
                                <img
                                  src={`data:image/png;base64,${batchStats.eda_plots.confusion_matrix}`}
                                  alt="Confusion Matrix"
                                  className="max-h-[350px] object-contain rounded-xl"
                                />
                              </div>
                            </Panel>
                          )}
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <EmotionRadarPanel results={filteredResults} />
                          <EmotionDistributionPanel results={filteredResults} />
                        </div>
                      </div>
                    ) : (
                      <EmptyState
                        icon={LayoutDashboard}
                        title="No EDA Visualization Data"
                        subtitle="Please upload a dataset in the Batch Analysis tab and start analysis to generate the visual charts."
                      />
                    )}
                  </Panel>
                </section>
              ) : null}

              {activeTab === 'history' ? (
                <section className="grid gap-5 xl:grid-cols-[0.38fr_0.62fr]">
                  <Panel title="Browser History" subtitle="Previous analyses stay in localStorage on this machine only.">
                    {history.length > 0 ? (
                      <div className="space-y-3">
                        {history.map((entry) => (
                          <HistoryCard key={entry.id} entry={entry} active={selectedHistoryEntry?.id === entry.id} onSelect={() => handleLoadHistory(entry)} />
                        ))}
                      </div>
                    ) : (
                      <EmptyState icon={History} title="No history yet" subtitle="Run a single review or batch analysis to create the first local history entry." />
                    )}
                  </Panel>

                  <Panel title="History Detail" subtitle="The selected entry loads its original result set into the dashboard.">
                    {selectedHistoryEntry ? (
                      <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{selectedHistoryEntry.kind}</Badge>
                          <Badge>{selectedHistoryEntry.primaryEmotion}</Badge>
                          <Badge>{formatNumber(selectedHistoryEntry.averageSentiment, 3)} sentiment</Badge>
                          <Badge>{selectedHistoryEntry.results.length} results</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <MetricCard label="Average Sentiment" value={formatNumber(selectedHistoryEntry.averageSentiment, 3)} caption={sentimentLabel(selectedHistoryEntry.averageSentiment)} tone={sentimentTone(selectedHistoryEntry.averageSentiment)} />
                          <MetricCard label="Classifier Type" value="Rule-Based" caption="Lexicon dictionary method" />
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Source</p>
                          <p className="mt-3 text-sm leading-7 text-sentix-text">{selectedHistoryEntry.sourceName ?? 'Browser-local analysis snapshot'}</p>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
                          <EmotionRadarPanel results={selectedHistoryEntry.results} />
                          <SentimentTimelinePanel results={selectedHistoryEntry.results} />
                        </div>

                        <div className="rounded-3xl border border-sentix-border bg-black/30 p-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">Analysis Context</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge>Browser Local Storage</Badge>
                            <Badge>{selectedHistoryEntry.kind.toUpperCase()}</Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <EmptyState icon={History} title="No history selected" subtitle="Choose a saved analysis entry to reload its scores." />
                    )}
                  </Panel>
                </section>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <ChatDrawer
        isOpen={chatOpen}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        chatInput={chatInput}
        onInputChange={setChatInput}
        onSend={handleSendChat}
        isVisible={true}
        chatProvider={chatProvider}
        setChatProvider={setChatProvider}
        chatModel={chatModel}
        setChatModel={setChatModel}
        chatApiKey={chatApiKey}
        setChatApiKey={setChatApiKey}
        serverKeys={serverKeys}
      />
    </div>
  );
}
