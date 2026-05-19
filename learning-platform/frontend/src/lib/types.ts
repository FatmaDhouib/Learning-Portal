export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  avatar?: string;
  bio?: string;
  expertise?: string[];
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

export interface Course {
  id: number;
  title: string;
  slug: string;
  description?: string;
  short_desc?: string;
  category?: Category;
  category_id?: number;
  instructor_id: string;
  instructor_name?: string;
  price: number;
  is_free: boolean;
  is_published: boolean;
  thumbnail_url?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  tags?: string[];
  total_lessons: number;
  total_duration: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: number;
  course_id: number;
  title: string;
  slug: string;
  content?: string;
  video_url?: string;
  duration: number;
  order_index: number;
  is_free: boolean;
}

export interface LessonProgress {
  lesson_id: number;
  is_completed: boolean;
  watched_secs: number;
}

export interface Enrollment {
  id: number;
  user_id: string;
  course_id: number;
  enrolled_at: string;
  is_completed: boolean;
  completed_at?: string;
}

export interface Review {
  id: number;
  user_id: string;
  course_id: number;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface PaginatedCourses {
  total: number;
  page: number;
  page_size: number;
  items: Course[];
}

export interface DashboardStats {
  total_views: number;
  total_enrollments: number;
  total_completions: number;
  enrollments_last_7_days: number;
  top_courses: { course_id: number; enrollments: number }[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
