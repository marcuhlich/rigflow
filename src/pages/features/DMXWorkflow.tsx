import { useNavigate } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  SlidersHorizontal,
  AlertTriangle,
  Download,
  ChevronRight,
  LayoutGrid,
  List,
  FileText,
  Printer,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRef, useEffect, useState } from 'react';

function useScrollReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );

    obs.observe(el);

    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible] as const;
}

const CSS = `
  @keyframes fadeUp {
    from {
      opacity:0;
      transform:translateY(24px);
    }
    to {
      opacity:1;
      transform:translateY(0);
    }
  }

  .du-0 {
    animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }

  .du-1 {
    animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
    animation-delay:120ms;
  }

  .du-2 {
    animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
    animation-delay:240ms;
  }

  .sub-reveal {
    opacity:0;
    transform:translateY(20px);
    transition:
      opacity 0.5s ease,
      transform 0.5s ease;
  }

  .sub-reveal.sub-vis {
    opacity:1;
    transform:translateY(0);
  }

  @keyframes pageSlideIn {
    from {
      opacity:0;
      transform:translateY(16px);
    }
    to {
      opacity:1;
      transform:translateY(0);
    }
  }

  .page-enter {
    animation: pageSlideIn 0.4s ease forwards;
  }
`;

const universeData = [
  { id: 1, used: 380, max: 512 },
  { id: 2, used: 96, max: 512 },
];

function UniverseBar({
  used,
  max,
  delay = 0,
}: {
  used: number;
  max: number;
  delay?: number;
}) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setW((used / max) * 100);
    }, delay + 200);

    return () => clearTimeout(t);
  }, [used, max, delay]);

  const col =
    w > 90
      ? '#ef4444'
      : w > 70
        ? '#eab308'
        : 'hsl(var(--primary))';

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${w}%`,
          backgroundColor: col,
          transition: 'width 700ms cubic-bezier(0.4,0,0.2,1)',
        }}
      />
    </div>
  );
}

export default function DMXWorkflow() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<'timeline' | 'table'>(
    'table'
  );

  const [ref1, vis1] = useScrollReveal();
  const [ref2, vis2] = useScrollReveal();
  const [ref3, vis3] = useScrollReveal();

  const patchRows = t(
    'landing.features.dmxWorkflow.patchRows',
    {
      returnObjects: true,
    }
  ) as Array<{
    ch: string;
    name: string;
    instance: string;
    mode: string;
    conflict: boolean;
  }>;

  const exportItems = t(
    'landing.features.dmxWorkflow.export.items',
    {
      returnObjects: true,
    }
  ) as Array<{
    label: string;
    desc: string;
  }>;

  const benefitItems = t(
    'landing.features.dmxWorkflow.benefits.items',
    {
      returnObjects: true,
    }
  ) as Array<{
    title: string;
    desc: string;
  }>;

  const exportIcons = [FileText, FileText, Printer];
  const benefitIcons = [Zap, AlertTriangle, CheckCircle2];

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 page-enter">
        <header className="border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-1.5 text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('landing.common.back')}
            </Button>

            <div className="text-xl font-bold gradient-text">
              RigFlow
            </div>

            <Button
              size="sm"
              onClick={() => navigate('/register')}
            >
              {t('landing.common.startFree')}
            </Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 space-y-16">
          {/* Hero */}
          <div className="space-y-5 max-w-2xl">
            <div className="du-0 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t(
                'landing.features.dmxWorkflow.hero.badge'
              )}
            </div>

            <h1 className="du-1 text-3xl sm:text-5xl font-bold leading-tight">
              <Trans
                i18nKey="landing.features.dmxWorkflow.hero.title"
                components={{
                  br: <br />,
                  highlight: (
                    <span className="gradient-text" />
                  ),
                }}
              />
            </h1>

            <p className="du-2 text-lg text-muted-foreground">
              {t(
                'landing.features.dmxWorkflow.hero.description'
              )}
            </p>

            <div className="du-2">
              <Button
                onClick={() => navigate('/register')}
                className="gap-2"
              >
                {t('landing.common.tryNow')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mockup */}
          <div
            ref={ref1}
            className={`sub-reveal ${vis1 ? 'sub-vis' : ''} space-y-4`}
          >
            {/* Universes */}
            <div className="grid grid-cols-2 gap-3">
              {universeData.map((u, i) => (
                <div
                  key={u.id}
                  className="glass-card p-3 border border-border/50 rounded-lg"
                >
                  <div className="text-sm font-medium text-muted-foreground">
                    {t(
                      'landing.features.dmxWorkflow.universe.title',
                      {
                        id: u.id,
                      }
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    <UniverseBar
                      used={u.used}
                      max={u.max}
                      delay={i * 120}
                    />

                    <div className="text-xs text-muted-foreground">
                      {t(
                        'landing.features.dmxWorkflow.universe.channels',
                        {
                          used: u.used,
                          max: u.max,
                        }
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conflict Alert */}
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />

              <div>
                <div className="text-sm font-semibold text-destructive">
                  {t(
                    'landing.features.dmxWorkflow.conflict.title'
                  )}
                </div>

                <ul className="mt-1 text-xs text-destructive/80 space-y-0.5">
                  <li>
                    <Trans
                      i18nKey="landing.features.dmxWorkflow.conflict.message"
                      values={{
                        fixture1: 'Stroboskop Elation #1 (048–051)',
                        fixture2: 'PAR LED RGB #1 (048–050)',
                      }}
                      components={{
                        strong: <strong />,
                      }}
                    />
                  </li>
                </ul>
              </div>
            </div>

            {/* Table */}
            <Card className="glass-card overflow-hidden border border-border/50">
              <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />

                  <span className="font-semibold text-sm">
                    {t(
                      'landing.features.dmxWorkflow.table.title'
                    )}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {t(
                      'landing.features.dmxWorkflow.table.assignments',
                      {
                        count: patchRows.length,
                      }
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Toggle */}
                  <div className="flex rounded-md border border-border overflow-hidden h-7">
                    {(
                      ['timeline', 'table'] as const
                    ).map((m, idx) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`px-2 flex items-center transition-all ${
                          idx > 0
                            ? 'border-l border-border'
                            : ''
                        } ${
                          viewMode === m
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                        title={t(
                          `landing.features.dmxWorkflow.table.view.${m}`
                        )}
                      >
                        {m === 'timeline' ? (
                          <LayoutGrid className="h-3.5 w-3.5" />
                        ) : (
                          <List className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Export */}
                  <button className="h-7 px-2.5 text-xs flex items-center gap-1.5 border border-border rounded-md text-muted-foreground hover:bg-muted/50 transition-colors">
                    <Download className="h-3 w-3" />

                    {t(
                      'landing.features.dmxWorkflow.table.export'
                    )}
                  </button>
                </div>
              </div>

              {/* Header */}
              <div className="grid grid-cols-12 px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/10 border-b border-border/20">
                <span className="col-span-2">
                  {t(
                    'landing.features.dmxWorkflow.table.columns.address'
                  )}
                </span>

                <span className="col-span-5">
                  {t(
                    'landing.features.dmxWorkflow.table.columns.fixture'
                  )}
                </span>

                <span className="col-span-2">
                  {t(
                    'landing.features.dmxWorkflow.table.columns.instance'
                  )}
                </span>

                <span className="col-span-3">
                  {t(
                    'landing.features.dmxWorkflow.table.columns.mode'
                  )}
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/15">
                {patchRows.map((row, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-12 items-center px-4 py-2.5 text-xs transition-colors
                    ${
                      row.conflict
                        ? 'bg-destructive/8 border-l-2 border-destructive/60'
                        : 'hover:bg-muted/10'
                    }`}
                  >
                    <span className="col-span-2 font-mono text-primary/80 font-medium">
                      {row.ch}
                    </span>

                    <span
                      className={`col-span-5 truncate ${
                        row.conflict
                          ? 'text-destructive/80'
                          : ''
                      }`}
                    >
                      {row.name}
                    </span>

                    <span className="col-span-2 text-muted-foreground">
                      {row.instance}
                    </span>

                    <div className="col-span-3 flex items-center gap-1.5">
                      <span className="text-muted-foreground">
                        {row.mode}
                      </span>

                      {row.conflict && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                          {t(
                            'landing.features.dmxWorkflow.table.conflict'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Export */}
          <div
            ref={ref2}
            className={`sub-reveal ${vis2 ? 'sub-vis' : ''} space-y-4`}
          >
            <h2 className="text-xl font-bold">
              {t(
                'landing.features.dmxWorkflow.export.title'
              )}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {exportItems.map((e, i) => {
                const Icon = exportIcons[i];

                return (
                  <Card
                    key={i}
                    className="glass-card p-4 space-y-2 border border-border/50"
                  >
                    <Icon className="h-5 w-5 text-primary" />

                    <div className="font-semibold text-sm">
                      {e.label}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {e.desc}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Benefits */}
          <div
            ref={ref3}
            className={`sub-reveal ${vis3 ? 'sub-vis' : ''} space-y-4`}
          >
            <h2 className="text-xl font-bold">
              {t(
                'landing.features.dmxWorkflow.benefits.title'
              )}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {benefitItems.map((b, i) => {
                const Icon = benefitIcons[i];

                return (
                  <Card
                    key={i}
                    className="glass-card p-5 space-y-3 border border-border/50"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>

                    <h3 className="font-semibold text-sm">
                      {b.title}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      {b.desc}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">
              {t(
                'landing.features.dmxWorkflow.cta.title'
              )}
            </h2>

            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="gap-2"
            >
              {t('landing.common.startFree')}

              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <footer className="border-t border-border/50 bg-background/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              © 2026 RigFlow
            </p>

            <div className="flex gap-5 text-sm text-muted-foreground">
              <a
                href="/impressum"
                className="hover:text-foreground transition-colors"
              >
                {t('common.imprint')}
              </a>

              <a
                href="/datenschutz"
                className="hover:text-foreground transition-colors"
              >
                {t('common.privacy')}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}