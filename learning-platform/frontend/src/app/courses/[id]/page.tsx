'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { coursesApi, lessonsApi, enrollmentsApi, analyticsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Course, Lesson, Review } from '@/lib/types';
import { formatDuration, formatPrice } from '@/lib/utils';
import AIChatWidget from '@/components/AIChatWidget';
import FeedbackModal from '@/components/FeedbackModal';
import { toast } from 'sonner';
import {
  BookOpen, Clock, BarChart2, Star, CheckCircle2,
  Lock, PlayCircle, Loader2, Users
} from 'lucide-react';

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [course, setCourse]       = useState<Course | null>(null);
  const [lessons, setLessons]     = useState<Lesson[]>([]);
  const [reviews, setReviews]     = useState<Review[]>([]);
  const [enrolled, setEnrolled]   = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await coursesApi.getBySlug(slug);
        const c: Course = res.data;
        setCourse(c);
        analyticsApi.trackView({ course_id: c.id, event_type: 'course_view' }).catch(() => {});

        const [revRes] = await Promise.all([
          coursesApi.getReviews(c.id),
        ]);
        setReviews(revRes.data);

        if (isAuthenticated) {
          const [enrollRes, lessonsRes] = await Promise.all([
            enrollmentsApi.checkEnrollment(c.id),
            lessonsApi.getByCourse(c.id),
          ]);
          setEnrolled(enrollRes.data.enrolled);
          setLessons(lessonsRes.data);
        }
      } catch { router.push('/courses'); }
      finally  { setLoading(false); }
    }
    load();
  }, [slug, isAuthenticated]);

  const handleEnroll = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    setEnrolling(true);
    try {
      await enrollmentsApi.enroll(course!.id);
      analyticsApi.trackEnrollment({ course_id: course!.id, event_type: 'enroll' }).catch(() => {});
      setEnrolled(true);
      const lessonsRes = await lessonsApi.getByCourse(course!.id);
      setLessons(lessonsRes.data);
      toast.success('Enrolled! Start learning now 🎉');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Enrollment failed');
    } finally { setEnrolling(false); }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!course) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

        {/* ── Main content ────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-6">
            {course.category && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{course.category.name}</span>
            )}
            <h1 className="text-3xl font-extrabold mt-1 mb-3">{course.title}</h1>
            <p className="text-muted-foreground mb-4">{course.short_desc}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 capitalize">
                <BarChart2 className="h-4 w-4" /> {course.level}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" /> {course.total_lessons} lessons
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatDuration(course.total_duration)}
              </span>
              {avgRating && (
                <span className="flex items-center gap-1.5 text-amber-500">
                  <Star className="h-4 w-4 fill-amber-400" /> {avgRating} ({reviews.length})
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3">About this course</h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{course.description}</p>
          </div>

          {/* Tags */}
          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {course.tags.map(tag => (
                <span key={tag} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">#{tag}</span>
              ))}
            </div>
          )}

          {/* Syllabus */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Course Content</h2>
            {lessons.length === 0 && !isAuthenticated && (
              <p className="text-sm text-muted-foreground">Enroll to see the full syllabus.</p>
            )}
            <div className="space-y-2">
              {lessons.map((lesson, i) => (
                <div
                  key={lesson.id}
                  onClick={() => enrolled ? router.push(`/courses/${slug}/lessons/${lesson.id}`) : undefined}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    enrolled && lesson.content ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''
                  }`}
                >
                  <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}</span>
                  {enrolled || lesson.is_free ? (
                    <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium">{lesson.title}</span>
                  {lesson.is_free && !enrolled && (
                    <span className="text-xs text-emerald-600 font-semibold">Free preview</span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Reviews</h2>
              <div className="space-y-4">
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border bg-white shadow-md overflow-hidden">
            {/* Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="h-16 w-16 text-primary/20" />
              )}
            </div>
            <div className="p-5">
              <p className="text-3xl font-extrabold mb-1">{formatPrice(course.price, course.is_free)}</p>
              {!course.is_free && <p className="text-xs text-muted-foreground mb-4">One-time payment, lifetime access</p>}

              {enrolled ? (
                <div>
                  <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-3">
                    <CheckCircle2 className="h-5 w-5" /> You're enrolled
                  </div>
                  <button
                    onClick={() => lessons[0] && router.push(`/courses/${slug}/lessons/${lessons[0].id}`)}
                    className="w-full rounded-xl bg-primary text-white font-bold py-3 hover:bg-primary/90 transition-colors"
                  >
                    Continue Learning
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-white font-bold py-3 hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {course.is_free ? 'Enroll for Free' : `Enroll for ${formatPrice(course.price, false)}`}
                </button>
              )}

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> {course.total_lessons} lessons</p>
                <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {formatDuration(course.total_duration)} total</p>
                <p className="flex items-center gap-2 capitalize"><BarChart2 className="h-4 w-4" /> {course.level}</p>
              </div>

              {enrolled && (
                <div className="mt-4 pt-4 border-t">
                  <FeedbackModal courseId={course.id} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor widget (only shown when enrolled) */}
      {enrolled && (
        <AIChatWidget
          courseTitle={course.title}
          courseContext={course.description || course.short_desc}
        />
      )}
    </div>
  );
}
