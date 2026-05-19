-- ============================================================
-- Learning Platform – PostgreSQL Initialization
-- ============================================================

-- Create dedicated schema for n8n so it doesn't collide with app tables
CREATE SCHEMA IF NOT EXISTS n8n;

-- ============================================================
-- COURSE SERVICE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS courses (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    short_desc      VARCHAR(500),
    category_id     INT REFERENCES categories(id) ON DELETE SET NULL,
    instructor_id   VARCHAR(100) NOT NULL,       -- Mongo user _id
    instructor_name VARCHAR(150),
    price           NUMERIC(10, 2) DEFAULT 0.00,
    is_free         BOOLEAN DEFAULT TRUE,
    is_published    BOOLEAN DEFAULT FALSE,
    thumbnail_url   TEXT,
    level           VARCHAR(50) DEFAULT 'beginner',  -- beginner/intermediate/advanced
    language        VARCHAR(10) DEFAULT 'en',
    tags            TEXT[],
    total_lessons   INT DEFAULT 0,
    total_duration  INT DEFAULT 0,   -- seconds
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lessons (
    id          SERIAL PRIMARY KEY,
    course_id   INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    content     TEXT,
    video_url   TEXT,
    duration    INT DEFAULT 0,       -- seconds
    order_index INT NOT NULL DEFAULT 0,
    is_free     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, slug)
);

CREATE TABLE IF NOT EXISTS enrollments (
    id           SERIAL PRIMARY KEY,
    user_id      VARCHAR(100) NOT NULL,  -- Mongo user _id
    course_id    INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at  TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
    id           SERIAL PRIMARY KEY,
    user_id      VARCHAR(100) NOT NULL,
    lesson_id    INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    course_id    INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    watched_secs INT DEFAULT 0,
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id         SERIAL PRIMARY KEY,
    user_id    VARCHAR(100) NOT NULL,
    course_id  INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- ============================================================
-- ANALYTICS SERVICE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS view_events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    VARCHAR(100),
    course_id  INT,
    lesson_id  INT,
    event_type VARCHAR(50) NOT NULL,   -- 'course_view' | 'lesson_view'
    metadata   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollment_events (
    id         BIGSERIAL PRIMARY KEY,
    user_id    VARCHAR(100) NOT NULL,
    course_id  INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,   -- 'enroll' | 'complete'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK TABLE (written by n8n after processing)
-- ============================================================

CREATE TABLE IF NOT EXISTS feedbacks (
    id           SERIAL PRIMARY KEY,
    user_id      VARCHAR(100),
    course_id    INT,
    raw_text     TEXT NOT NULL,
    sentiment    VARCHAR(20),          -- positive / neutral / negative
    ai_summary   TEXT,
    notified     BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_courses_category    ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor  ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published   ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_course      ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user    ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user       ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_views_course        ON view_events(course_id);
CREATE INDEX IF NOT EXISTS idx_views_created       ON view_events(created_at);

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO categories (name, slug, description) VALUES
  ('Web Development',    'web-development',    'HTML, CSS, JavaScript, React, Next.js and more'),
  ('DevOps & Cloud',     'devops-cloud',       'Docker, Kubernetes, CI/CD, AWS, GCP, Azure'),
  ('Data Science',       'data-science',       'Python, pandas, ML, deep learning, statistics'),
  ('Cybersecurity',      'cybersecurity',      'Network security, ethical hacking, cryptography'),
  ('Mobile Development', 'mobile-development', 'iOS, Android, React Native, Flutter')
ON CONFLICT DO NOTHING;

INSERT INTO courses (title, slug, description, short_desc, category_id, instructor_id, instructor_name, price, is_free, is_published, level, tags, total_lessons, total_duration) VALUES
  ('Docker & Docker Compose Masterclass', 'docker-compose-masterclass',
   'Learn Docker from scratch — containers, images, volumes, networks, and multi-service apps with Docker Compose. Includes real-world projects.', 
   'Master Docker and Docker Compose for modern DevOps workflows.',
   2, 'seed-instructor-01', 'Alice Martin', 0.00, TRUE, TRUE, 'beginner',
   ARRAY['docker','devops','containers','cloud'], 12, 21600),

  ('Next.js 14 Full-Stack Development', 'nextjs-14-fullstack',
   'Build production-ready full-stack applications with Next.js 14 App Router, Server Components, API Routes, and Tailwind CSS.',
   'Modern full-stack React with the latest Next.js 14 features.',
   1, 'seed-instructor-02', 'Bob Chen', 29.99, FALSE, TRUE, 'intermediate',
   ARRAY['react','nextjs','javascript','fullstack'], 18, 32400),

  ('Python for Data Science', 'python-data-science',
   'Comprehensive Python course covering NumPy, Pandas, Matplotlib, Scikit-learn, and real-world ML projects.',
   'From Python basics to machine learning in one course.',
   3, 'seed-instructor-01', 'Alice Martin', 19.99, FALSE, TRUE, 'beginner',
   ARRAY['python','data-science','ml','pandas'], 20, 36000),

  ('Kubernetes for Developers', 'kubernetes-developers',
   'Deploy, scale and manage containerized applications with Kubernetes. Covers pods, services, deployments, Helm charts, and monitoring.',
   'Production Kubernetes: from basics to Helm and monitoring.',
   2, 'seed-instructor-02', 'Bob Chen', 39.99, FALSE, TRUE, 'advanced',
   ARRAY['kubernetes','k8s','devops','cloud','docker'], 15, 27000),

  ('Ethical Hacking Fundamentals', 'ethical-hacking-fundamentals',
   'Learn penetration testing concepts, common attack vectors, and how to defend systems. Includes hands-on labs.',
   'Start your cybersecurity journey with ethical hacking basics.',
   4, 'seed-instructor-03', 'Carla Santos', 0.00, TRUE, TRUE, 'beginner',
   ARRAY['security','hacking','network','ctf'], 10, 18000)
ON CONFLICT DO NOTHING;

INSERT INTO lessons (course_id, title, slug, content, duration, order_index, is_free) VALUES
  (1, 'What is Docker and Why Use It?', 'what-is-docker', 'Docker is an open platform for developing, shipping, and running applications inside containers. Containers allow you to package your application along with all its dependencies into a standardized unit...', 900, 1, TRUE),
  (1, 'Installing Docker Desktop', 'installing-docker', 'In this lesson we cover installing Docker Desktop on Windows, macOS, and Linux (Ubuntu). We also configure Docker settings for optimal performance...', 720, 2, TRUE),
  (1, 'Your First Container: Hello World', 'first-container', 'Run your first Docker container using the hello-world image, then explore basic commands: docker run, docker ps, docker images, docker stop, docker rm...', 1200, 3, TRUE),
  (1, 'Building Custom Images with Dockerfile', 'dockerfile-basics', 'A Dockerfile is a text file with instructions to build a Docker image. Learn FROM, RUN, COPY, WORKDIR, EXPOSE, CMD and ENV directives...', 1800, 4, FALSE),
  (1, 'Docker Volumes and Persistent Storage', 'docker-volumes', 'By default, data inside containers is ephemeral. Docker volumes allow you to persist data beyond the container lifecycle. Learn named volumes, bind mounts, and tmpfs...', 1500, 5, FALSE),

  (2, 'Next.js 14 App Router Overview', 'app-router-overview', 'Next.js 14 introduces the App Router built on React Server Components. Learn the difference between Server and Client Components, layout.tsx, and the new file conventions...', 1200, 1, TRUE),
  (2, 'Creating Your First Next.js 14 App', 'create-nextjs-app', 'Scaffold a new Next.js 14 project using create-next-app with TypeScript and Tailwind CSS. Explore the project structure and understand each directory...', 900, 2, TRUE),
  (2, 'Server Components vs Client Components', 'server-vs-client', 'Understand when to use "use client" directive. Server components run on the server and reduce client bundle size. Client components handle interactivity and browser APIs...', 1800, 3, FALSE),

  (3, 'Python Basics Review', 'python-basics', 'Quick review of Python fundamentals: variables, data types, control flow, functions, and list comprehensions. Perfect for refreshing your knowledge...', 1800, 1, TRUE),
  (3, 'NumPy Arrays and Operations', 'numpy-arrays', 'NumPy is the foundation of data science in Python. Learn ndarray creation, indexing, slicing, broadcasting, and vectorized operations...', 2400, 2, TRUE),
  (3, 'Pandas DataFrames', 'pandas-dataframes', 'Pandas provides powerful data structures. Learn Series, DataFrame creation, reading CSV/JSON, filtering, groupby, merging, and handling missing values...', 2700, 3, FALSE)
ON CONFLICT DO NOTHING;
