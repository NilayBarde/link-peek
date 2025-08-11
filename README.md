# Link Peek

A SaaS tool that lets you preview any URL in real time, track clicks, and manage link analytics. Built with Next.js, Supabase, Prisma, and Tailwind CSS.

## Features

-   Real-time link previews
-   URL click tracking
-   User authentication with GitHub OAuth (Supabase Auth)
-   Link management dashboard
-   Prisma ORM with Supabase Postgres
-   Tailwind CSS styling
-   API routes for link data

## Tech Stack

-   **Frontend:** Next.js, React, Tailwind CSS
-   **Backend:** Next.js API Routes, Prisma
-   **Database:** Supabase Postgres
-   **Auth:** Supabase Auth with GitHub OAuth
-   **Deployment:** Vercel

## Getting Started

### Prerequisites

-   Node.js 18+
-   npm or yarn
-   Supabase project with Postgres database
-   GitHub OAuth App configured in Supabase

### Environment Variables

Create a `.env.local` file in the root directory:

-   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
-   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
-   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
-   DATABASE_URL=postgresql://user:password@db.xxxxx.supabase.co:5432/postgres
-   GITHUB_CLIENT_ID=your_github_client_id
-   GITHUB_CLIENT_SECRET=your_github_client_secret

### Install Dependencies

npm install

### Database Setup

Generate Prisma client and push schema to the database:
npx prisma generate
npx prisma db push

### Run Locally

This starts the Next.js development server at `http://localhost:3000`.
