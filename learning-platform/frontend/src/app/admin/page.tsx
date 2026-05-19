'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { analyticsApi } from '@/lib/api';
import { DashboardStats } from '@/lib/types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { Users, Eye, TrendingUp, CheckCircle2, Loader2, BarChart2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [enrollTrends, setEnrollTrends] = useState<any[]>([]);
  const [viewTrends, setViewTrends]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'admin')) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    Promise.all([
      analyticsApi.dashboard(),
      analyticsApi.enrollmentTrends(30),
      analyticsApi.viewTrends(30),
    ]).then(([s, e, v]) => {
      setStats(s.data);
      setEnrollTrends(e.data);
      setViewTrends(v.data);
    }).finally(() => setLoading(false));
  }, [user]);

  if (isLoading || loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!stats) return null;

  const statCards = [
    { icon: Eye,         label: 'Total Views',        value: stats.total_views.toLocaleString(),         color: 'text-blue-600',   bg: 'bg-blue-50' },
    { icon: Users,       label: 'Total Enrollments',  value: stats.total_enrollments.toLocaleString(),   color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: CheckCircle2,label: 'Completions',        value: stats.total_completions.toLocaleString(),   color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { icon: TrendingUp,  label: 'Enrollments (7d)',   value: stats.enrollments_last_7_days.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform-wide metrics</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="rounded-xl border bg-white p-5">
            <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <p className="text-2xl font-extrabold">{value}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Enrollment trends */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-4">Enrollments – Last 30 Days</h2>
          {enrollTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={enrollTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(262, 83%, 58%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>

        {/* View trends */}
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-4">Page Views – Last 30 Days</h2>
          {viewTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={viewTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(262, 83%, 58%)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Top courses */}
      {stats.top_courses.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h2 className="font-semibold mb-4">Top Courses by Enrollment</h2>
          <div className="space-y-3">
            {stats.top_courses.map((c, i) => (
              <div key={c.course_id} className="flex items-center gap-4">
                <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Course #{c.course_id}</span>
                    <span className="text-sm font-semibold">{c.enrollments} enrollments</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(c.enrollments / stats.top_courses[0].enrollments) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
