import Link from 'next/link';
import { Course } from '@/lib/types';
import { formatDuration, formatPrice } from '@/lib/utils';
import { Clock, BookOpen, BarChart2 } from 'lucide-react';

const LEVEL_COLORS: Record<string, string> = {
  beginner:     'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100  text-amber-700',
  advanced:     'bg-rose-100   text-rose-700',
};

export default function CourseCard({ course }: { course: Course }) {
  return (
    <Link href={`/courses/${course.slug}`}>
      <div className="group rounded-xl border bg-card hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
        {/* Thumbnail */}
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${LEVEL_COLORS[course.level] || 'bg-muted text-muted-foreground'}`}>
              {course.level}
            </span>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${course.is_free ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
              {formatPrice(course.price, course.is_free)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          {course.category && (
            <p className="text-xs font-medium text-primary mb-1">{course.category.name}</p>
          )}
          <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.short_desc && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{course.short_desc}</p>
          )}

          <div className="mt-auto pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {course.total_lessons} lessons
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(course.total_duration)}
            </span>
          </div>
          {course.instructor_name && (
            <p className="text-xs text-muted-foreground mt-2">by {course.instructor_name}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
