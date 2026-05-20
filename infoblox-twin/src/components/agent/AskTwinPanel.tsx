import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconSparkles,
  IconX,
  IconArrowUp,
  IconUser,
  IconTool,
  IconCircleCheck,
  IconLoader2,
  IconMessageCircle,
  IconArrowsRightLeft,
} from '@tabler/icons-react';
import { runAgent, STARTER_PROMPTS, type AgentMessage } from '@/lib/agent/twin-agent';
import { twinClient } from '@/lib/data-clients/factory';
import { iconForAgent } from '@/lib/agent/agent-icons';
import type { Agent, AgentId } from '@/lib/types/agent.types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AskTwinPanel({ open, onClose }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [agents, setAgents] = useState<Map<AgentId, Agent>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    twinClient.listAgents().then((list) => {
      setAgents(new Map(list.map((a) => [a.id, a])));
    });
  }, []);

  useEffect(() => {
    if (open) {
      // Slight delay so the input doesn't grab focus during slide-in
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    const userMsg: AgentMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'user',
      content: q,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      for await (const msg of runAgent(q)) {
        setMessages((prev) => {
          const idx = prev.findIndex((m) => m.id === msg.id);
          if (idx === -1) return [...prev, msg];
          const next = prev.slice();
          next[idx] = msg;
          return next;
        });
      }
    } finally {
      setThinking(false);
    }
  }

  const showSuggestions = messages.length === 0;
  const visible = open;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-base ${
          visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(10,10,15,0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        data-tour="ask-panel"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[460px] max-w-full bg-surface border-l border-white/8 shadow-2xl flex flex-col transition-transform duration-base ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!visible}
      >
        <header className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-accent/15 border border-accent/30 flex items-center justify-center">
            <IconSparkles size={14} className="text-accent2" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-text1">Ask Mystique</div>
            <div className="text-[10px] text-text3 lowercase tracking-wider">
              your AI orchestrator · routes to specialist agents
            </div>
          </div>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-warning/15 text-warning border border-warning/40">
            mock
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text3 hover:bg-white/5 hover:text-text1 transition-colors duration-fast"
            aria-label="Close Ask Mystique"
          >
            <IconX size={14} />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          {showSuggestions ? (
            <Welcome onPick={send} />
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <Bubble key={m.id} msg={m} agents={agents} onPick={send} />
              ))}
              {thinking && messages[messages.length - 1]?.role !== 'tool' && (
                <Thinking agent={lastAssistantAgent(messages, agents) ?? agents.get('mystique')} />
              )}
            </div>
          )}
        </div>

        <Composer
          input={input}
          setInput={setInput}
          onSend={() => send(input)}
          disabled={thinking}
          inputRef={inputRef}
        />
      </aside>
    </>
  );
}

function Welcome({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="eyebrow">how this works</div>
        <p className="text-small text-text2 leading-relaxed">
          Ask anything about your environment in plain English. Twin runs graph queries, computes
          paths and risk, and answers grounded in the live data. I'll show you the tools I called so
          you can audit the answer.
        </p>
      </div>
      <div>
        <div className="eyebrow mb-2">try one of these</div>
        <div className="flex flex-col gap-1.5">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="text-left px-3 py-2 rounded-md bg-page/40 hover:bg-surface2 border border-white/5 hover:border-accent/30 transition-all duration-fast text-[12px] text-text1 group"
            >
              <span className="text-text3 group-hover:text-accent2 mr-2 transition-colors duration-fast">
                ›
              </span>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[10px] text-text3 leading-snug border-t border-white/5 pt-3">
        In production this agent runs on the Anthropic Messages API with tool-use over your{' '}
        <span className="font-mono text-text2">TwinDataClient</span>. Demo build streams canned
        flows so you can see the shape.
      </div>
    </div>
  );
}

function Bubble({
  msg,
  agents,
  onPick,
}: {
  msg: AgentMessage;
  agents: Map<AgentId, Agent>;
  onPick: (q: string) => void;
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex items-start gap-2 self-end max-w-[88%]">
        <div className="flex-1 px-3 py-2 rounded-lg bg-accent/15 border border-accent/30 text-body text-text1 leading-relaxed">
          {msg.content}
        </div>
        <div className="h-6 w-6 rounded-md bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
          <IconUser size={12} className="text-text2" />
        </div>
      </div>
    );
  }
  if (msg.role === 'system') {
    // Handoff / pickup announcement.
    const agent = msg.agentId ? agents.get(msg.agentId) : undefined;
    if (!agent) return null;
    const AgentIcon = iconForAgent(agent.id);
    const isHandoff = !!msg.content;
    return (
      <div className="flex items-center gap-2 my-1 self-start max-w-[92%]">
        <span
          className="rounded-md flex items-center justify-center shrink-0"
          style={{
            width: 20,
            height: 20,
            background: `${agent.color}22`,
            border: `1px solid ${agent.color}55`,
            color: agent.color,
          }}
        >
          <AgentIcon size={11} stroke={1.8} />
        </span>
        <div className="text-[11px] text-text3 leading-tight">
          {isHandoff ? (
            <span className="inline-flex items-center gap-1.5">
              <IconArrowsRightLeft size={10} className="text-text3" />
              <span>
                <span className="font-medium" style={{ color: agent.color }}>{agent.name}</span> picked it up — <span className="italic">{msg.content}</span>
              </span>
            </span>
          ) : (
            <>
              <span className="font-medium" style={{ color: agent.color }}>
                {agent.name}
              </span>{' '}
              is on it…
            </>
          )}
        </div>
      </div>
    );
  }
  if (msg.role === 'tool') {
    const pending = msg.status !== 'done';
    const agent = msg.agentId ? agents.get(msg.agentId) : undefined;
    const accent = agent?.color ?? '#3b82f6';
    return (
      <div className="flex items-start gap-2 max-w-[92%]">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: `${accent}1a`,
            border: `1px solid ${accent}55`,
            color: accent,
          }}
        >
          {pending ? (
            <IconLoader2 size={11} className="animate-spin" />
          ) : (
            <IconCircleCheck size={11} />
          )}
        </div>
        <div className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-page/40 border border-white/5">
          <div className="flex items-baseline gap-2 mb-0.5">
            {agent && (
              <span className="text-[10px] font-medium" style={{ color: accent }}>
                {agent.name}
              </span>
            )}
            <IconTool size={10} className="text-text3" />
            <span className="font-mono text-[11px] text-text1">{msg.toolName}</span>
            <span className="text-[10px] text-text3 font-mono truncate">
              {msg.toolInput ? formatInput(msg.toolInput) : ''}
            </span>
          </div>
          {msg.toolResult && (
            <div className="text-[11px] text-text2 leading-snug font-mono pl-4">
              → {msg.toolResult}
            </div>
          )}
        </div>
      </div>
    );
  }
  // assistant
  const agent = msg.agentId ? agents.get(msg.agentId) : undefined;
  const accent = agent?.color ?? '#3b82f6';
  const AgentIcon = agent ? iconForAgent(agent.id) : IconSparkles;
  return (
    <div className="flex items-start gap-2 max-w-[92%]">
      <div
        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: `${accent}1a`,
          border: `1px solid ${accent}55`,
          color: accent,
        }}
      >
        <AgentIcon size={11} stroke={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        {agent && (
          <div className="flex items-baseline gap-1.5 mb-1 px-1">
            <span className="text-[11px] font-medium" style={{ color: accent }}>
              {agent.name}
            </span>
            <span className="text-[9px] text-text3 font-mono">{agent.model}</span>
          </div>
        )}
        <div className="px-3 py-2.5 rounded-lg bg-page/60 border border-white/8">
          <Markdown text={msg.content} />
          {msg.status === 'streaming' && (
            <span className="inline-block w-[1px] h-[12px] ml-1 align-middle animate-pulse" style={{ background: `${accent}cc` }} />
          )}
        </div>
        {msg.suggestions && msg.status === 'done' && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => onPick(s)}
                className="px-2 py-1 rounded text-[10px] text-text2 hover:text-text1 bg-white/5 hover:bg-white/10 border border-white/8 transition-colors duration-fast"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Thinking({ agent }: { agent?: Agent }) {
  const accent = agent?.color ?? '#60a5fa';
  return (
    <div className="flex items-center gap-2 text-[11px] pl-8" style={{ color: agent ? accent : '#a0a0b0' }}>
      <span className="inline-block w-1.5 h-1.5 rounded-full anim-pulse-dot" style={{ background: accent }} />
      <span>{agent ? `${agent.name} is thinking…` : 'Mystique is thinking…'}</span>
    </div>
  );
}

function lastAssistantAgent(
  messages: AgentMessage[],
  agents: Map<AgentId, Agent>
): Agent | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if ((m.role === 'assistant' || m.role === 'system') && m.agentId) {
      return agents.get(m.agentId);
    }
  }
  return undefined;
}

function Composer({
  input,
  setInput,
  onSend,
  disabled,
  inputRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  return (
    <div className="border-t border-white/8 p-3">
      <div className="flex items-end gap-2 px-3 py-2 rounded-lg bg-page/60 border border-white/10 focus-within:border-accent/40 transition-colors duration-fast">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask anything about your environment…"
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none text-body text-text1 placeholder:text-text3 leading-tight"
          style={{ maxHeight: 120 }}
          disabled={disabled}
        />
        <button
          onClick={onSend}
          disabled={disabled || !input.trim()}
          className={`p-1.5 rounded-md transition-all duration-fast ${
            input.trim() && !disabled
              ? 'bg-accent text-white hover:bg-accent2'
              : 'bg-white/5 text-text3 cursor-not-allowed'
          }`}
          aria-label="Send"
        >
          <IconArrowUp size={14} />
        </button>
      </div>
      <div className="text-[10px] text-text3 mt-1.5 px-1 leading-snug">
        Press <kbd className="px-1 rounded bg-white/5 font-mono text-[10px]">Enter</kbd> to send ·{' '}
        <kbd className="px-1 rounded bg-white/5 font-mono text-[10px]">Shift+Enter</kbd> for a new
        line · <kbd className="px-1 rounded bg-white/5 font-mono text-[10px]">Esc</kbd> to close
      </div>
    </div>
  );
}

function formatInput(input: Record<string, unknown>) {
  const entries = Object.entries(input).slice(0, 3);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
}

// Very small markdown — bold, bullets, inline `code`. Avoids a dependency.
function Markdown({ text }: { text: string }) {
  const parts = useMemo(() => parseMarkdown(text), [text]);
  return (
    <div className="text-[12.5px] text-text1 leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.type === 'bold') return <strong key={i} className="text-text1 font-medium">{p.value}</strong>;
        if (p.type === 'code') return (
          <code key={i} className="px-1 py-0.5 rounded bg-white/5 font-mono text-[11px] text-accent2">
            {p.value}
          </code>
        );
        return <span key={i}>{p.value}</span>;
      })}
    </div>
  );
}

function parseMarkdown(text: string): { type: 'text' | 'bold' | 'code'; value: string }[] {
  const out: { type: 'text' | 'bold' | 'code'; value: string }[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) {
      out.push({ type: 'text', value: text.slice(lastIndex, m.index) });
    }
    const token = m[0];
    if (token.startsWith('**')) {
      out.push({ type: 'bold', value: token.slice(2, -2) });
    } else {
      out.push({ type: 'code', value: token.slice(1, -1) });
    }
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) {
    out.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return out;
}

// Floating launcher button — pin to bottom-right when panel is closed.
export function AskTwinLauncher({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-5 right-5 z-30 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-accent text-white shadow-xl hover:bg-accent2 transition-colors duration-fast"
      title="Ask Mystique (⌘.)"
    >
      <IconSparkles size={14} />
      <span className="text-[12px] font-medium">Ask Mystique</span>
      <span className="text-[10px] opacity-70 font-mono">⌘.</span>
    </button>
  );
}
export { IconMessageCircle };
