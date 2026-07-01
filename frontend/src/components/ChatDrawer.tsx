import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Settings, Key, Zap, Globe, Check, AlertTriangle } from 'lucide-react';

// ── Typewriter Component ──
const Typewriter = ({ text, speed = 8 }: { text: string; speed?: number }) => {
  const [currentLength, setCurrentLength] = useState(0);

  useEffect(() => {
    setCurrentLength(0);
  }, [text]);

  useEffect(() => {
    if (currentLength >= text.length) return;

    const timer = setTimeout(() => {
      setCurrentLength((prev) => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [text, currentLength, speed]);

  const displayedText = text.slice(0, currentLength);

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: displayedText.replace(
          /\*\*(.*?)\*\*/g,
          '<b class="text-white font-semibold">$1</b>'
        ),
      }}
    />
  );
};

// ── Provider & Model Registry ──
export const PROVIDER_OPTIONS = {
  "Google": [
    { id: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", agent: true },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", agent: true },
    { id: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", agent: true },
    { id: "google/gemini-1.5-pro", label: "Gemini 1.5 Pro", agent: true },
    { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash (Stable)", agent: true },
    { id: "google/gemini-1.5-flash-002", label: "Gemini 1.5 Flash (Stable)", agent: true },
    { id: "google/gemini-1.5-pro-002", label: "Gemini 1.5 Pro (Stable)", agent: true }
  ],
  "OpenRouter": [
    { id: "openrouter/owl-alpha", label: "Owl Alpha", agent: false },
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "NVIDIA: Nemotron 3 Ultra (free)", agent: false },
    { id: "google/gemma-4-31b-it:free", label: "Google: Gemma 4 31B (free)", agent: false },
    { id: "poolside/laguna-m.1:free", label: "Poolside: Laguna M.1 (free)", agent: false },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "NVIDIA: Nemotron 3 Super (free)", agent: true },
    { id: "openai/gpt-oss-120b:free", label: "OpenAI: gpt-oss-120b (free)", agent: false },
    { id: "poolside/laguna-xs.2:free", label: "Poolside: Laguna XS.2 (free)", agent: false },
    { id: "cohere/north-mini-code:free", label: "Cohere: North Mini Code (free)", agent: false },
    { id: "openrouter/free", label: "randome free model roulette", agent: true },
    { id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Venice: Uncensored (free)", agent: true },
    { id: "openai/gpt-oss-20b:free", label: "OpenAI: gpt-oss-20b (free)", agent: false },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "NVIDIA: Nemotron 3 Nano 30B A3B (free)", agent: false },
    { id: "google/gemma-4-26b-a4b-it:free", label: "Google: Gemma 4 26B A4B (free)", agent: false },
    { id: "nvidia/nemotron-nano-9b-v2:free", label: "NVIDIA: Nemotron Nano 9B V2 (free)", agent: false },
    { id: "nousresearch/hermes-3-llama-3.1-405b:free", label: "Nous Research: Hermes 3 Llama 3.1 405B (free)", agent: true },
    { id: "qwen/qwen3-coder:free", label: "Qwen: Qwen3 Coder 480B A35B (free)", agent: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Meta: Llama 3.3 70B Instruct (free)", agent: true }
  ],
  "NVIDIA": [
    { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "NVIDIA: Nemotron 3 Ultra (free)", agent: false },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "NVIDIA: Nemotron 3 Super (free)", agent: true },
    { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "NVIDIA: Nemotron 3 Nano 30B A3B (free)", agent: false },
    { id: "nvidia/nemotron-nano-9b-v2:free", label: "NVIDIA: Nemotron Nano 9B V2 (free)", agent: false }
  ]
} as const;

export type ProviderName = keyof typeof PROVIDER_OPTIONS;

export const PROVIDER_NEEDS_KEY: Record<ProviderName, boolean> = {
  "Google": true,
  "OpenRouter": true,
  "NVIDIA": true
};


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  messages: ChatMessage[];
  chatInput: string;
  onInputChange: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
  isVisible: boolean;
  chatProvider: ProviderName;
  setChatProvider: (val: ProviderName) => void;
  chatModel: string;
  setChatModel: (val: string) => void;
  chatApiKey: string;
  setChatApiKey: (val: string) => void;
  serverKeys?: Record<string, boolean>;
}

const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onOpen,
  onClose,
  messages,
  chatInput,
  onInputChange,
  onSend,
  isVisible,
  chatProvider,
  setChatProvider,
  chatModel,
  setChatModel,
  chatApiKey,
  setChatApiKey,
  serverKeys = {},
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsConfirmed, setSettingsConfirmed] = useState(false);
  const [showConfirmBadge, setShowConfirmBadge] = useState(false);

  // Staging state for settings
  const [stagedProvider, setStagedProvider] = useState<ProviderName>(chatProvider);
  const [stagedModel, setStagedModel] = useState<string>(chatModel);
  const [stagedApiKey, setStagedApiKey] = useState<string>(chatApiKey);

  // Auto-scroll when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync staged state when settings panel opens
  useEffect(() => {
    if (settingsOpen) {
      setStagedProvider(chatProvider);
      setStagedModel(chatModel);
      setStagedApiKey(chatApiKey);
    }
  }, [settingsOpen, chatProvider, chatModel, chatApiKey]);

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProv = e.target.value as ProviderName;
    setStagedProvider(newProv);
    const models = PROVIDER_OPTIONS[newProv] || [];
    setStagedModel(models.length > 0 ? models[0].id : "");
  };

  const handleApplySettings = () => {
    setChatProvider(stagedProvider);
    setChatModel(stagedModel);
    setChatApiKey(stagedApiKey);
    setSettingsConfirmed(true);
    setShowConfirmBadge(true);

    setTimeout(() => setSettingsOpen(false), 600);
    setTimeout(() => setShowConfirmBadge(false), 3000);
  };

  const handleSendOrSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const hasActiveServerKey = serverKeys[chatProvider] || false;
    const needsKey = PROVIDER_NEEDS_KEY[chatProvider] && !hasActiveServerKey;
    if (needsKey && !chatApiKey.trim()) {
      setSettingsOpen(true);
      return;
    }
    onSend(e);
  };

  const currentModels = PROVIDER_OPTIONS[stagedProvider] || [];
  const selectedModelObj = currentModels.find((m: { id: string }) => m.id === (settingsOpen ? stagedModel : chatModel));
  const isAgentCapable = selectedModelObj ? selectedModelObj.agent : true;
  const hasServerKey = serverKeys[stagedProvider] || false;
  const chatHasServerKey = serverKeys[chatProvider] || false;

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {isVisible && !isOpen && (
          <motion.button
            key="chat-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            onClick={onOpen}
            className="fixed bottom-7 right-7 z-[9999] w-[60px] h-[60px] rounded-full bg-gradient-to-br from-sentix-accent to-emerald-500 border border-white/15 flex items-center justify-center cursor-pointer shadow-[0_8px_32px_rgba(0,255,136,0.3)] hover:scale-105 active:scale-95 transition-all"
            id="chat-fab"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MessageCircle className="text-black w-6 h-6" />
            <div className="absolute inset-0 rounded-full bg-sentix-accent/25 -z-10 animate-ping opacity-60" />
            {messages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-sentix-accent rounded-full border-2 border-sentix-bg shadow-[0_0_8px_rgba(0,255,136,0.8)]" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-drawer"
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.92 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-7 right-7 z-[9999] w-[420px] h-[620px] rounded-[2rem] overflow-hidden flex flex-col bg-sentix-surface/95 backdrop-blur-2xl border border-sentix-border shadow-[0_30px_80px_-10px_rgba(0,0,0,0.9)] max-w-[calc(100vw-32px)] max-h-[calc(100vh-100px)]"
            id="chat-drawer"
          >
            {/* Gradient accent bar */}
            <div className="absolute left-0 top-0 w-[3px] h-full bg-gradient-to-b from-sentix-accent to-emerald-500 rounded-r" />

            {/* Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-sentix-border bg-black/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sentix-accent shadow-[0_0_12px_rgba(0,255,136,0.6)] animate-pulse" />
                <h3 className="text-sm font-bold text-sentix-text uppercase tracking-widest">Sentix Chat Agent</h3>
                {/* Active provider badge */}
                <AnimatePresence>
                  {showConfirmBadge && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8, x: -10 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sentix-accent/15 text-sentix-accent border border-sentix-accent/30 whitespace-nowrap"
                    >
                      ✓ Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex gap-2 items-center">
                {settingsConfirmed && !showConfirmBadge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/5 text-sentix-muted border border-white/10">
                    {chatProvider.split(' ')[0]}
                  </span>
                )}
                <button
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className={`p-1.5 rounded-xl hover:bg-white/10 text-sentix-muted hover:text-sentix-text transition ${settingsOpen ? 'text-sentix-accent bg-sentix-accent/10' : ''}`}
                  title="AI Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-sentix-muted hover:text-sentix-text transition"
                  id="chat-close-btn"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Settings Overlay */}
            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-black/90 border-b border-sentix-border p-4 flex flex-col gap-3 overflow-hidden"
                >
                  {/* Provider Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-sentix-muted font-bold uppercase tracking-wider flex items-center gap-1">
                      <Globe size={11} /> Provider
                    </label>
                    <select
                      value={stagedProvider}
                      onChange={handleProviderChange}
                      className="bg-sentix-surfaceAlt text-sentix-text border border-sentix-border p-2 rounded-xl text-xs cursor-pointer focus:outline-none focus:border-sentix-accent"
                    >
                      {Object.keys(PROVIDER_OPTIONS).map(prov => (
                        <option key={prov} value={prov}>{prov}</option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selection */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-sentix-muted font-bold uppercase tracking-wider flex items-center gap-1">
                      <Zap size={11} /> Model
                    </label>
                    <select
                      value={stagedModel}
                      onChange={(e) => setStagedModel(e.target.value)}
                      className="bg-sentix-surfaceAlt text-sentix-text border border-sentix-border p-2 rounded-xl text-xs cursor-pointer focus:outline-none focus:border-sentix-accent"
                    >
                      {currentModels.map(mod => (
                        <option key={mod.id} value={mod.id}>
                          {mod.label}{mod.agent ? " (agentic)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* API Key Input */}
                  {PROVIDER_NEEDS_KEY[stagedProvider] && (
                    <div className="flex flex-col gap-1">
                      <label className={`text-[10px] ${hasServerKey ? 'text-emerald-400' : 'text-red-400'} font-bold uppercase tracking-wider flex items-center gap-1`}>
                        <Key size={11} /> API Key {hasServerKey ? <span className="opacity-90">✓ Server Key Active</span> : <span className="opacity-60">(Optional if set on server)</span>}
                      </label>
                      <input
                        type="password"
                        value={stagedApiKey}
                        onChange={(e) => setStagedApiKey(e.target.value)}
                        placeholder={hasServerKey ? "Using server default key" : `Enter your ${stagedProvider} API Key`}
                        className={`bg-sentix-surfaceAlt text-sentix-text p-2 px-3 rounded-xl text-xs focus:outline-none border ${stagedApiKey.trim() ? 'border-sentix-accent/30' : (hasServerKey ? 'border-emerald-500/20' : 'border-red-400/30')}`}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplySettings(); } }}
                      />
                    </div>
                  )}

                  {/* Apply Button */}
                  <motion.button
                    onClick={handleApplySettings}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={PROVIDER_NEEDS_KEY[stagedProvider] && !hasServerKey && !stagedApiKey.trim()}
                    className={`flex items-center justify-center gap-1.5 w-full p-2.5 text-xs font-bold rounded-xl border-none cursor-pointer transition ${(PROVIDER_NEEDS_KEY[stagedProvider] && !hasServerKey && !stagedApiKey.trim()) ? 'bg-white/5 text-sentix-muted cursor-not-allowed' : 'bg-gradient-to-br from-sentix-accent to-emerald-500 text-black shadow-lg shadow-sentix-accent/10'}`}
                  >
                    <Check size={13} />
                    Apply Settings
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 px-5 space-y-4 bg-gradient-to-b from-sentix-surface to-sentix-bg scrollbar-thin">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 mt-24 text-sentix-muted">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-sentix-accent/30">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold">Sentix AI Assistant Ready.</p>
                  {!settingsConfirmed && PROVIDER_NEEDS_KEY[chatProvider] && !chatHasServerKey && !chatApiKey && (
                    <p className="text-[11px] text-sentix-muted -mt-2">
                      Click the gear ⚙️ to configure your API key.
                    </p>
                  )}
                </div>
              ) : (
                messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', damping: 25, delay: 0.05 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[82%] p-3 px-4.5 text-sm leading-relaxed rounded-2xl whitespace-pre-wrap ${m.role === 'user' ? 'bg-gradient-to-br from-sentix-accent to-emerald-500 text-black font-semibold rounded-br-sm shadow-[0_4px_16px_rgba(0,255,136,0.2)]' : 'bg-white/5 border border-sentix-border text-sentix-text rounded-bl-sm'}`}>
                      {m.role === 'assistant' ? <Typewriter text={m.content} speed={10} /> : m.content}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-sentix-border bg-black/40">
              <form onSubmit={handleSendOrSettings} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => onInputChange(e.target.value)}
                  placeholder={
                    PROVIDER_NEEDS_KEY[chatProvider] && !chatApiKey
                      ? `Click ⚙️ to enter your ${chatProvider} API Key...`
                      : "Ask about this review or product..."
                  }
                  className="flex-1 px-4 py-2.5 text-xs rounded-full bg-white/5 border border-sentix-border text-sentix-text placeholder:text-sentix-muted focus:outline-none focus:border-sentix-accent focus:bg-sentix-accent/5 transition"
                  id="chat-message-input"
                />
                <button
                  type="submit"
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-sentix-accent to-emerald-500 flex items-center justify-center cursor-pointer border-none shadow-[0_4px_16px_rgba(0,255,136,0.2)] hover:scale-105 transition active:scale-95 text-black"
                  id="chat-send-btn"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatDrawer;
