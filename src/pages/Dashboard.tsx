import { useMemo, useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScanRevealOverlay } from '@/components/ScanRevealOverlay';
import {
  Package, CheckCircle, ArrowRightLeft, AlertTriangle, Zap, Clock, Activity,
  ArrowRight, TrendingUp, CalendarDays, Star, MapPin, DollarSign,
  RotateCcw, ScanLine, Trash, QrCode, FolderKanban, Bell,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { useInventory } from "@/hooks/useInventory";
import { useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PullToRefreshWrapper } from "@/components/PullToRefreshWrapper";

// ─── Smooth Tooltip ──────────────────────────────────────────────────────────
const useSmoothTooltipPosition = (coordinate: any) => {
  const [smoothPos, setSmoothPos] = useState({ x: coordinate?.x || 0, y: coordinate?.y || 0 });
  const targetPosRef = useRef({ x: coordinate?.x || 0, y: coordinate?.y || 0 });
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!coordinate) return;
    targetPosRef.current = { x: coordinate.x, y: coordinate.y };
    const animate = () => {
      setSmoothPos((prev) => {
        const target = targetPosRef.current;
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return target;
        return { x: prev.x + dx * 0.2, y: prev.y + dy * 0.2 };
      });
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [coordinate]);

  return smoothPos;
};

const PieTooltip = (props: any) => {
  const { active, payload, coordinate } = props;
  const smoothPos = useSmoothTooltipPosition(active && payload?.length ? coordinate : null);
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#ffffff" : "#1f2937";

  if (active && payload && payload.length) {
    return (
      <div style={{
        position: "fixed", left: `${smoothPos.x + 10}px`, top: `${smoothPos.y - 10}px`,
        pointerEvents: "none", zIndex: 1000, backgroundColor: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))", borderRadius: "8px", padding: "8px 12px",
        fontSize: "12px", color: textColor, boxShadow: "0 2px 8px rgba(0,0,0,0.15)", willChange: "transform",
      }}>
        <p style={{ color: textColor, margin: "0 0 4px 0" }}><strong>{payload[0].name}</strong></p>
        <p style={{ color: textColor, margin: "0" }}>{payload[0].value} Stück</p>
      </div>
    );
  }
  return null;
};

const BarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  return (
    <text x={x + width + 4} y={y + height / 2} fill="hsl(var(--foreground))"
      fontSize={10} fontWeight="600" textAnchor="start" dominantBaseline="middle">{value}</text>
  );
};

const BarTooltip = (props: any) => {
  const { active, payload } = props;
  const isDark = typeof window !== "undefined" && document.documentElement.classList.contains("dark");
  const textColor = isDark ? "#ffffff" : "#1f2937";

  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))",
        borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: textColor,
      }}>
        <p style={{ color: textColor, margin: "0" }}>{payload[0].value} Stück</p>
      </div>
    );
  }
  return null;
};

const AnimatedActiveBar = (props: any) => {
  const { fill, x, y, width, height } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx="4" ry="4" opacity="0.25"
        style={{ animation: "fadeIn 0.2s ease-out forwards" }} />
      <rect x={x} y={y} width={width} height={height} fill={fill} rx="4" ry="4" />
    </g>
  );
};

// ─── Mobile: Hero Donut + Bento ──────────────────────────────────────────────
interface MobileBentoStatsProps {
  stats: any;
  totalValue: number;
  activeLoansCount: number;
}

const MobileBentoStats = ({ stats, totalValue, activeLoansCount }: MobileBentoStatsProps) => {
  const [pressedCard, setPressedCard] = useState<string | null>(null);

  const press = (id: string) => {
    setPressedCard(id);
    if (navigator.vibrate) navigator.vibrate(8);
    setTimeout(() => setPressedCard(null), 150);
  };

  const cardScale = (id: string): React.CSSProperties => ({
    transform: pressedCard === id ? "scale(0.97)" : "scale(1)",
    transition: "transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)",
  });

  const available = stats.available || 0;
  const availPct  = stats.total > 0 ? Math.round((available / stats.total) * 100) : 0;

  const donutData = [
    { name: "Verfügbar",  value: stats.available || 0, color: "hsl(var(--success))" },
    { name: "Im Einsatz", value: stats.inUse || 0,     color: "hsl(var(--primary))" },
    { name: "Verliehen",  value: stats.lent || 0,      color: "hsl(var(--warning))" },
    { name: "Defekt",     value: stats.defect || 0,    color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0);

  const tiles = [
    { id: "avail", label: "Verfügbar",  value: stats.available,                color: "#22c55e", icon: <CheckCircle className="h-3.5 w-3.5" />,    to: "/inventory?filter=verfügbar" },
    { id: "lent",  label: "Verliehen",  value: activeLoansCount || stats.lent, color: "#f97316", icon: <ArrowRightLeft className="h-3.5 w-3.5" />, to: "/lending" },
    { id: "use",   label: "Im Einsatz", value: stats.inUse,                    color: "hsl(var(--primary))", icon: <Zap className="h-3.5 w-3.5" />, to: "/projects" },
    { id: "def",   label: "Defekt",     value: stats.defect,                   color: "#ef4444", icon: <AlertTriangle className="h-3.5 w-3.5" />,  to: "/inventory?filter=defekt" },
  ];

  return (
    <section className="mobile-bento-grid">
      <Link
        to="/inventory"
        className="mobile-hero-card"
        style={cardScale("hero")}
        onPointerDown={() => press("hero")}
      >
        <div className="mobile-hero-mesh" />
        <div style={{ position: "relative", zIndex: 10, padding: "14px", height: "100%", display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mob-hero-label)", margin: "0 0 6px 0" }}>
            Wo ist mein Zeug?
          </p>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ width: "120px", height: "120px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData.length > 0 ? donutData : [{ name: "Leer", value: 1, color: "rgba(255,255,255,0.08)" }]}
                    cx="50%" cy="50%"
                    innerRadius={36} outerRadius={52}
                    paddingAngle={donutData.length > 1 ? 3 : 0}
                    dataKey="value" strokeWidth={0}
                    startAngle={90} endAngle={-270}
                  >
                    {(donutData.length > 0 ? donutData : [{ color: "rgba(255,255,255,0.08)" }]).map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--mob-hero-pct)", lineHeight: 1, margin: 0 }}>{availPct}%</p>
              <p style={{ fontSize: "9px", color: "var(--mob-hero-pct-sub)", margin: "2px 0 0 0" }}>frei</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
            {donutData.map(d => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: "9px", color: "var(--mob-hero-legend)" }}>{d.name}</span>
                <span style={{ fontSize: "9px", color: "var(--mob-hero-legend-val)", fontWeight: 700 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>

      <div className="mobile-secondary-grid">
        {tiles.map((s) => (
          <Link
            key={s.id}
            to={s.to}
            className="mobile-stat-tile"
            style={{ ...cardScale(s.id), "--tile-accent": s.color } as React.CSSProperties}
            onPointerDown={() => press(s.id)}
          >
            <span className="mobile-tile-icon" style={{ color: s.color }}>{s.icon}</span>
            <span className="mobile-tile-value">{s.value}</span>
            <span className="mobile-tile-label">{s.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

// ─── Mobile: Swipeable Lent Item ─────────────────────────────────────────────
interface SwipeLentItemProps {
  item: any;
  onReturn?: (id: string) => void;
  onRemind?: (id: string) => void;
}

const SwipeLentItem = ({ item, onReturn, onRemind }: SwipeLentItemProps) => {
  const ACTION_WIDTH = 140;
  const THRESHOLD    = 72;

  const [offsetX,  setOffsetX]  = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX    = useRef(0);
  const startOff  = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current   = e.touches[0].clientX;
    startOff.current = offsetX;
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx   = e.touches[0].clientX - startX.current;
    const next = Math.min(0, Math.max(startOff.current + dx, -ACTION_WIDTH));
    setOffsetX(next);
  };

  const handleTouchEnd = () => {
    setDragging(false);
    if (offsetX < -THRESHOLD) {
      setOffsetX(-ACTION_WIDTH);
      setRevealed(true);
      if (navigator.vibrate) navigator.vibrate([6, 40, 12]);
    } else {
      setOffsetX(0);
      setRevealed(false);
      if (navigator.vibrate) navigator.vibrate(4);
    }
  };

  const close = () => { setOffsetX(0); setRevealed(false); };

  const now           = new Date();
  const soonThreshold = item.lent_until
    ? new Date(item.lent_until).getTime() - now.getTime() < 3 * 86_400_000
    : false;
  const urgencyColor = item.isOverdue ? "#ef4444" : soonThreshold ? "#f97316" : "#22c55e";
  const urgencyPulse = item.isOverdue || soonThreshold;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "12px", marginBottom: "8px" }}>
      <div
        style={{
          display: "flex",
          width: `calc(100% + ${ACTION_WIDTH}px)`,
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? "none" : "transform 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)",
          willChange: "transform",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ flex: `0 0 calc(100% - ${ACTION_WIDTH}px)`, minWidth: 0 }}>
          <Link
            to={`/inventory/${item.id}`}
            onClick={(e) => { if (revealed) e.preventDefault(); }}
            style={{
              display: "block",
              background: "var(--mob-card-bg)",
              border: "1px solid var(--mob-card-border)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderRadius: "12px",
              textDecoration: "none",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 12px 10px" }}>
              <div style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                backgroundColor: urgencyColor,
                boxShadow: urgencyPulse ? `0 0 8px ${urgencyColor}` : "none",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "13px", fontWeight: 600, margin: 0, color: "var(--mob-card-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.name}
                </p>
                <p style={{ fontSize: "11px", color: "var(--mob-card-subtext)", margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  an {item.lent_to || "–"}
                  {item.lent_until && ` · bis ${format(new Date(item.lent_until), "dd.MM.yy")}`}
                </p>
              </div>
              {item.isOverdue && (
                <span style={{
                  fontSize: "10px", fontWeight: 700, borderRadius: "20px", padding: "2px 8px", flexShrink: 0,
                  background: "rgba(239,68,68,0.18)", color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.35)",
                  animation: "glowPill 2s ease-in-out infinite",
                }}>
                  Überfällig
                </span>
              )}
            </div>
            <div style={{
              height: "2.5px", width: "100%", backgroundColor: urgencyColor,
              borderRadius: "0 0 12px 12px",
              ...(urgencyPulse ? { animation: "pulseBar 2s ease-in-out infinite" } : {}),
            }} />
          </Link>
        </div>

        <button
          style={{
            flex: `0 0 ${ACTION_WIDTH / 2}px`, border: "none", cursor: "pointer", marginLeft: "6px",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
            background: "hsl(var(--primary))", color: "#fff", fontSize: "10px", fontWeight: 700,
            borderRadius: "12px 0 0 12px",
          }}
          onClick={() => { close(); onReturn?.(item.id); }}
        >
          <RotateCcw style={{ width: "16px", height: "16px" }} />
          Rückgabe
        </button>
        <button
          style={{
            flex: `0 0 ${ACTION_WIDTH / 2}px`, border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
            background: "#f97316", color: "#fff", fontSize: "10px", fontWeight: 700,
            borderRadius: "0 12px 12px 0",
          }}
          onClick={() => { close(); onRemind?.(item.id); }}
        >
          <Trash style={{ width: "16px", height: "16px" }} />
          Löschen
        </button>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  // FIX: Ein einziger useInventory-Call statt drei
  const { allItems, stats, loading, refetch } = useInventory();
  const { projects } = useProjects();
  const { user } = useAuth();
  const { activeLoans, completedLoans, markReturned, deleteRecord } = useLendingHistory();
  const [chartsVisible, setChartsVisible] = useState(false);
  const [pieActiveIndex] = useState(-1);
  // FIX: reaktiver Hook statt einmaligem window.innerWidth-Snapshot
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;

  useEffect(() => {
    const t = setTimeout(() => setChartsVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const pieData = useMemo(() => [
    { name: "Verfügbar",  value: stats.available, color: "hsl(var(--success))" },
    { name: "Verliehen",  value: stats.lent,       color: "hsl(var(--warning))" },
    { name: "Im Einsatz", value: stats.inUse,      color: "hsl(var(--primary))" },
    { name: "Defekt",     value: stats.defect,     color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0), [stats]);

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + item.quantity; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [allItems]);

  const totalValue = useMemo(() =>
    allItems.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0),
  [allItems]);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach((item) => {
      const loc = item.location || "Unbekannt";
      counts[loc] = (counts[loc] || 0) + item.quantity;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allItems]);

  const upcomingProjects = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return projects
      .filter(p =>
        p.event_date_start &&
        new Date(p.event_date_start) >= now &&
        new Date(p.event_date_start) <= in30 &&
        p.status !== ('archived' as any)
      )
      .sort((a, b) =>
        new Date(a.event_date_start!).getTime() - new Date(b.event_date_start!).getTime()
      )
      .slice(0, 5);
  }, [projects]);

  const lentItems = useMemo(() => {
    const now = new Date();
    return activeLoans
      .map((loan) => ({
        id: loan.id,
        itemId: loan.item_id,
        name: loan.item_name,
        lent_to: loan.lent_to,
        lent_until: loan.due_date,
        updated_at: loan.created_at,
        isOverdue: loan.due_date ? new Date(loan.due_date) < now : false,
      }))
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 5);
  }, [activeLoans]);

  const defectItems = useMemo(() => allItems.filter((i) => i.condition === "defekt").slice(0, 5), [allItems]);

  const recentActivities = useMemo(() => {
    const activities: { id: string; message: string; time: string; type: "lent" | "returned" | "defect" }[] = [];
    activeLoans.forEach((r) => {
      activities.push({ id: r.id, message: `${r.item_name} verliehen an ${r.lent_to}`, time: r.created_at, type: "lent" });
    });
    completedLoans.slice(0, 5).forEach((r) => {
      activities.push({ id: r.id, message: `${r.item_name} zurückgegeben (war an ${r.lent_to})`, time: r.returned_at!, type: "returned" });
    });
    allItems.forEach((item) => {
      if (item.condition === "defekt")
        activities.push({ id: item.id, message: `${item.name} als defekt markiert`, time: item.updated_at, type: "defect" });
    });
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [allItems, activeLoans, completedLoans]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 sm:h-20 w-full" />)}
        </section>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] w-full rounded-lg" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <PullToRefreshWrapper
      onRefresh={async () => { await refetch(); }}
      disabled={!isMobile || !isStandalone}
    >
    <div className="space-y-5 sm:space-y-8 pb-24">
      <ScanRevealOverlay />
      <style>{`
        @keyframes fadeIn      { from { opacity: 0 } to { opacity: 0.25 } }
        @keyframes chartFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pulseBar    { 0%,100%{ opacity:1 } 50%{ opacity:0.4 } }
        @keyframes glowPill    { 0%,100%{ box-shadow:0 0 6px 1px rgba(239,68,68,.5) } 50%{ box-shadow:0 0 14px 4px rgba(239,68,68,.85) } }
        @keyframes meshMove    { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

        /* FIX: Aktivitäten-Stagger */
        @keyframes activityIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .activity-item {
          opacity: 0;
          animation: activityIn 0.3s ease forwards;
        }

        /* ── Mobile Bento ─────────────────────────── */
        @media (max-width: 767px) {
          .mobile-bento-grid {
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            margin-bottom: 24px;
            position: relative;
            z-index: 0;
            gap: 10px;
            align-items: stretch;
            overflow: visible;
            width: 100%;
            min-height: 220px;
          }
          .mobile-hero-card {
            grid-column: 1;
            height: 100%;
            border-radius: 20px;
            z-index: 2;
            overflow: hidden;
            text-decoration: none;
            display: block;
            min-height: 220px;
            position: relative;
            background: linear-gradient(145deg, #0f2027, #1a3a4a, #0b3d2e);
            box-shadow: 0 8px 32px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.25);
          }
          .mobile-hero-mesh {
            position: absolute; inset: 0;
            background:
              radial-gradient(ellipse at 20% 20%, rgba(52,211,153,.18) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, rgba(14,165,233,.14) 0%, transparent 55%),
              radial-gradient(ellipse at 50% 110%, rgba(16,185,129,.10) 0%, transparent 50%);
            background-size: 200% 200%;
            z-index: 1;
            pointer-events: none;
            animation: meshMove 8s ease-in-out infinite;
          }
          .mobile-secondary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 10px;
            height: 100%;
            z-index: 3;
          }
          .mobile-stat-tile {
            border-radius: 16px;
            min-height: 105px;
            background: rgba(255,255,255,.03);
            border: 1px solid rgba(255,255,255,.07);
            z-index: 10;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 4px 16px rgba(0,0,0,.3), 0 1px 4px rgba(0,0,0,.2);
            padding: 12px 12px 10px;
            display: flex;
            flex-direction: column;
            gap: 3px;
            text-decoration: none;
            position: relative;
            overflow: hidden;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          .mobile-stat-tile::before {
            content: "";
            position: absolute; top: 0; left: 0; right: 0;
            height: 2px;
            background: var(--tile-accent);
            opacity: 0.7;
            border-radius: 16px 16px 0 0;
          }
          .mobile-tile-icon  { margin-bottom: 2px; }
          .mobile-tile-value { font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.02em; line-height: 1; }
          .mobile-tile-label { font-size: 10px; color: rgba(255,255,255,.45); font-weight: 500; }

          .mobile-section-header { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
          .mobile-section-title  { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.35); }
        }

        /* ── Show/hide guards ─────────────────────── */
        @media (min-width: 768px) {
          .mobile-bento-grid { display: none !important; }
          .mobile-only       { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
        }
      `}</style>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Übersicht über dein Equipment</p>
      </div>

      {/* ══ 1. BENTO STATS ══════════════════════════════════════════════════════ */}
      <MobileBentoStats stats={stats} totalValue={totalValue} activeLoansCount={activeLoans.length} />

      <section className="desktop-only grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard title="Gesamt"     value={stats.total}                    icon={Package}       variant="default"     />
        <StatCard title="Verfügbar"  value={stats.available}                icon={CheckCircle}   variant="success"     />
        <StatCard title="Verliehen"  value={activeLoans.length || stats.lent} icon={ArrowRightLeft} variant="warning"  />
        <StatCard title="Im Einsatz" value={stats.inUse}                    icon={Zap}           variant="primary"     />
        <StatCard title="Defekt"     value={stats.defect}                   icon={AlertTriangle} variant="destructive" />
        <div className="glass-card p-3 sm:p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Gesamtwert</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1">
                {totalValue > 0 ? `${totalValue.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` : "–"}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* ══ Schnellaktionen ══════════════════════════════════════════════════════ */}
      <div className="grid gap-3">
        <button
          onClick={() => navigate("/scanner")}
          className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30 hover:bg-primary/15 active:scale-[0.98] transition-all text-left"
        >
          <div className="p-2.5 rounded-lg bg-primary/20 shrink-0 relative flex items-center justify-center">
            <ScanLine className="h-5 w-5 text-primary" />
            <QrCode className="h-3.5 w-3.5 text-primary absolute opacity-80" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">Scanner</p>
            <p className="text-xs text-muted-foreground truncate">Verleih, Aufbau, Abbau</p>
          </div>
        </button>
      </div>

      {/* ══ 2. MOBILE: Defekte Artikel ══════════════════════════════════════════ */}
      {defectItems.length > 0 && (
        <div className="mobile-only">
          <div className="mobile-section-header">
            <AlertTriangle className="h-3.5 w-3.5" style={{ color: "var(--mob-section-color)" }} />
            <span className="mobile-section-title">Defekt · {stats.defect} Artikel</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {defectItems.map((item) => (
              <Link key={item.id} to={`/inventory/${item.id}`} style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.18)",
                borderRadius: "12px", textDecoration: "none",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444", flexShrink: 0, boxShadow: "0 0 6px #ef4444" }} />
                <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--mob-card-text)", margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.name}
                </p>
                <span style={{ fontSize: "10px", color: "var(--mob-card-subtext)", flexShrink: 0 }}>{item.category}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ══ 3. Anstehende Projekte + Quick Links ══════════════════════════════════ */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Anstehende Projekte
            </h3>
            {upcomingProjects.length > 0 ? (
              <div className="space-y-2">
                {upcomingProjects.map((p) => {
                  const STATUS_LABEL: Record<string, string> = {
                    draft: 'Entwurf', planned: 'Geplant', packed: 'Gepackt',
                    transit: 'Unterwegs', live: 'Live', returning: 'Rücklauf',
                  };
                  const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive'> = {
                    draft: 'secondary', planned: 'secondary', packed: 'default',
                    transit: 'default', live: 'default', returning: 'secondary',
                  };
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 active:scale-[0.98] transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {p.is_favorite && (
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />
                          )}
                          <p className="text-xs sm:text-sm font-medium truncate">{p.name}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(p.event_date_start!), 'dd. MMM yyyy', { locale: de })}
                          {p.event_date_end && p.event_date_end !== p.event_date_start &&
                            ` – ${format(new Date(p.event_date_end), 'dd. MMM', { locale: de })}`}
                          {p.location && ` · ${p.location}`}
                        </p>
                      </div>
                      <Badge
                        variant={STATUS_VARIANT[p.status] ?? 'secondary'}
                        className="text-[10px] shrink-0 ml-2"
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              /* FIX: Leerer State mit Icon statt reinem Text */
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CalendarDays className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">Keine Projekte in den nächsten 30 Tagen.</p>
              </div>
            )}
            <Link
              to="/projects"
              className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Alle Projekte <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Link
            to="/projects"
            className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                <FolderKanban className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs sm:text-sm truncate">Projekte</p>
                <p className="text-[11px] text-muted-foreground">
                  {projects.filter(p => p.status !== ('archived' as any)).length} aktive Projekte
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </Link>

          {lentItems.length > 0 && (
            <Card className="desktop-only border-warning/30">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-warning" />
                  Verliehene Artikel
                </h3>
                <div className="space-y-1.5">
                  {lentItems.map((item) => (
                    <Link key={item.id} to={`/inventory/${item.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 active:scale-[0.98] transition-all">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          an {item.lent_to || '–'}
                          {item.lent_until && ` · bis ${format(new Date(item.lent_until), 'dd.MM.yy')}`}
                        </p>
                      </div>
                      {item.isOverdue && (
                        <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">Überfällig</Badge>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {defectItems.length > 0 && (
            <Card className="desktop-only border-destructive/30">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Defekte Artikel ({stats.defect})
                </h3>
                <div className="space-y-1.5">
                  {defectItems.map((item) => (
                    <Link key={item.id} to={`/inventory/${item.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20 active:scale-[0.98] transition-all">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">{item.category}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ══ 4. MOBILE: Swipeable Lent Items ════════════════════════════════════ */}
      {lentItems.length > 0 && (
        <div className="mobile-only">
          <div className="mobile-section-header">
            <ArrowRightLeft className="h-3.5 w-3.5" style={{ color: "var(--mob-section-color)" }} />
            <span className="mobile-section-title">Verliehen · Links wischen</span>
          </div>
          {lentItems.map((item) => (
            <SwipeLentItem
              key={item.id}
              item={item}
              onReturn={async (id) => {
                await markReturned(id);
                refetch();
              }}
              onRemind={async (id) => {
                // onRemind sendet eine Erinnerung — deleteRecord bleibt für echtes Löschen
                // Hier kannst du später push notification / toast ergänzen
                if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
              }}
            />
          ))}
          <Link to="/lending" className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Alle Ausleihen <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ══ 5. Charts & Aktivitäten ═════════════════════════════════════════════ */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-6" style={{ display: isMobile ? 'none' : 'block' }}>
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status-Verteilung
          </h3>
          {pieData.length > 0 ? (
            chartsVisible && (
              <div className="h-[220px] sm:h-[260px] animate-in fade-in duration-1000">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%"
                      innerRadius={isMobile ? 30 : 55} outerRadius={isMobile ? 60 : 90}
                      paddingAngle={2} dataKey="value" strokeWidth={0} activeIndex={pieActiveIndex}>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4 -mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
                      <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground truncate">{d.name}</span>
                      <span className="font-medium shrink-0">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* FIX: Skeleton statt leerem Div während Charts laden */
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Activity className="h-8 w-8 opacity-20" />
              <span className="text-sm">Keine Daten vorhanden</span>
            </div>
          )}
        </div>

        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Artikel nach Kategorie
          </h3>
          {categoryData.length > 0 ? (
            chartsVisible && (
              <div className="h-[240px] sm:h-[260px] animate-in fade-in duration-1000">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical"
                    margin={{ left: isMobile ? 55 : 80, right: isMobile ? 12 : 16, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={isMobile ? 55 : 80}
                      tick={{ fontSize: isMobile ? 9 : 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(59,130,246,0.1)" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}
                      activeBar={<AnimatedActiveBar />} label={<BarLabel />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <TrendingUp className="h-8 w-8 opacity-20" />
              <span className="text-sm">Keine Kategorien vorhanden</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="glass-card p-4 sm:p-6" hidden={isMobile}>
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Standorte
          </h3>
          {locationData.length > 0 ? (
            <div className="space-y-2">
              {locationData.map(([loc, count]) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={loc} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{loc}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{count} Stück</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-8 w-8 opacity-20" />
              <span className="text-sm">Keine Standorte vorhanden.</span>
            </div>
          )}
        </div>

        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Aktuelle Aktivitäten
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-2">
              {/* FIX: Stagger-Animation pro Item */}
              {recentActivities.map((activity, index) => (
                <div
                  key={activity.id + activity.time}
                  className={`activity-item flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    activity.type === "lent" ? "bg-warning/20 text-warning"
                    : activity.type === "returned" ? "bg-primary/20 text-primary"
                    : "bg-destructive/20 text-destructive"
                  }`}>
                    {activity.type === "lent" ? <ArrowRightLeft className="h-3 w-3" />
                     : activity.type === "returned" ? <CheckCircle className="h-3 w-3" />
                     : <AlertTriangle className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{activity.message}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(activity.time), "dd. MMM yyyy, HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[160px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Clock className="h-8 w-8 opacity-20" />
              <span className="text-sm">Keine aktuellen Aktivitäten</span>
            </div>
          )}
        </div>
      </div>
    </div>
    </PullToRefreshWrapper>
  );
}