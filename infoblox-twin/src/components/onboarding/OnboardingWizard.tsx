import { useEffect, useMemo, useState } from 'react';
import {
  IconX,
  IconArrowRight,
  IconCircleCheck,
  IconCopy,
  IconLoader2,
  IconChevronRight,
  IconExternalLink,
  IconAlertTriangle,
  IconCircleFilled,
  IconClock,
  IconShieldLock,
} from '@tabler/icons-react';
import type { Connector, ConnectorField, ConnectorStep } from '@/lib/onboarding/connectors';

interface Props {
  connector: Connector;
  onClose: () => void;
  onConnected: (id: string, values: Record<string, string>) => void;
}

type TestState = 'idle' | 'running' | 'ok' | 'fail';

const TEST_TRACE_TEMPLATE: Record<string, string[]> = {
  aws: [
    'Resolving sts.amazonaws.com from 10.0.0.10 →  ok (53 ms)',
    'sts:AssumeRole → assume {role_arn} with ExternalId=••••••••••',
    'Assumed: arn:aws:sts::{account_id}:assumed-role/InfobloxTwinReadOnly',
    'ec2:DescribeInstances (region: {first_region}) → 38 results',
    'iam:ListRoles → 211 results',
    'guardduty:ListFindings → 14 findings (last 24h)',
    'config:GetResourceConfigHistory → snapshot ok',
  ],
  azure: [
    'POST https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token → 200',
    'GET https://graph.microsoft.com/v1.0/organization → 1 tenant',
    'POST https://management.azure.com/providers/Microsoft.ResourceGraph/resources → 312 rows',
    'Resource Graph: EC2/AKS/SQL/Storage normalized → 47 resources',
    'GET /v1.0/users → 1,204 users',
  ],
  defender: [
    'POST /token endpoint → 200',
    'GET /api/machines?$top=1 → 200, 1 machine',
    'GET /api/alerts?$top=1 → 200, 1 alert',
    'GET /api/vulnerabilities → 200, 89 vulns',
  ],
  okta: [
    'GET https://{okta_domain}/api/v1/users?limit=1 → 200',
    'GET https://{okta_domain}/api/v1/groups → 78 groups',
    'GET https://{okta_domain}/api/v1/policies?type=MFA_ENROLL → 4 policies',
    'Rate-limit headers verified — Twin will stay under 60 req/min',
  ],
  crowdstrike: [
    'POST /oauth2/token → 200, bearer issued (expires 30 min)',
    'GET /devices/queries/devices/v1?limit=1 → 200',
    'GET /detects/queries/detects/v1?limit=1 → 200',
    'GET /policy/queries/prevention-policies/v1 → 12 policies',
  ],
  infoblox_csp: [
    'GET /api/uai/v1/assets?_limit=1 → 200',
    'GET /api/tide/v1/threats?type=actor&_limit=1 → 200',
    'GET /api/sci/v1/insights?_limit=1 → 200',
    'CSP rate limit: 80 req/s headroom',
  ],
  servicenow: [
    'POST /oauth_token.do → 200',
    'GET /api/now/table/cmdb_ci?sysparm_limit=1 → 200',
    'GET /api/now/table/cmdb_rel_ci?sysparm_limit=1 → 200',
    'Twin will paginate at 1000/req',
  ],
};

export function OnboardingWizard({ connector, onClose, onConnected }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(() => {
    // Seed derived fields like external_id
    const initial: Record<string, string> = {};
    initial.external_id = `twin-${Math.random().toString(36).slice(2, 8)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return initial;
  });
  const [testState, setTestState] = useState<TestState>('idle');
  const [testLog, setTestLog] = useState<string[]>([]);

  const steps = connector.steps;
  const current = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const isFirst = stepIdx === 0;

  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-run test when reaching a test step
  useEffect(() => {
    if (!current.isTest) {
      setTestState('idle');
      setTestLog([]);
      return;
    }
    runTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const requiredOk = useMemo(() => {
    if (!current.fields) return true;
    for (const f of current.fields) {
      if (f.required && !values[f.id]?.trim()) return false;
    }
    return true;
  }, [current, values]);

  function runTest() {
    setTestState('running');
    setTestLog([]);
    const tmpl = TEST_TRACE_TEMPLATE[connector.id] || [
      'Token issued → ok',
      'Sample read → ok',
      'Rate-limit headers verified',
    ];
    const filled = tmpl.map((line) =>
      line
        .replace('{role_arn}', values.role_arn || 'arn:aws:iam::*:role/*')
        .replace('{account_id}', values.account_id || '************')
        .replace('{first_region}', (values.regions?.split(',')[0] ?? 'us-east-1') || 'us-east-1')
        .replace('{tenant_id}', values.tenant_id || '••••-••••-••••')
        .replace('{okta_domain}', values.okta_domain || 'acme.okta.com')
    );
    let i = 0;
    const tick = () => {
      i++;
      setTestLog(filled.slice(0, i));
      if (i < filled.length) {
        setTimeout(tick, 380 + Math.random() * 260);
      } else {
        setTimeout(() => setTestState('ok'), 220);
      }
    };
    setTimeout(tick, 280);
  }

  function setField(id: string, value: string) {
    setValues((v) => ({ ...v, [id]: value }));
  }

  function next() {
    if (isLast) {
      onConnected(connector.id, values);
      return;
    }
    setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-page/85 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[960px] max-h-[90vh] rounded-2xl bg-surface border border-white/8 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="px-6 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-warning/15 text-warning border border-warning/40">
                  mock mode
                </span>
                <span className="text-[10px] font-mono text-text3">
                  No credentials are sent. Wizard simulates the real flow.
                </span>
              </div>
              <h2 className="text-h1 font-medium text-text1 leading-tight">{connector.name}</h2>
              <div className="text-small text-text2 mt-0.5">{connector.tagline}</div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-text3 hover:bg-white/5 hover:text-text1 transition-colors duration-fast"
              aria-label="Close"
            >
              <IconX size={16} />
            </button>
          </div>
          <Meta connector={connector} />
        </header>

        {/* Stepper rail */}
        <div className="px-6 py-3 border-b border-white/5 flex items-center gap-1 text-[11px] overflow-x-auto scrollbar-hide">
          {steps.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <span
                  className={`h-5 w-5 rounded-full border flex items-center justify-center font-mono text-[10px] ${
                    done
                      ? 'bg-success/20 border-success/40 text-success'
                      : active
                      ? 'bg-accent/20 border-accent/50 text-accent2'
                      : 'bg-white/5 border-white/10 text-text3'
                  }`}
                >
                  {done ? <IconCircleCheck size={11} /> : i + 1}
                </span>
                <span
                  className={`px-1 ${
                    active ? 'text-text1 font-medium' : done ? 'text-text2' : 'text-text3'
                  }`}
                >
                  {s.title}
                </span>
                {i < steps.length - 1 && <IconChevronRight size={11} className="text-text3 mx-0.5" />}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto flex-1">
          <StepBody
            step={current}
            connector={connector}
            values={values}
            setField={setField}
            testState={testState}
            testLog={testLog}
            onRetry={runTest}
          />
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-white/5 flex items-center justify-between">
          <a
            href={connector.docsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-text3 hover:text-text1 flex items-center gap-1"
          >
            <IconExternalLink size={11} />
            {connector.vendor} setup docs
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={isFirst}
              className="px-3 py-1.5 rounded-md text-text2 hover:text-text1 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-small"
            >
              Back
            </button>
            <button
              onClick={next}
              disabled={
                (current.fields && !requiredOk) ||
                (current.isTest && testState !== 'ok')
              }
              className="px-4 py-1.5 rounded-md bg-accent hover:bg-accent2 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-small flex items-center gap-1.5"
            >
              {isLast ? 'Finish' : 'Continue'}
              <IconArrowRight size={13} />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Meta({ connector }: { connector: Connector }) {
  return (
    <div className="flex items-center gap-5 text-[11px] text-text3 flex-wrap">
      <span className="flex items-center gap-1.5">
        <IconShieldLock size={12} />
        {connector.authMethod}
      </span>
      <span>·</span>
      <span className="flex items-center gap-1.5">
        <IconClock size={12} />
        ≈ {connector.estimatedSetup}
      </span>
      <span>·</span>
      <span>
        {connector.signalsProvided.length} signal{connector.signalsProvided.length === 1 ? '' : 's'}{' '}
        normalized into the graph
      </span>
    </div>
  );
}

function StepBody({
  step,
  connector,
  values,
  setField,
  testState,
  testLog,
  onRetry,
}: {
  step: ConnectorStep;
  connector: Connector;
  values: Record<string, string>;
  setField: (id: string, v: string) => void;
  testState: TestState;
  testLog: string[];
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* First step: extra what-you-get panel */}
      {step.id === 'prereqs' && (
        <section className="p-3 rounded-lg bg-page/40 border border-white/5">
          <div className="eyebrow mb-2">what twin learns from {connector.vendor}</div>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {connector.signalsProvided.map((s) => (
              <li key={s} className="flex items-center gap-2 text-[12px] text-text2">
                <IconCircleFilled size={5} className="text-accent2 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      {step.subtitle && (
        <p className="text-body text-text2 leading-relaxed -mt-1">{step.subtitle}</p>
      )}

      {step.checklist && (
        <ul className="flex flex-col gap-2">
          {step.checklist.map((c, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-md bg-page/40 border border-white/5"
            >
              <IconCircleCheck size={14} className="text-success shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-body text-text1 font-medium">{c.label}</div>
                {c.detail && (
                  <div className="text-[11px] text-text3 leading-snug mt-0.5">{c.detail}</div>
                )}
              </div>
              {c.docsUrl && (
                <a
                  href={c.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-accent2 hover:underline flex items-center gap-1"
                >
                  Docs <IconExternalLink size={10} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {step.snippet && (
        <CodeBlock
          language={step.snippet.language}
          code={step.snippet.code}
          caption={step.snippet.caption}
        />
      )}

      {step.fields && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {step.fields.map((f) => (
            <FieldInput key={f.id} field={f} value={values[f.id] || ''} onChange={setField} />
          ))}
        </div>
      )}

      {step.isTest && (
        <TestPanel state={testState} log={testLog} onRetry={onRetry} />
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ConnectorField;
  value: string;
  onChange: (id: string, v: string) => void;
}) {
  const fullWidth = field.type === 'textarea' || field.type === 'derived' || field.id === 'instance_url';
  return (
    <label className={`block ${fullWidth ? 'md:col-span-2' : ''}`}>
      <div className="flex items-baseline justify-between mb-1">
        <span className="eyebrow">{field.label}</span>
        {field.required && (
          <span className="text-[9px] text-text3 uppercase tracking-wider">required</span>
        )}
      </div>
      {field.type === 'derived' ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-page/60 border border-white/8">
          <span className={`flex-1 text-body ${field.mono ? 'font-mono' : ''} text-text1 truncate`}>
            {value}
          </span>
          {field.copyable && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(value);
              }}
              className="text-[10px] text-text3 hover:text-text1 flex items-center gap-1"
            >
              <IconCopy size={11} />
              Copy
            </button>
          )}
        </div>
      ) : field.type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full px-3 py-2 rounded-md bg-page/60 border border-white/8 focus:border-accent/60 outline-none text-body text-text1"
        >
          <option value="" disabled>
            Choose…
          </option>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === 'multi-select' ? (
        <div className="flex flex-wrap gap-1 p-2 rounded-md bg-page/60 border border-white/8">
          {field.options?.map((o) => {
            const selected = (value || '').split(',').includes(o.value);
            return (
              <button
                key={o.value}
                onClick={() => {
                  const arr = (value || '').split(',').filter(Boolean);
                  const next = arr.includes(o.value)
                    ? arr.filter((x) => x !== o.value)
                    : [...arr, o.value];
                  onChange(field.id, next.join(','));
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors duration-fast ${
                  selected
                    ? 'bg-accent/15 border-accent/50 text-accent2'
                    : 'bg-white/5 border-white/10 text-text2 hover:text-text1'
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      ) : field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`w-full px-3 py-2 rounded-md bg-page/60 border border-white/8 focus:border-accent/60 outline-none text-body text-text1 ${
            field.mono ? 'font-mono' : ''
          }`}
        />
      ) : (
        <input
          type={field.type}
          value={value}
          onChange={(e) => onChange(field.id, e.target.value)}
          placeholder={field.placeholder}
          className={`w-full px-3 py-2 rounded-md bg-page/60 border border-white/8 focus:border-accent/60 outline-none text-body text-text1 ${
            field.mono ? 'font-mono' : ''
          }`}
        />
      )}
      {field.helperText && (
        <div className="text-[10px] text-text3 mt-1 leading-snug">{field.helperText}</div>
      )}
    </label>
  );
}

function CodeBlock({
  code,
  language,
  caption,
}: {
  code: string;
  language: string;
  caption?: string;
}) {
  return (
    <div className="rounded-md bg-page/70 border border-white/8 overflow-hidden">
      {caption && (
        <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between text-[10px] text-text3 font-mono">
          <span>{caption}</span>
          <button
            onClick={() => navigator.clipboard?.writeText(code)}
            className="flex items-center gap-1 hover:text-text1 transition-colors duration-fast"
          >
            <IconCopy size={10} />
            Copy
          </button>
        </div>
      )}
      <pre className="px-3 py-2.5 text-[11px] font-mono text-text2 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <div className="px-3 py-1.5 border-t border-white/5 text-[10px] text-text3">
        {language.toUpperCase()}
      </div>
    </div>
  );
}

function TestPanel({
  state,
  log,
  onRetry,
}: {
  state: TestState;
  log: string[];
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg bg-page/70 border border-white/8 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
        {state === 'running' && (
          <IconLoader2 size={13} className="text-accent2 animate-spin" />
        )}
        {state === 'ok' && <IconCircleCheck size={13} className="text-success" />}
        {state === 'fail' && <IconAlertTriangle size={13} className="text-danger" />}
        <span className="text-body font-medium text-text1">
          {state === 'running' && 'Running test connection…'}
          {state === 'ok' && 'Connection verified'}
          {state === 'fail' && 'Connection failed'}
          {state === 'idle' && 'Ready to test'}
        </span>
        {state === 'ok' && (
          <span className="ml-auto text-[10px] font-mono text-text3">
            mock — wired up in production
          </span>
        )}
        {(state === 'fail' || state === 'ok') && (
          <button
            onClick={onRetry}
            className="ml-2 text-[11px] text-accent2 hover:underline"
          >
            Re-test
          </button>
        )}
      </div>
      <div className="px-4 py-3 font-mono text-[11px] text-text2 leading-relaxed min-h-[140px]">
        {log.length === 0 && <div className="text-text3">No output yet.</div>}
        {log.map((line, i) => (
          <div key={i} className="opacity-0 anim-stream-in">
            <span className="text-text3 mr-2">›</span>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
