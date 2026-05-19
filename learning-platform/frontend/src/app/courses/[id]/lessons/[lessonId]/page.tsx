'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { lessonsApi, coursesApi, analyticsApi } from '@/lib/api';
import { Lesson, LessonProgress, Course } from '@/lib/types';
import { formatDuration } from '@/lib/utils';
import AIChatWidget from '@/components/AIChatWidget';
import ReactMarkdown from 'react-markdown';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, PlayCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LessonPage() {
  const { id: courseSlug, lessonId } = useParams<{ id: string; lessonId: string }>();
  const router = useRouter();

  const [course, setCourse]   = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lesson, setLesson]   = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const courseRes = await coursesApi.getBySlug(courseSlug);
        const c: Course = courseRes.data;
        setCourse(c);

        const [lessonsRes, progressRes] = await Promise.all([
          lessonsApi.getByCourse(c.id),
          lessonsApi.getCourseProgress(c.id),
        ]);
        setLessons(lessonsRes.data);
        setProgress(progressRes.data);

        const current = lessonsRes.data.find((l: Lesson) => l.id === Number(lessonId));
        if (!current) router.push(`/courses/${courseSlug}`);
        else {
          setLesson(current);
          analyticsApi.trackView({ course_id: c.id, lesson_id: current.id, event_type: 'lesson_view' }).catch(() => {});
        }
      } catch { router.push('/dashboard'); }
      finally  { setLoading(false); }
    }
    load();
  }, [courseSlug, lessonId]);

  const isCompleted = (lid: number) => progress.some(p => p.lesson_id === lid && p.is_completed);

  const markComplete = async () => {
    if (!lesson) return;
    setMarking(true);
    try {
      await lessonsApi.updateProgress({ lesson_id: lesson.id, is_completed: true, watched_secs: lesson.duration });
      setProgress(prev => {
        const existing = prev.find(p => p.lesson_id === lesson.id);
        if (existing) return prev.map(p => p.lesson_id === lesson.id ? { ...p, is_completed: true } : p);
        return [...prev, { lesson_id: lesson.id, is_completed: true, watched_secs: lesson.duration }];
      });
      toast.success('Lesson marked as complete ✅');
    } catch { toast.error('Failed to update progress'); }
    finally  { setMarking(false); }
  };

  const currentIndex = lessons.findIndex(l => l.id === Number(lessonId));
  const prevLesson   = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson   = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
  if (!lesson || !course) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

      {/* ── Sidebar: lesson list ────────────────────────────────────────── */}
      <div className="lg:col-span-1 order-2 lg:order-1">
        <div className="rounded-xl border bg-white sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <div className="p-4 border-b">
            <Link href={`/courses/${courseSlug}`} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" /> Back to course
            </Link>
            <h3 className="font-semibold text-sm mt-2 line-clamp-2">{course.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {progress.filter(p => p.is_completed).length}/{lessons.length} completed
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${(progress.filter(p => p.is_completed).length / Math.max(lessons.length, 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="divide-y">
            {lessons.map((l, i) => (
              <button
                key={l.id}
                onClick={() => router.push(`/courses/${courseSlug}/lessons/${l.id}`)}
                className={`w-full text-left flex items-start gap-2.5 px-4 py-3 transition-colors hover:bg-muted/50 ${l.id === lesson.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isCompleted(l.id)
                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    : <PlayCircle className={`h-4 w-4 ${l.id === lesson.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  }
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium line-clamp-2 ${l.id === lesson.id ? 'text-primary' : ''}`}>
                    {i + 1}. {l.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDuration(l.duration)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main: lesson content ────────────────────────────────────────── */}
      <div className="lg:col-span-3 order-1 lg:order-2">
        {/* Video player placeholder */}
        {lesson.video_url && (
          <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden mb-6">
            <video
              src={lesson.video_url}
              controls
              className="w-full h-full"
              poster={course.thumbnail_url}
            />
          </div>
        )}

        {!lesson.video_url && (
          <div className="aspect-video bg-gradient-to-br from-primary/10 to-muted rounded-xl flex items-center justify-center mb-6">
            <BookOpen className="h-16 w-16 text-primary/20" />
          </div>
        )}

        {/* Lesson header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{formatDuration(lesson.duration)}</p>
          </div>
          <button
            onClick={markComplete}
            disabled={marking || isCompleted(lesson.id)}
            className={`shrink-0 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isCompleted(lesson.id)
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-primary text-white hover:bg-primary/90 disabled:opacity-60'
            }`}
          >
            {marking
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <CheckCircle2 className="h-4 w-4" />
            }
            {isCompleted(lesson.id) ? 'Completed' : 'Mark Complete'}
          </button>
        </div>

        {/* Lesson content */}
        {lesson.content && (
          <div className="rounded-xl border bg-white p-6 mb-6 lesson-content prose max-w-none">
            <ReactMarkdown>{lesson.content}</ReactMarkdown>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => prevLesson && router.push(`/courses/${courseSlug}/lessons/${prevLesson.id}`)}
            disabled={!prevLesson}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {lessons.length}
          </span>
          <button
            onClick={() => nextLesson && router.push(`/courses/${courseSlug}/lessons/${nextLesson.id}`)}
            disabled={!nextLesson}
            className="flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* AI Tutor floating widget */}
      <AIChatWidget
        courseTitle={course.title}
        courseContext={lesson.content?.slice(0, 1500)}
      />
    </div>
  );
}
