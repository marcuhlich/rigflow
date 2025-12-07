import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Package, CheckCircle, ArrowRightLeft, AlertTriangle, Zap, Clock, Activity, CheckSquare, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { StatCard } from "@/components/StatCard";
import { useInventory } from "@/hooks/useInventory";
import { useEventChecklists } from "@/hooks/useEventChecklists";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export default function Dashboard() {
  const { allItems, stats, loading } = useInventory();
  const { checklists } = useEventChecklists();

  const pieData = useMemo(() => [
    { name: "Verfügbar", value: stats.available, color: "hsl(152, 60%, 45%)" },
    { name: "Verliehen", value: stats.lent, color: "hsl(38, 92%, 50%)" },
    { name: "Im Einsatz", value: stats.inUse, color: "hsl(174, 60%, 50%)" },
    { name: "Defekt", value: stats.defect, color: "hsl(0, 72%, 51%)" },
  ].filter(d => d.value > 0), [stats]);

  const recentActivities = useMemo(() => {
    const activities: { id: string; message: string; time: string; type: 'lent' | 'defect' | 'recent' }[] = [];
    
    allItems.forEach(item => {
      if (item.condition === 'verliehen' && item.lent_to) {
        activities.push({
          id: item.id,
          message: `${item.name} verliehen an ${item.lent_to}`,
          time: item.updated_at,
          type: 'lent'
        });
      }
      if (item.condition === 'defekt') {
        activities.push({
          id: item.id,
          message: `${item.name} als defekt markiert`,
          time: item.updated_at,
          type: 'defect'
        });
      }
    });

    // Sort by most recent and take top 5
    return activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  }, [allItems]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    allItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + item.quantity;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">Übersicht über dein Equipment</p>
      </div>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Gesamt" value={stats.total} icon={Package} variant="default" />
        <StatCard title="Verfügbar" value={stats.available} icon={CheckCircle} variant="success" />
        <StatCard title="Verliehen" value={stats.lent} icon={ArrowRightLeft} variant="warning" />
        <StatCard title="Im Einsatz" value={stats.inUse} icon={Zap} variant="primary" />
        <StatCard title="Defekt" value={stats.defect} icon={AlertTriangle} variant="destructive" />
      </section>

      {/* Quick Link to Checklists */}
      {checklists.length > 0 && (
        <Link
          to="/checklists"
          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Event Checklisten</p>
              <p className="text-xs text-muted-foreground">{checklists.length} aktive Checkliste{checklists.length !== 1 ? 'n' : ''}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      )}

      {/* Charts and Activities */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Status-Verteilung
          </h3>
          {pieData.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(220, 20%, 14%)",
                      border: "1px solid hsl(220, 15%, 22%)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground">
              Keine Daten vorhanden
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Aktuelle Aktivitäten
          </h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id + activity.time}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className={`p-1.5 rounded-full ${
                    activity.type === 'lent' ? 'bg-warning/20 text-warning' : 'bg-destructive/20 text-destructive'
                  }`}>
                    {activity.type === 'lent' ? (
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(activity.time), "dd. MMM yyyy, HH:mm", { locale: de })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Keine aktuellen Aktivitäten
            </div>
          )}
        </div>
      </div>

      {/* Category Overview */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Artikel nach Kategorie
        </h3>
        {categoryStats.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categoryStats.map(([category, count]) => (
              <div key={category} className="p-4 rounded-lg bg-muted/20 text-center">
                <p className="text-2xl font-bold text-primary">{count}</p>
                <p className="text-sm text-muted-foreground mt-1">{category}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            Keine Kategorien vorhanden
          </div>
        )}
      </div>
    </div>
  );
}
