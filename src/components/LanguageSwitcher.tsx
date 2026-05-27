import { useEffect, useRef, useState } from 'react';
import { getCurrentLanguage, changeLanguage } from '@/i18n';
import { cn } from '@/lib/utils';

const LANGUAGES = [
  { id: 'de', label: '🇩🇪 Deutsch' },
  { id: 'en', label: '🇬🇧 English' },
] as const;

export function LanguageSwitcher() {
  const current = getCurrentLanguage();

  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const updateIndicator = (id: string) => {
    const container = containerRef.current;
    if (!container) return;

    const index = LANGUAGES.findIndex((l) => l.id === id);
    const segmentWidth = container.offsetWidth / LANGUAGES.length;

    setIndicatorStyle({
      left: index * segmentWidth,
      width: segmentWidth,
    });
  };

  useEffect(() => {
    updateIndicator(current);
    const onResize = () => updateIndicator(current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [current]);

  return (
    <div
      ref={containerRef}
      className="
        relative flex w-full p-1 rounded-xl
        border border-border/60
        bg-muted/30 dark:bg-muted/20
      "
    >
      {/* Sliding pill */}
      <div
        className="
          absolute top-1 bottom-1 rounded-lg
          bg-white dark:bg-background
          shadow-sm ring-1 ring-black/5 dark:ring-white/10
          transition-all duration-300 ease-out
        "
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
      />

      {LANGUAGES.map((lang) => {
        const active = current === lang.id;

        return (
          <button
            key={lang.id}
            onClick={() => {
              changeLanguage(lang.id);
              updateIndicator(lang.id);
            }}
            className={cn(
              `
              relative z-10 flex-1 py-1.5 text-sm font-medium text-center
              transition-colors
              `,
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
}