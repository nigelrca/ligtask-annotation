# LIGTask - Linguistic Verification and Safety Annotation Platform

A web application for linguistic verification and contextual safety evaluation of bilingual (English-Filipino) prompts.

## Features

- **User Management**: Admin-provisioned accounts with role-based access (Admin, Translator, Annotator)
- **Translation Mode**: Linguistic verification of Filipino translations with revision capabilities
- **Annotation Mode**: Contextual safety evaluation with task-specific classification options
  - NLU (Natural Language Understanding): Safe/Unsafe
  - NLR (Natural Language Reasoning): Violates Policy/Does not Violate Policy
  - NLG (Natural Language Generation): Answer/Refuse
- **Progress Tracking**: Real-time progress indicators and navigation controls
- **Admin Dashboard**: User management, prompt management, and results analysis

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js Server Actions / API Routes
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ligtask-annotation
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database:
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor
   - Run the SQL script from `database/schema.sql`

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                      # Next.js app directory
│   ├── page.tsx             # Home page
│   ├── login/               # Login page
│   ├── translate/           # Translation mode
│   ├── annotate/            # Annotation mode
│   └── admin/               # Admin dashboard
├── types/                   # TypeScript type definitions
│   └── database.ts          # Database types
├── lib/                     # Utility functions
│   ├── supabase.ts         # Supabase client
│   └── dummy-data.ts       # Dummy data for development
└── database/               # Database schema
    └── schema.sql          # PostgreSQL schema
```

## Current Status

This is a foundational implementation with:
- ✅ Basic UI structure for all main pages
- ✅ Type definitions for database models
- ✅ Dummy data for development and testing
- ✅ Navigation and routing setup
- ⏳ Authentication (placeholder, needs Supabase integration)
- ⏳ Database operations (needs server actions)
- ⏳ User management (admin features)
- ⏳ Results export and analytics

## Next Steps

1. **Supabase Setup**:
   - Create a Supabase project
   - Run the database schema
   - Configure authentication settings
   - Disable public sign-ups

2. **Implement Authentication**:
   - Integrate Supabase Auth in login page
   - Add protected routes and middleware
   - Implement role-based access control

3. **Database Operations**:
   - Create server actions for CRUD operations
   - Implement evaluation submissions
   - Add assignment management

4. **Admin Features**:
   - User creation and management
   - Dataset upload functionality
   - Results export

5. **Testing & Deployment**:
   - Test with real users
   - Deploy to Vercel
   - Configure production environment

## Database Schema

The application uses four main tables:
- `users`: User accounts with roles and status
- `prompts`: Dataset prompts with context information
- `assignments`: User-prompt assignments with status tracking
- `evaluations`: User evaluations (translations or safety labels)

See `database/schema.sql` for the complete schema.

## Contributing

This is a research project. For questions or issues, please contact the project administrator.

## License

[Specify your license here]
