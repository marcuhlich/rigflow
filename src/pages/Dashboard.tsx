import { useMemo, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package, CheckCircle, ArrowRightLeft, AlertTriangle, Zap, Clock, Activity,
  CheckSquare, ArrowRight, TrendingUp, CalendarDays, Star, MapPin, DollarSign,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { AppOnboardingTour } from "@/components/AppOnboardingTour";
import { useInventory } from "@/hooks/useInventory";
import { useEventChecklists } from "@/hooks/useEventChecklists";
import { useEventSets } from "@/hooks/useEventSets";
import { useAuth } from "@/hooks/useAuth";
import { useLendingHistory } from "@/hooks/useLendingHistory";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Dashboard() {
  const { allItems, stats, loading } = useInventory();
  const { checklists } = useEventChecklists();
  const { sets, loading: setsLoading } = useEventSets();
  const { user } = useAuth();
  const { activeLoans, overdueLoans, completedLoans, loading: lendingLoading } = useLendingHistory();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
      if (!hasCompletedOnboarding) setShowOnboarding(true);
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
    setShowOnboarding(false);
  };

  // Pie data
  const pieData = useMemo(() => [
    { name: "Verfügbar", value: stats.available, color: "hsl(var(--success))" },
    { name: "Verliehen", value: stats.lent, color: "hsl(var(--warning))" },
    { name: "Im Einsatz", value: stats.inUse, color: "hsl(var(--primary))" },
    { name: "Defekt", value: stats.defect, color: "hsl(var(--destructive))" },
  ].filter(d => d.value > 0), [stats]);

  // Category bar chart data
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [allItems]);

  // Total inventory value
  const totalValue = useMemo(() => {
    return allItems.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);
  }, [allItems]);

  // Items by location
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      const loc = item.location || "Unbekannt";
      counts[loc] = (counts[loc] || 0) + item.quantity;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [allItems]);

  // Upcoming event sets (next 30 days)
  const upcomingSets = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return sets
      .filter(s => s.event_date_start && new Date(s.event_date_start) >= now && new Date(s.event_date_start) <= in30)
      .sort((a, b) => new Date(a.event_date_start!).getTime() - new Date(b.event_date_start!).getTime())
      .slice(0, 5);
  }, [sets]);

  // Lent items with overdue check
  const lentItems = useMemo(() => {
    const now = new Date();
    return allItems
      .filter(i => i.condition === 'verliehen')
      .map(i => ({
        ...i,
        isOverdue: i.lent_until ? new Date(i.lent_until) < now : false,
      }))
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, 5);
  }, [allItems]);

  // Defect items
  const defectItems = useMemo(() =>
    allItems.filter(i => i.condition === 'defekt').slice(0, 5),
  [allItems]);

  // Recent activities - combine lending history with defect items
  const recentActivities = useMemo(() => {
    const activities: { id: string; message: string; time: string; type: 'lent' | 'returned' | 'defect' }[] = [];
    // Use real lending history
    activeLoans.forEach(record => {
      activities.push({ id: record.id, message: `${record.item_name} verliehen an ${record.lent_to}`, time: record.created_at, type: 'lent' });
    });
    completedLoans.slice(0, 5).forEach(record => {
      activities.push({ id: record.id, message: `${record.item_name} zurückgegeben (war an ${record.lent_to})`, time: record.returned_at!, type: 'returned' });
    });
    allItems.forEach(item => {
      if (item.condition === 'defekt') {
        activities.push({ id: item.id, message: `${item.name} als defekt markiert`, time: item.updated_at, type: 'defect' });
      }
    });
    return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
  }, [allItems, activeLoans, completedLoans]);

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 sm:h-20 w-full" />
          ))}
        </section>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-[280px] w-full rounded-lg" />
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8 pb-24">
      {showOnboarding && <AppOnboardingTour onComplete={handleOnboardingComplete} />}

      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Übersicht über dein Equipment</p>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard title="Gesamt" value={stats.total} icon={Package} variant="default" />
        <StatCard title="Verfügbar" value={stats.available} icon={CheckCircle} variant="success" />
        <StatCard title="Verliehen" value={activeLoans.length || stats.lent} icon={ArrowRightLeft} variant="warning" />
        <StatCard title="Im Einsatz" value={stats.inUse} icon={Zap} variant="primary" />
        <StatCard title="Defekt" value={stats.defect} icon={AlertTriangle} variant="destructive" />
        <div className="glass-card p-3 sm:p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Gesamtwert</p>
              <p className="text-lg sm:text-2xl font-bold mt-0.5 sm:mt-1">
                {totalValue > 0 ? `${totalValue.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` : '–'}
              </p>
            </div>
            <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events & Quick Links */}
      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Upcoming sets */}
        <Card className="border-border/50">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Anstehende Events
            </h3>
            {upcomingSets.length > 0 ? (
              <div className="space-y-2">
                {upcomingSets.map(s => {
                  const allOk = s.items.length > 0 && s.items.every(i => (i.available_quantity || 0) >= i.quantity);
                  return (
                    <Link
                      key={s.id}
                      to="/sets"
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {s.is_favorite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                          <p className="text-xs sm:text-sm font-medium truncate">{s.name}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(s.event_date_start!), "dd. MMM yyyy", { locale: de })}
                          {s.event_date_end && ` – ${format(new Date(s.event_date_end), "dd. MMM", { locale: de })}`}
                        </p>
                      </div>
                      <Badge variant={allOk ? "secondary" : "destructive"} className="text-[10px] shrink-0 ml-2">
                        {allOk ? "Bereit" : "Prüfen"}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">Keine Events in den nächsten 30 Tagen.</p>
            )}
            <Link to="/sets" className="flex items-center gap-1 mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Alle Sets <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="space-y-3">
          {checklists.length > 0 && (
            <Link
              to="/checklists"
              className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/20 border border-border/50 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <CheckSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs sm:text-sm truncate">Event Checklisten</p>
                  <p className="text-[11px] text-muted-foreground">{checklists.length} aktive Checkliste{checklists.length !== 1 ? 'n' : ''}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          )}

          {/* Lent items warning */}
          {lentItems.length > 0 && (
            <Card className="border-warning/30">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-warning" />
                  Verliehene Artikel
                </h3>
                <div className="space-y-1.5">
                  {lentItems.map(item => (
                    <Link
                      key={item.id}
                      to={`/inventory/${item.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/20 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          an {item.lent_to || '–'}
                          {item.lent_until && ` · bis ${format(new Date(item.lent_until), "dd.MM.yy")}`}
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

          {/* Defect items */}
          {defectItems.length > 0 && (
            <Card className="border-destructive/30">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Defekte Artikel ({stats.defect})
                </h3>
                <div className="space-y-1.5">
                  {defectItems.map(item => (
                    <Link
                      key={item.id}
                      to={`/inventory/${item.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/20 transition-colors"
                    >
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

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Status-Verteilung
          </h3>
          {pieData.length > 0 ? (
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 -mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
              Keine Daten vorhanden
            </div>
          )}
        </div>

        {/* Bar Chart - Categories */}
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Artikel nach Kategorie
          </h3>
          {categoryData.length > 0 ? (
            <div className="h-[260px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`${value} Stück`, 'Menge']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
              Keine Kategorien vorhanden
            </div>
          )}
        </div>
      </div>

      {/* Location & Activity Row */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Locations */}
        <div className="glass-card p-4 sm:p-6">
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
                      <div
                        className="h-full rounded-full bg-primary/70 transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Keine Standorte vorhanden.</p>
          )}
        </div>

        {/* Recent Activities */}
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Aktuelle Aktivitäten
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id + activity.time}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-full flex-shrink-0 ${
                    activity.type === 'lent' ? 'bg-warning/20 text-warning' : activity.type === 'returned' ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'
                  }`}>
                    {activity.type === 'lent' ? (
                      <ArrowRightLeft className="h-3 w-3" />
                    ) : activity.type === 'returned' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
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
            <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
              Keine aktuellen Aktivitäten
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
