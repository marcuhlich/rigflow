import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, ChevronRight, ChevronLeft, Lock, Hash, Type, QrCode, Wifi, Package, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from "posthog-js";
import { hapticFeedback, hapticStop } from '@/lib/utils';
import { ANALYTICS_CONSENT_KEY } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = 'intro' | 'stories' | 'form' | 'finale';
type FormStep = 'name' | 'email' | 'password' | 'warehouse';

interface FormData {
  name: string;
  email: string;
  password: string;
  warehouse: string;
}

// ─── Story Slides ─────────────────────────────────────────────────────────────
const STORIES = [
  {
    icon: Package,
    eyebrow: 'Inventarverwaltung',
    headline: 'Kein Case\ngeht verloren.',
    sub: 'Von der ersten Probe bis zum Abbau: RigFlow weiß immer, wo dein Equipment steckt – Kabel, Strahler, Konsolen, alles.',
    detail: '23 Artikel • 4 Kategorien • 1 Klick',
    bg: 'radial-gradient(ellipse at 25% 60%, rgba(var(--primary-rgb, 0,229,255),0.13) 0%, transparent 65%)',
  },
  {
    icon: QrCode,
    eyebrow: 'QR-Scanning',
    headline: 'Scan.\nFertig.\nWeiter.',
    sub: 'Jeder Case, jede Box, jedes Kabel hat seinen Code. Auf der Bühne, im Dunkeln, ohne Netz – einfach draufhalten und loslegen.',
    detail: 'Offline verfügbar • Automatisch generiert',
    bg: 'radial-gradient(ellipse at 75% 35%, rgba(var(--primary-rgb, 0,229,255),0.10) 0%, transparent 60%)',
  },
  {
    icon: Wifi,
    eyebrow: 'Offline-First',
    headline: 'Auch wenn\ndas Netz\nstreikt.',
    sub: 'Kein WLAN in der Halle? Egal. RigFlow arbeitet komplett offline und synchronisiert alles sobald du wieder online bist.',
    detail: 'Automatischer Sync • Keine Datenverluste',
    bg: 'radial-gradient(ellipse at 50% 75%, rgba(var(--primary-rgb, 0,229,255),0.08) 0%, transparent 55%)',
  },
];

const FORM_STEPS: FormStep[] = ['name', 'email', 'password', 'warehouse'];

// ─── Haptic helper ────────────────────────────────────────────────────────────
function hapticDouble() {
  if ('vibrate' in navigator) {
    hapticFeedback([60, 80, 120]);
  }
}

// ─── Canvas Ripple (Button → Fullscreen) ──────────────────────────────────────
function RippleCanvas({
  active,
  originRef,
  onComplete,
}: {
  active: boolean;
  originRef: React.RefObject<HTMLButtonElement>;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const btn = originRef.current;
    const rect = btn?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : canvas.width / 2;
    const cy = rect ? rect.top + rect.height / 2 : canvas.height / 2;
    const maxR = Math.hypot(
      Math.max(cx, canvas.width - cx),
      Math.max(cy, canvas.height - cy)
    );

    const start = performance.now();
    const duration = 700;

    function draw(now: number) {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const r = Math.max(0, ease * Math.max(0, maxR));

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fillStyle = '#020408';
      ctx!.fill();

      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        onComplete();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 50, opacity: active ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
    />
  );
}

// ─── QR Code (decorative) ─────────────────────────────────────────────────────
function QrVisual({ name }: { name: string }) {
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const size = 9;
  const cells = Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    const inFinder =
      (x < 3 && y < 3) || (x >= size - 3 && y < 3) || (x < 3 && y >= size - 3);
    if (inFinder) return true;
    return ((seed * (i + 1) * 2654435761) >>> 0) % 3 !== 0;
  });

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      style={{
        width: 160, height: 160,
        background: 'rgba(var(--primary-rgb, 0,229,255),0.05)',
        border: '1px solid hsl(var(--primary)/0.3)',
        borderRadius: 16, padding: 14, margin: '0 auto',
        boxShadow: '0 0 40px hsl(var(--primary)/0.15)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 2, width: '100%', height: '100%' }}>
        {cells.map((filled, i) => (
          <div key={i} style={{
            background: filled ? 'hsl(var(--primary))' : 'transparent',
            borderRadius: 1,
            boxShadow: filled ? '0 0 3px hsl(var(--primary)/0.5)' : 'none',
          }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Password strength checks ─────────────────────────────────────────────────
function PasswordChecks({ password }: { password: string }) {
  const checks = [
    { icon: Hash, label: 'Zahl',       ok: /\d/.test(password) },
    { icon: Type, label: 'Buchstaben', ok: /[a-zA-Z]/.test(password) },
    { icon: Lock, label: '8+ Zeichen', ok: password.length >= 8 },
  ];
  return (
    <div className="flex gap-4 mt-3">
      {checks.map(({ icon: Icon, label, ok }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs"
          style={{ color: ok ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.25)', transition: 'color 0.4s' }}>
          <Icon size={11} style={{ filter: ok ? 'drop-shadow(0 0 4px hsl(var(--primary)))' : 'none', transition: 'filter 0.4s' }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Keyboard height hook ─────────────────────────────────────────────────────
function useKeyboardHeight() {
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const vv = (window as any).visualViewport;
    if (!vv) return;
    const update = () => setKbHeight(Math.max(0, window.innerHeight - vv.height));
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, []);
  return kbHeight;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RegisterPage() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('intro');
  const [introStage, setIntroStage] = useState<'pulse' | 'slide'>('pulse');

  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const STORY_DURATION = 4500;

  const [formStep, setFormStep] = useState<FormStep>('name');
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', password: '', warehouse: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [rippleActive, setRippleActive] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const kbHeight = useKeyboardHeight();

  const [finaleState, setFinaleState] = useState<'processing' | 'check-email'>('processing');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  // ── Intro ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'intro') return;
    const t1 = setTimeout(() => setIntroStage('slide'), 1600);
    const t2 = setTimeout(() => setPhase('stories'), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  // ── Stories ───────────────────────────────────────────────────────────────
  const advanceStory = useCallback(() => {
    setStoryProgress(0);
    if (storyIndex < STORIES.length - 1) {
      setStoryIndex(i => i + 1);
    } else {
      setPhase('form');
    }
  }, [storyIndex]);

  useEffect(() => {
    if (phase !== 'stories') return;
    setStoryProgress(0);
    const interval = setInterval(() => {
      setStoryProgress(p => {
        if (p >= 100) { advanceStory(); return 0; }
        return p + (100 / (STORY_DURATION / 50));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [phase, storyIndex, advanceStory]);

  // ── Form ──────────────────────────────────────────────────────────────────
  const stepIndex = FORM_STEPS.indexOf(formStep);

  const formConfig: Record<FormStep, { question: string; placeholder: string; type: string; key: keyof FormData }> = {
    name:      { question: 'Wie heißt du?',          placeholder: 'Dein Name',            type: 'text',     key: 'name' },
    email:     { question: 'Deine E-Mail?',           placeholder: 'mail@example.com',     type: 'email',    key: 'email' },
    password:  { question: 'Wähle ein Passwort.',     placeholder: 'Mindestens 8 Zeichen', type: 'password', key: 'password' },
    warehouse: { question: 'Wie heißt dein\nLager?', placeholder: 'z.B. Hauptlager',      type: 'text',     key: 'warehouse' },
  };

  const handleFormNext = async () => {
    setError('');
    if (!inputValue.trim()) { setError('Bitte fülle dieses Feld aus.'); return; }
    if (formStep === 'email' && !/\S+@\S+\.\S+/.test(inputValue)) { setError('Keine gültige E-Mail.'); return; }
    if (formStep === 'password' && inputValue.length < 8) { setError('Mindestens 8 Zeichen.'); return; }

    const updated = { ...formData, [formConfig[formStep].key]: inputValue };
    setFormData(updated);

    if (formStep === 'warehouse') {
      hapticDouble();
      setRippleActive(true);
    } else {
      setFormStep(FORM_STEPS[FORM_STEPS.indexOf(formStep) + 1]);
      setInputValue('');
    }
  };

  const handleRippleComplete = async () => {
    setPhase('finale');
    setShowQr(true);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`, // ← dynamisch, funktioniert überall
          data: { full_name: formData.name, warehouse_name: formData.warehouse },
        },
      });
      const consent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
      if (consent === 'true') {
        posthog.capture("user_signed_up");
      }
      if (signUpError) throw signUpError;
      setRippleActive(false);
      setTimeout(() => {
        setFinaleState('check-email');
      }, 1400);
    } catch (err: unknown) {
      setRippleActive(false);
      setPhase('form');
      setError(err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    await supabase.auth.resend({ type: 'signup', email: formData.email });
    setResendLoading(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 4000);
  };

  // ── Progress bar ──────────────────────────────────────────────────────────
  const totalSegments = STORIES.length + FORM_STEPS.length;
  const completedSegments = phase === 'stories'
    ? storyIndex
    : phase === 'form'
    ? STORIES.length + stepIndex
    : totalSegments;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: '#020408', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* Ambient grid */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/0.025) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      {/* Bottom glow */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 80% 45% at 50% 100%, hsl(var(--primary)/0.07) 0%, transparent 70%)',
      }} />

      {/* Ripple canvas */}
      <RippleCanvas active={rippleActive} originRef={ctaRef} onComplete={handleRippleComplete} />

      {/* ── STORY BAR ───────────────────────────────────────────────────── */}
      {(phase === 'stories' || phase === 'form') && (
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 z-30"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
          {Array.from({ length: totalSegments }).map((_, i) => {
            const isCompleted = i < completedSegments;
            const isCurrent = phase === 'stories' ? i === storyIndex : i === STORIES.length + stepIndex;
            return (
              <div key={i} className="flex-1 overflow-hidden"
                style={{ height: 2, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }}>
                <motion.div
                  initial={false}
                  animate={{
                    width: isCompleted ? '100%' : isCurrent && phase === 'stories' ? `${storyProgress}%` : isCurrent ? '100%' : '0%',
                  }}
                  transition={isCurrent && phase === 'stories' ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 99, background: 'hsl(var(--primary))', boxShadow: '0 0 6px hsl(var(--primary)/0.8)' }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── INTRO ───────────────────────────────────────────────────────── */}
      {phase === 'intro' && (
        <div className="flex flex-col items-center justify-center gap-3">
          <div
            style={{
              transform: introStage === 'slide' ? 'translateY(-60px)' : 'translateY(0)',
              opacity: introStage === 'slide' ? 0 : 1,
              transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
            }}
            className="flex flex-col items-center gap-3"
          >
            <div style={{
              width: 96, height: 96, borderRadius: 24,
              background: 'linear-gradient(135deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.05))',
              border: '1px solid hsl(var(--primary)/0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'pulse-glow 1.6s ease-in-out infinite',
              boxShadow: '0 0 40px hsl(var(--primary)/0.2)',
            }}>
              <img src="/logo-transparent.png" alt="RigFlow"
                style={{ width: 64, height: 64, filter: 'drop-shadow(0 0 8px hsl(var(--primary)))' }} />
            </div>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>RigFlow</span>
          </div>
        </div>
      )}

      {/* ── STORIES ─────────────────────────────────────────────────────── */}
      {phase === 'stories' && (() => {
        const story = STORIES[storyIndex];
        const Icon = story.icon;
        return (
          <AnimatePresence mode="wait">
            <motion.div
              key={storyIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="w-full max-w-sm mx-auto px-6 flex flex-col items-start justify-center absolute inset-0"
              style={{ paddingTop: 72, paddingBottom: 48 }}
            >
              <div className="absolute inset-0 flex z-20 pointer-events-none">
                <div className="flex-1 cursor-pointer pointer-events-auto"
                  onClick={() => { if (storyIndex > 0) { setStoryIndex(i => i - 1); setStoryProgress(0); } }} />
                <div className="flex-1 cursor-pointer pointer-events-auto" onClick={advanceStory} />
              </div>

              <div style={{ position: 'relative', zIndex: 25, pointerEvents: 'none', width: '100%' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'hsl(var(--primary))', opacity: 0.65, marginBottom: 20 }}>
                  {story.eyebrow}
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, boxShadow: '0 0 20px hsl(var(--primary)/0.1)' }}>
                  <Icon size={22} style={{ color: 'hsl(var(--primary))' }} />
                </div>
                <h2 style={{ fontSize: 'clamp(2.1rem, 9vw, 3.2rem)', fontWeight: 900, color: '#fff', lineHeight: 1.08, letterSpacing: '-0.035em', marginBottom: 20, whiteSpace: 'pre-line' }}>
                  {story.headline}
                </h2>
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, maxWidth: 300 }}>
                  {story.sub}
                </p>
                <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'hsl(var(--primary)/0.07)', border: '1px solid hsl(var(--primary)/0.15)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: 'hsl(var(--primary))', opacity: 0.7 }}>
                  {story.detail}
                </div>
                {storyIndex === STORIES.length - 1 && (
                  <button
                    className="mt-10 flex items-center gap-2"
                    style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.1)', border: '1px solid hsl(var(--primary)/0.25)', borderRadius: 12, padding: '11px 22px', cursor: 'pointer', fontSize: 14, fontWeight: 600, pointerEvents: 'all' }}
                    onClick={() => setPhase('form')}
                  >
                    Jetzt registrieren <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        );
      })()}

      {phase !== 'finale' && phase !== 'intro' && (
      <motion.button
        onClick={() => navigate(-1)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 12px hsl(var(--primary)/0.5)' }}
        whileTap={{ scale: 0.92, boxShadow: '0 0 6px hsl(var(--primary)/0.7)' }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        style={{
          position: 'absolute',
          top: `calc(env(safe-area-inset-top, 0px) + 38px + ${kbHeight}px)`,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'hsl(var(--primary)/0.1)',
          border: '1px solid hsl(var(--primary)/0.25)',
          borderRadius: 12,
          padding: '6px 10px',
          color: 'hsl(var(--primary))',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
          zIndex: 40,
        }}
      >
        <ChevronLeft size={16} />
        Zurück
      </motion.button>
    )}

      {/* ── FORM ────────────────────────────────────────────────────────── */}
      {phase === 'form' && (() => {
        const config = formConfig[formStep];
        return (
          <div
            className="w-full max-w-sm mx-auto px-6 flex flex-col justify-center"
            style={{
              minHeight: '100dvh', paddingTop: 72,
              paddingBottom: Math.max(48, kbHeight + 16),
              transition: 'padding-bottom 0.2s ease',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={formStep}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: 14, opacity: 0.65 }}>
                  Schritt {stepIndex + 1} von {FORM_STEPS.length}
                </div>

                <h2 style={{ fontSize: 'clamp(1.8rem, 7vw, 2.6rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 36, whiteSpace: 'pre-line' }}>
                  {config.question}
                </h2>

                {formStep === 'name' && (
                  <AnimatePresence>
                    {inputValue.trim() && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                        style={{ marginBottom: 20, fontSize: 15, color: 'hsl(var(--primary))', fontWeight: 600, letterSpacing: '-0.01em', opacity: 0.75 }}
                      >
                        Hallo, {inputValue.trim().split(' ')[0]}! 👋
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}

                <div className="relative">
                  <input
                    autoFocus
                    type={formStep === 'password' && !showPassword ? 'password' : config.type === 'password' ? 'text' : config.type}
                    value={inputValue}
                    placeholder={config.placeholder}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleFormNext(); }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid hsl(var(--primary)/0.2)', borderRadius: 14,
                      padding: '16px 20px', paddingRight: formStep === 'password' ? 52 : 20,
                      fontSize: 16, color: '#fff', outline: 'none',
                      backdropFilter: 'blur(12px)', transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'hsl(var(--primary)/0.6)'; e.target.style.boxShadow = '0 0 20px hsl(var(--primary)/0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'hsl(var(--primary)/0.2)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {formStep === 'password' && (
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}>
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  )}
                </div>

                {formStep === 'password' && <PasswordChecks password={inputValue} />}

                {error && (
                  <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    style={{ color: '#ff4d6d', fontSize: 13, marginTop: 10 }}>
                    {error}
                  </motion.p>
                )}

                <button
                  ref={ctaRef}
                  onClick={handleFormNext}
                  disabled={loading || rippleActive}
                  style={{
                    marginTop: 28, width: '100%',
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))',
                    border: 'none', borderRadius: 14, padding: '16px 24px',
                    fontSize: 15, fontWeight: 700,
                    color: 'hsl(var(--primary-foreground, 0 0% 0%))',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 24px hsl(var(--primary)/0.25)',
                    opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s, transform 0.1s',
                  }}
                  onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                  onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Wird erstellt…</>
                    : formStep === 'warehouse'
                    ? 'System initialisieren'
                    : <>Weiter <ChevronRight size={15} /></>
                  }
                </button>

                {formStep === 'name' && (
                  <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
                    Schon dabei?{' '}
                    <button onClick={() => navigate('/auth')}
                      style={{ color: 'hsl(var(--primary))', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                      Einloggen
                    </button>
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        );
      })()}

      {/* ── FINALE ──────────────────────────────────────────────────────── */}
      {phase === 'finale' && (
        <div
          className="flex flex-col items-center justify-center gap-8 px-6 text-center"
          style={{ zIndex: 20, position: 'relative' }}
        >
          <AnimatePresence mode="wait">

            {/* QR / Processing */}
            {finaleState === 'processing' && showQr && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                className="flex flex-col items-center gap-6"
              >
                <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'hsl(var(--primary))', opacity: 0.55 }}>
                  System initialisiert
                </div>
                <QrVisual name={formData.name || 'RigFlow'} />
                <div>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Bereit,<br />
                    <span style={{ color: 'hsl(var(--primary))' }}>{formData.name}</span>.
                  </h2>
                  <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                    Lager <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{formData.warehouse}</strong> wird eingerichtet…
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <div style={{
                  width: 28, height: 28,
                  border: '2px solid hsl(var(--primary)/0.15)',
                  borderTop: '2px solid hsl(var(--primary))',
                  borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                  Konto wird angelegt…
                </span>
              </div>
              </motion.div>
            )}

            {/* E-Mail bestätigen */}
            {finaleState === 'check-email' && (
              <motion.div
                key="check-email"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 160, damping: 20 }}
                className="flex flex-col items-center gap-5 max-w-xs"
              >
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'hsl(var(--primary)/0.1)',
                  border: '1px solid hsl(var(--primary)/0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 40px hsl(var(--primary)/0.15)',
                }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                    stroke="hsl(var(--primary))" strokeWidth="1.8"
                    strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="3" />
                    <polyline points="2,4 12,13 22,4" />
                  </svg>
                </div>

                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Fast geschafft.
                  </h2>
                  <p style={{ marginTop: 10, color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.65 }}>
                    Wir haben eine Bestätigungs-E-Mail an
                  </p>
                  <p style={{ marginTop: 6, fontSize: 14, fontWeight: 600, color: 'hsl(var(--primary))', letterSpacing: '-0.01em' }}>
                    {formData.email}
                  </p>
                  <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.38)', fontSize: 14, lineHeight: 1.65 }}>
                    gesendet. Klick auf den Link darin – danach kannst du dich einloggen und loslegen.
                  </p>
                </div>

                {/* Schritt-Hinweise */}
                <div style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 14, padding: '16px 18px', textAlign: 'left',
                }}>
                  {[
                    { n: '1', text: 'E-Mail öffnen & Link klicken' },
                    { n: '2', text: 'Du landest automatisch in RigFlow' },
                    { n: '3', text: 'Loslegen!' },
                  ].map(({ n, text }) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: n !== '3' ? 12 : 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 99,
                        background: 'hsl(var(--primary)/0.15)',
                        border: '1px solid hsl(var(--primary)/0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'hsl(var(--primary))', flexShrink: 0,
                      }}>
                        {n}
                      </div>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{text}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleResend}
                  disabled={resendLoading || resendDone}
                  style={{
                    marginTop: 4, background: 'none', border: 'none',
                    cursor: resendDone ? 'default' : 'pointer',
                    fontSize: 13,
                    color: resendDone ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.28)',
                    transition: 'color 0.3s',
                  }}
                >
                  {resendLoading ? 'Wird gesendet…' : resendDone ? '✓ E-Mail erneut gesendet' : 'Keine E-Mail erhalten? Erneut senden'}
                </button>

                <button
                  onClick={() => navigate('/auth')}
                  style={{
                    width: '100%', background: 'hsl(var(--primary)/0.1)',
                    border: '1px solid hsl(var(--primary)/0.25)', borderRadius: 14,
                    padding: '14px 24px', fontSize: 14, fontWeight: 600,
                    color: 'hsl(var(--primary))', cursor: 'pointer',
                  }}
                >
                  Zum Login
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      )}

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px hsl(var(--primary)/0.15), 0 0 40px hsl(var(--primary)/0.05); }
          50%       { box-shadow: 0 0 35px hsl(var(--primary)/0.35), 0 0 70px hsl(var(--primary)/0.12); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder { color: rgba(255,255,255,0.18); }
      `}</style>
    </motion.div>
  );
}