import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Camera as CameraIcon, ChevronRight, Check, BarChart2 } from 'lucide-react';
import posthog from 'posthog-js';
import { requestNativeNotificationPermission } from '@/services/native/notifications';
import { requestCameraPermission } from '@/services/native/index';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Camera } from '@capacitor/camera';
import { ONBOARDING_DONE_KEY, ANALYTICS_CONSENT_KEY } from '@/lib/constants';
import { useTranslation } from 'react-i18next';

interface Screen {
  icon: React.ReactNode;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  allowLabel: string;
  onAllow: () => Promise<void>;
}

export default function NativeOnboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const screens: Screen[] = [
    {
      icon: <Bell size={28} style={{ color: 'hsl(var(--primary))' }} />,
      accent: 'hsl(var(--primary))',
      eyebrow: t('onboarding.step_indicator', { current: 1, total: 3 }),
      title: t('onboarding.notifications_title'),
      description: t('onboarding.notifications_description'),
      allowLabel: t('onboarding.notifications_allow'),
      onAllow: async () => { await requestNativeNotificationPermission(); },
    },
    {
      icon: <CameraIcon size={28} style={{ color: '#34d399' }} />,
      accent: '#34d399',
      eyebrow: t('onboarding.step_indicator', { current: 2, total: 3 }),
      title: t('onboarding.camera_title'),
      description: t('onboarding.camera_description'),
      allowLabel: t('onboarding.camera_allow'),
      onAllow: async () => { await requestCameraPermission(); },
    },
    {
      icon: <BarChart2 size={28} style={{ color: '#34d399' }} />,
      accent: '#34d399',
      eyebrow: t('onboarding.step_indicator', { current: 3, total: 3 }),
      title: t('onboarding.analytics_title'),
      description: t('onboarding.analytics_description'),
      allowLabel: t('onboarding.analytics_allow'),
      onAllow: async () => {
        localStorage.setItem(ANALYTICS_CONSENT_KEY, 'true');
        posthog.opt_in_capturing();
      },
    },
  ];

  useEffect(() => {
    const checkAndSkip = async () => {
      try {
        const notif = await LocalNotifications.checkPermissions();
        const cam = await Camera.checkPermissions();

        if (notif.display === 'granted' && cam.camera === 'granted') {
          setStep(2);
        } else if (notif.display === 'granted') {
          setStep(1);
        }
      } catch (e) {
        // ignorieren, step bleibt 0
      }
    };
    checkAndSkip();
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    setDone(true);
    setTimeout(() => navigate('/', { replace: true }), 900);
  };

  const handleAllow = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (e) {
      console.log('Permission error:', JSON.stringify(e));
    } finally {
      setLoading(false);
    }
    if (step < screens.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const handleSkip = () => {
    if (step === screens.length - 1) {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, 'false');
      posthog.opt_out_capturing();
    }
    if (step < screens.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const screen = screens[step];

  if (done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: '#020408' }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18 }}
          style={{
            width: 72, height: 72, borderRadius: 99,
            background: 'hsl(var(--primary)/0.15)',
            border: '1px solid hsl(var(--primary)/0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Check size={32} style={{ color: 'hsl(var(--primary))' }} />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#020408', fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0" style={{
        background: 'radial-gradient(ellipse 70% 40% at 50% 100%, hsl(var(--primary)/0.07) 0%, transparent 70%)',
      }} />
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(hsl(var(--primary)/0.025) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--primary)/0.025) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />

      <div
        className="flex items-center justify-center gap-2 relative z-10"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
      >
        {screens.map((_, i) => (
          <motion.div
            key={i}
            animate={{ width: i === step ? 20 : 6, opacity: i <= step ? 1 : 0.3 }}
            transition={{ duration: 0.3 }}
            style={{
              height: 6, borderRadius: 99,
              background: i <= step ? 'hsl(var(--primary))' : 'rgba(255,255,255,0.15)',
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center text-center max-w-xs w-full gap-7"
          >
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${screen.accent}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 40px ${screen.accent}20`,
            }}>
              {screen.icon}
            </div>

            <div className="space-y-3">
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
                textTransform: 'uppercase', color: screen.accent, opacity: 0.65,
              }}>
                {screen.eyebrow}
              </div>
              <h2 style={{
                fontSize: 28, fontWeight: 800, color: '#fff',
                letterSpacing: '-0.02em', lineHeight: 1.15,
              }}>
                {screen.title}
              </h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65 }}>
                {screen.description}
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
              <button
                onClick={() => handleAllow(screen.onAllow)}
                disabled={loading}
                style={{
                  width: '100%', padding: '16px 24px',
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.7))',
                  border: 'none', borderRadius: 14,
                  fontSize: 15, fontWeight: 700,
                  color: 'hsl(var(--primary-foreground, 0 0% 0%))',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 24px hsl(var(--primary)/0.25)',
                  opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s',
                }}
              >
                {screen.allowLabel}
                <ChevronRight size={16} />
              </button>

              <button
                onClick={handleSkip}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: 'rgba(255,255,255,0.28)',
                  padding: '8px', transition: 'color 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
              >
                {t('onboarding.skip')}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ height: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }} />
    </div>
  );
}