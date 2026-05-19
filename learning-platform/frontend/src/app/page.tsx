import Link from 'next/link';
import { coursesApi, categoriesApi } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import { ArrowRight, BookOpen, Users, Zap, Shield } from 'lucide-react';

async function getFeaturedCourses() {
  try {
    const res = await coursesApi.list({ page: 1, page_size: 6 });
    return res.data.items ?? [];
  } catch { return []; }
}

async function getCategories() {
  try {
    const res = await categoriesApi.list();
    return res.data ?? [];
  } catch { return []; }
}

const STATS = [
  { icon: BookOpen, label: 'Courses',  value: '50+' },
  { icon: Users,    label: 'Learners', value: '2K+' },
  { icon: Zap,      label: 'AI-Powered', value: '24/7' },
  { icon: Shield,   label: 'Free Courses', value: '20+' },
];

export default async function HomePage() {
  const [courses, categories] = await Promise.all([getFeaturedCourses(), getCategories()]);

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary/90 to-slate-900 text-white py-24 px-4">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-block rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium mb-6">
            🤖 AI-Powered Learning Platform
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Learn Smarter with<br />
            <span className="text-amber-400">Expert Courses</span> + AI
          </h1>
          <p className="text-lg sm:text-xl text-white/75 max-w-2xl mx-auto mb-10">
            Explore free and premium courses in DevOps, Web Development, Data Science and more.
            Your personal AI tutor is available 24/7 to answer questions and generate quizzes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-primary font-bold px-7 py-3.5 hover:bg-white/90 transition-all shadow-lg"
            >
              Browse Courses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 text-white font-bold px-7 py-3.5 hover:bg-white/10 transition-all"
            >
              Start for Free
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-extrabold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat: any) => (
              <Link
                key={cat.id}
                href={`/courses?category=${cat.id}`}
                className="rounded-full border px-5 py-2 text-sm font-medium hover:bg-primary hover:text-white hover:border-primary transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Courses ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Featured Courses</h2>
          <Link href="/courses" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {courses.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No courses available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>

      {/* ── AI Banner ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-primary/10 to-primary/5 border-t border-b">
        <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">AI-Powered</span>
            <h2 className="text-3xl font-extrabold mb-3">Your Personal AI Tutor, Always On</h2>
            <p className="text-muted-foreground mb-6">
              Stuck on a concept? Ask your AI tutor anything. It understands your course context,
              generates custom quizzes, and recommends your next steps — powered by Groq's
              blazing-fast llama-3.3-70b model.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white font-bold px-6 py-3 hover:bg-primary/90 transition-all"
            >
              Try it free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="hidden md:flex h-48 w-48 rounded-2xl bg-primary/10 items-center justify-center shrink-0">
            <Zap className="h-24 w-24 text-primary/40" />
          </div>
        </div>
      </section>
    </div>
  );
}
