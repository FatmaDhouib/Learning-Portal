/**
 * Centralised Axios API client.
 * Automatically attaches JWT from localStorage and handles 401 redirects.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─────────────────────────────────────────
// Typed service helpers
// ─────────────────────────────────────────

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string; role?: string }) =>
    api.post('/users/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/users/auth/login', data),
  me: () => api.get('/users/auth/me'),
  logout: () => api.post('/users/auth/logout'),
};

// Courses
export const coursesApi = {
  list: (params?: Record<string, unknown>) => api.get('/courses/courses', { params }),
  get: (id: number) => api.get(`/courses/courses/${id}`),
  getBySlug: (slug: string) => api.get(`/courses/courses/slug/${slug}`),
  create: (data: unknown) => api.post('/courses/courses', data),
  update: (id: number, data: unknown) => api.patch(`/courses/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/courses/${id}`),
  getReviews: (id: number) => api.get(`/courses/courses/${id}/reviews`),
  addReview: (id: number, data: { rating: number; comment?: string }) =>
    api.post(`/courses/courses/${id}/reviews`, data),
};

// Lessons
export const lessonsApi = {
  getByCourse: (courseId: number) => api.get(`/courses/lessons/course/${courseId}`),
  get: (id: number) => api.get(`/courses/lessons/${id}`),
  updateProgress: (data: { lesson_id: number; is_completed: boolean; watched_secs: number }) =>
    api.post('/courses/lessons/progress', data),
  getCourseProgress: (courseId: number) => api.get(`/courses/lessons/progress/${courseId}`),
};

// Enrollments
export const enrollmentsApi = {
  enroll: (courseId: number) => api.post(`/courses/enrollments/${courseId}`),
  unenroll: (courseId: number) => api.delete(`/courses/enrollments/${courseId}`),
  myEnrollments: () => api.get('/courses/enrollments/my'),
  checkEnrollment: (courseId: number) => api.get(`/courses/enrollments/check/${courseId}`),
};

// Categories
export const categoriesApi = {
  list: () => api.get('/courses/categories'),
};

// Analytics
export const analyticsApi = {
  dashboard: () => api.get('/analytics/dashboard'),
  enrollmentTrends: (days?: number) => api.get('/analytics/trends/enrollments', { params: { days } }),
  viewTrends: (days?: number) => api.get('/analytics/trends/views', { params: { days } }),
  trackView: (data: { course_id?: number; lesson_id?: number; event_type?: string }) =>
    api.post('/analytics/track/view', data),
  trackEnrollment: (data: { course_id: number; event_type?: string }) =>
    api.post('/analytics/track/enrollment', data),
};

// AI Tutor
export const aiApi = {
  ask: (data: { question: string; session_id?: string; course_context?: string }) =>
    api.post('/ai/ask', data),
  quiz: (data: { topic: string; num_questions?: number }) =>
    api.post('/ai/quiz', data),
  recommend: (data: { interests: string; completed_topics?: string[] }) =>
    api.post('/ai/recommend', data),
  clearSession: (session_id: string) =>
    api.post('/ai/session/clear', { session_id }),
};

// Feedback (n8n webhook)
export const feedbackApi = {
  submit: (data: { feedback_text: string; course_id?: number; user_id?: string }) =>
    axios.post('http://localhost:5678/webhook/feedback', data),
};
