# LearnHub Architecture Diagrams

This document contains the C4 Model and UML diagrams for the LearnHub platform, as requested for the project deliverables. 
You can view these diagrams on GitHub or in any Markdown editor that supports Mermaid.js.

## 1. C4 Model Diagrams

### Level 1: Context Diagram
*This diagram shows the system in its environment, highlighting external actors and systems.*

```mermaid
C4Context
    title System Context diagram for LearnHub
    
    Person(student, "Student", "A user of the platform who browses, enrolls, and takes courses.")
    Person(instructor, "Instructor", "A user who creates courses and manages content.")
    Person(admin, "Admin", "Manages the platform, views analytics and handles feedback alerts.")
    
    System(learnhub, "LearnHub Platform", "Allows students to take courses, interact with an AI tutor, and provide feedback.")
    
    System_Ext(ollama, "Local LLM (Ollama)", "Provides AI capabilities for the tutor and feedback summarization.")
    System_Ext(smtp, "SMTP Server", "Delivers email notifications for negative feedback.")
    
    Rel(student, learnhub, "Browses courses, enrolls, studies, asks questions")
    Rel(instructor, learnhub, "Creates and updates courses")
    Rel(admin, learnhub, "Views analytics, manages users")
    
    Rel(learnhub, ollama, "Sends prompts, retrieves answers/summaries")
    Rel(learnhub, smtp, "Sends email alerts using")
    Rel(smtp, admin, "Delivers alerts to")
```

### Level 2: Container Diagram
*This diagram breaks down the LearnHub system into its constituent containers (microservices, datastores, etc).*

```mermaid
C4Container
    title Container diagram for LearnHub

    Person(student, "Student", "Learns via the platform")
    
    System_Boundary(c1, "LearnHub") {
        Container(gateway, "API Gateway", "Nginx", "Reverse proxy and routing")
        Container(frontend, "Learning Portal", "Next.js 14", "Provides the user interface")
        
        Container(course_svc, "Course Service", "FastAPI", "Manages courses, lessons, enrollments")
        Container(user_svc, "User Service", "Node.js/Express", "Manages auth and profiles")
        Container(analytics_svc, "Analytics Service", "FastAPI", "Tracks views and metrics")
        Container(ai_svc, "AI Tutor Service", "FastAPI", "Manages Q&A, quizzes and feedback analysis")
        Container(n8n, "n8n Automation", "n8n", "Processes feedback workflows")
        
        ContainerDb(postgres, "Relational DB", "PostgreSQL", "Stores courses, analytics, feedback")
        ContainerDb(mongo, "Document DB", "MongoDB", "Stores users and roles")
        ContainerDb(redis, "Cache", "Redis", "Caches courses, sessions, JWT blacklist")
        ContainerDb(minio, "Object Storage", "MinIO", "Stores videos and thumbnails")
    }
    
    System_Ext(ollama, "Local LLM (Ollama)", "Provides AI responses")
    System_Ext(smtp, "SMTP Server", "Sends emails")

    Rel(student, gateway, "Visits", "HTTPS")
    Rel(gateway, frontend, "Routes to")
    Rel(gateway, course_svc, "Routes /api/courses to")
    Rel(gateway, user_svc, "Routes /api/users to")
    Rel(gateway, analytics_svc, "Routes /api/analytics to")
    Rel(gateway, ai_svc, "Routes /api/ai to")
    
    Rel(frontend, gateway, "Makes API calls to")
    
    Rel(course_svc, postgres, "Reads/Writes")
    Rel(course_svc, redis, "Reads/Writes")
    Rel(course_svc, minio, "Reads/Writes")
    
    Rel(user_svc, mongo, "Reads/Writes")
    Rel(user_svc, redis, "Reads/Writes")
    
    Rel(analytics_svc, postgres, "Reads/Writes")
    Rel(analytics_svc, redis, "Reads/Writes")
    
    Rel(ai_svc, redis, "Reads/Writes session state")
    Rel(ai_svc, ollama, "Prompts / Generates", "HTTP")
    
    Rel(frontend, n8n, "Submits feedback via webhook", "HTTP POST")
    Rel(n8n, ai_svc, "Requests feedback summary", "HTTP POST")
    Rel(n8n, postgres, "Saves feedback to", "SQL")
    Rel(n8n, smtp, "Sends alert via", "SMTP")
```

### Level 3: Component Diagram (Course Service)
*This diagram zooms into the Course Service to show its internal structure.*

```mermaid
C4Component
    title Component diagram for Course Service

    Container(gateway, "API Gateway", "Nginx", "Reverse proxy")
    
    Container_Boundary(course_svc, "Course Service") {
        Component(router_courses, "Courses Router", "FastAPI Router", "Handles /courses endpoints")
        Component(router_lessons, "Lessons Router", "FastAPI Router", "Handles /lessons endpoints")
        Component(auth_mid, "Auth Dependency", "FastAPI Depends", "Decodes JWTs")
        Component(service_logic, "Business Logic", "Python", "Implements CRUD and validation")
        Component(db_session, "DB Session", "SQLAlchemy", "Manages transactions")
        Component(redis_client, "Redis Client", "Redis-py", "Handles caching")
    }
    
    ContainerDb(postgres, "Relational DB", "PostgreSQL", "Stores courses data")
    ContainerDb(redis, "Cache", "Redis", "Caches courses lists")

    Rel(gateway, router_courses, "Routes requests to")
    Rel(gateway, router_lessons, "Routes requests to")
    
    Rel(router_courses, auth_mid, "Uses")
    Rel(router_lessons, auth_mid, "Uses")
    
    Rel(router_courses, service_logic, "Calls")
    Rel(router_lessons, service_logic, "Calls")
    
    Rel(service_logic, db_session, "Uses")
    Rel(service_logic, redis_client, "Uses")
    
    Rel(db_session, postgres, "Reads/Writes", "SQL")
    Rel(redis_client, redis, "Reads/Writes", "Redis Protocol")
```

---

## 2. UML Diagrams

### Use Case Diagram
*Represents the interactions between the users (actors) and the platform.*

```mermaid
usecaseDiagram
    actor Student
    actor Instructor
    actor Admin

    package LearnHub {
        usecase "Browse Courses" as UC1
        usecase "Enroll in Course" as UC2
        usecase "Watch Lesson" as UC3
        usecase "Ask AI Tutor" as UC4
        usecase "Submit Feedback" as UC5
        
        usecase "Create Course" as UC6
        usecase "Manage Lessons" as UC7
        
        usecase "View Analytics" as UC8
        usecase "Manage Users" as UC9
    }

    Student --> UC1
    Student --> UC2
    Student --> UC3
    Student --> UC4
    Student --> UC5
    
    Instructor --> UC1
    Instructor --> UC6
    Instructor --> UC7
    
    Admin --> UC8
    Admin --> UC9
```

### Class Diagram
*Shows the main entities in the system and their relationships.*

```mermaid
classDiagram
    class User {
        +UUID id
        +String name
        +String email
        +String passwordHash
        +String role
        +login()
        +updateProfile()
    }

    class Course {
        +Int id
        +String title
        +String description
        +Float price
        +UUID instructorId
        +publish()
    }

    class Lesson {
        +Int id
        +Int courseId
        +String title
        +String videoUrl
        +Int order
    }

    class Enrollment {
        +UUID userId
        +Int courseId
        +Date enrolledAt
        +Float progress
    }

    class Feedback {
        +Int id
        +UUID userId
        +Int courseId
        +String text
        +String sentiment
        +String aiSummary
    }

    User "1" -- "*" Enrollment : has
    Course "1" -- "*" Enrollment : includes
    User "1" -- "*" Course : teaches
    Course "1" *-- "*" Lesson : contains
    User "1" -- "*" Feedback : submits
    Course "1" -- "*" Feedback : receives
```

### Sequence Diagram
*Illustrates the feedback submission and automation flow.*

```mermaid
sequenceDiagram
    participant S as Student
    participant F as Frontend
    participant N as n8n Webhook
    participant AI as AI Tutor Service
    participant LLM as Ollama (Local)
    participant DB as PostgreSQL
    participant E as SMTP / Admin

    S->>F: Submits feedback form
    F->>N: POST /feedback
    activate N
    N->>AI: POST /analyze-feedback
    activate AI
    AI->>LLM: Prompt: Analyze sentiment & summarize
    activate LLM
    LLM-->>AI: JSON (sentiment, summary)
    deactivate LLM
    AI-->>N: Returns JSON analysis
    deactivate AI
    
    N->>DB: INSERT feedback + summary
    
    alt sentiment is negative
        N->>E: Send Email Alert
    end
    
    N-->>F: HTTP 200 OK
    deactivate N
    F-->>S: Shows success message
```

### Deployment Diagram
*Shows how the Docker containers are deployed and networked.*

```mermaid
graph TD
    subgraph "Docker Host"
        subgraph "Frontend Network"
            NGINX[API Gateway :80]
            FRONTEND[Next.js :3000]
        </subgraph>
        
        subgraph "Backend Network"
            COURSE_SVC[Course Service :8001]
            USER_SVC[User Service :8002]
            ANALYTICS_SVC[Analytics Service :8003]
            AI_SVC[AI Tutor Service :8004]
            N8N[n8n Automation :5678]
            
            POSTGRES[(PostgreSQL :5432)]
            MONGO[(MongoDB :27017)]
            REDIS[(Redis :6379)]
            MINIO[(MinIO :9000)]
            OLLAMA[(Ollama :11434)]
        </subgraph>
        
        NGINX -->|/| FRONTEND
        NGINX -->|/api/courses| COURSE_SVC
        NGINX -->|/api/users| USER_SVC
        NGINX -->|/api/analytics| ANALYTICS_SVC
        NGINX -->|/api/ai| AI_SVC
        
        COURSE_SVC --> POSTGRES
        COURSE_SVC --> REDIS
        COURSE_SVC --> MINIO
        
        USER_SVC --> MONGO
        USER_SVC --> REDIS
        
        ANALYTICS_SVC --> POSTGRES
        ANALYTICS_SVC --> REDIS
        
        AI_SVC --> REDIS
        AI_SVC --> OLLAMA
        
        N8N --> POSTGRES
        N8N --> AI_SVC
    end
    
    Internet((Internet)) -->|HTTP/HTTPS| NGINX
```
