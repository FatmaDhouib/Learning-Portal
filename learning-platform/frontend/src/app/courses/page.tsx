'use client';

import { useState, useEffect, useCallback } from 'react';
import { coursesApi, categoriesApi } from '@/lib/api';
import CourseCard from '@/components/CourseCard';
import { Course, Category, PaginatedCourses } from '@/lib/types';
import { Search, Filter, BookOpen, Loader2 } from 'lucide-react';

const LEVELS = ['', 'beginner', 'intermediate', 'advanced'];

export default function CoursesPage() {
  const [courses, setCourses]       = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel]     = useState('');
  const [isFree, setIsFree]   = useState<string>('');

  const pageSize = 9;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (search)   params.search   = search;
      if (category) params.category = category;
      if (level)    params.level    = level;
      if (isFree !== '') params.is_free = isFree === 'true';

      const res = await coursesApi.list(params);
      const data: PaginatedCourses = res.data;
      setCourses(data.items);
      setTotal(data.total);
    } catch { setCourses([]); }
    finally  { setLoading(false); }
  }, [page, search, category, level, isFree]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Course Catalogue</h1>
        <p className="text-muted-foreground">{total} courses available</p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border bg-white text-sm outline-none focus:ring-2 ring-primary/30"
          />
        </div>

        {/* Category */}
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(1); }}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Level */}
        <select
          value={level}
          onChange={e => { setLevel(e.target.value); setPage(1); }}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30"
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Price */}
        <select
          value={isFree}
          onChange={e => { setIsFree(e.target.value); setPage(1); }}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30"
        >
          <option value="">All Prices</option>
          <option value="true">Free</option>
          <option value="false">Paid</option>
        </select>
      </div>

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No courses found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {courses.map(course => <CourseCard key={course.id} course={course} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    p === page ? 'bg-primary text-white' : 'border hover:bg-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
