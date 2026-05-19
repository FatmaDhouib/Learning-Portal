'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { enrollmentsApi, coursesApi, lessonsApi } from '@/lib/api';
import { Enrollment, Course } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import Link from 'next/link';
import {
  BookOpen, Clock, CheckCircle2, TrendingUp,
  Loader2, GraduationCap, ArrowRight
} from 'lucide-react';

interface EnrolledCourse { enrollment: Enrollment; course: Course; progressPct: number; }

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [data, setData]       = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      try {
        const enrollRes = await enrollmentsApi.myEnrollments();
        const enrollments: Enrollment[] = enrollRes.data;

        const enriched = await Promise.all(
          enrollments.map(async (e) => {
            try {
              const [courseRes, progressRes, lessonsRes] = await Promise.all([
                coursesApi.get(e.course_id),
                lessonsApi.getCourseProgress(e.course_id),
                lessonsApi.getByCourse(e.course_id),
              ]);
              const completed = progressRes.data.filter((p: any) => p.is_completed).length;
              const total     = lessonsRes.data.length;
              return { enrollment: e, course: courseRes.data, progressPct: total > 0 ? Math.round((completed / total) * 100) : 0 };
            } catch { return null; }
          })
        );
        setData(enriched.filter(Boolean) as EnrolledCourse[]);
      } finally { setLoading(false); }
    }
    load();
  }, [isAuthenticated]);

  const completed  = data.filter(d => d.progressPct === 100).length;
  const inProgress = data.filter(d => d.progressPct > 0 && d.progressPct < 100).length;

  if (isLoading || loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Learning</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { icon: BookOpen,     label: 'Enrolled',    value: data.length },
          { icon: TrendingUp,   label: 'In Progress',  value: inProgress },
          { icon: CheckCircle2, label: 'Completed',    value: completed },
          { icon: GraduationCap,label: 'Role',         value: user?.role },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border bg-white p-4 flex flex-col gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold capitalize">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Enrolled courses */}
      <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
      {data.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-12 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium mb-1">No courses yet</p>
          <p className="text-sm mb-4">Browse our catalogue and enroll in your first course</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Browse Courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map(({ enrollment, course, progressPct }) => (
            <div key={enrollment.id} className="rounded-xl border bg-white p-5 flex gap-5 hover:shadow-sm transition-shadow">
              <div className="h-16 w-24 shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary/30" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{course.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                  {course.total_lessons} lessons · {formatDuration(course.total_duration)}
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-primary shrink-0">{progressPct}%</span>
                </div>
              </div>
              <div className="flex items-center shrink-0">
                <Link
                  href={`/courses/${course.slug}`}
                  className="flex items-center gap-1.5 rounded-lg bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  {progressPct === 0 ? 'Start' : progressPct === 100 ? 'Review' : 'Continue'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
