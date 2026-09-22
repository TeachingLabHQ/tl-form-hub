# Teaching Lab Form Hub

A centralized form management system for Teaching Lab operations, streamlining time tracking, consultant payments, and project staffing management.

## 🎯 Overview

Teaching Lab Form Hub is a full-stack web application built to consolidate and automate critical operational workflows for Teaching Lab. The platform provides authenticated access to multiple forms and dashboards, integrating with Monday.com for employee data and automating payment summary emails through Supabase Edge Functions.

## ✨ Key Features

### 📋 Weekly Project Log Form
- Submit weekly project hours with detailed time tracking
- Automatic project and role assignment based on budgeted hours
- Executive Assistant support for submitting on behalf of executives
- Real-time total hours calculation
- Pre-populated project assignments from Monday.com

### 💰 Project Consultant Payment Form
- Submit coach/facilitator payment requests with detailed task tracking
- Multi-tier rate support (Tier 1, Tier 2, Tier 3)
- Payment history tracking with monthly summaries
- Support for notes and custom task descriptions
- Automatic total pay calculation
- Date validation to prevent future date submissions

### 📊 Staffing Dashboard
- View program project assignments
- Track budgeted hours per project role
- Insights into work allocation and commitments

### 🔐 Authentication & Security
- Google OAuth integration via Supabase Auth
- Teaching Lab email domain restriction
- Row Level Security (RLS) policies
- Protected routes with session management
- Secure token handling

### 📧 Automated Email Summaries
- Monthly vendor payment summaries generated via Supabase Edge Functions
- Batch processing (15 emails per batch) to respect rate limits
- PDF generation for payment records
- Email tracking and status monitoring
- Automatic retry logic for failed sends

## 🛠 Tech Stack

### Frontend
- **Framework**: [Remix](https://remix.run/) v2.15
- **Language**: TypeScript 5.7
- **UI Libraries**: 
  - [Mantine](https://mantine.dev/) v7.17 (primary UI components)
  - [Chakra UI](https://chakra-ui.com/) v3.2
  - [Tailwind CSS](https://tailwindcss.com/) v3.4
- **Icons**: Tabler Icons React
- **Forms**: Mantine Form hooks
- **Date Handling**: Day.js

### Backend
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Authentication**: Supabase Auth with Google OAuth
- **Edge Functions**: Deno runtime for serverless functions
- **API Integration**: Monday.com GraphQL API
- **Email Service**: Resend API

### Build & Development
- **Build Tool**: Vite v5.4
- **Package Manager**: npm
- **Deployment**: Vercel (via @vercel/remix)
- **Runtime**: Node.js

## 📁 Project Structure

```
tl-form-hub/
├── app/
│   ├── assets/              # Images and static assets
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── navigation/     # Navbar and footer
│   │   ├── vendor-payment-form/
│   │   └── weekly-project-log/
│   ├── domains/            # Domain-driven design modules
│   │   ├── coachFacilitator/
│   │   ├── employee/
│   │   ├── project/
│   │   └── vendor-payment/
│   ├── routes/             # Remix route handlers
│   └── utils/              # Shared utilities
├── supabase/
│   ├── functions/          # Edge functions
│   │   └── send-vendor-payment-summaries/
│   └── migrations/         # Database migrations
├── build/                  # Build output
├── package.json
├── vite.config.js
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI
- Teaching Lab Google Workspace account
- Monday.com API credentials
- Resend API key (for email functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tl-form-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory (The env variables are stored securely in 1Password):
   ```env
   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Monday.com Integration
   MONDAY_API_KEY=your_monday_api_key
   
   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Set up Supabase locally**
   ```bash
   npm run supa:start
   ```

5. **Run database migrations**
   ```bash
   npm run supa:up
   ```

6. **Generate TypeScript types from database**
   ```bash
   npm run supa:gen
   ```

7. **Configure Edge Function environment variables**
   
   Create `supabase/.env` (The env variables are stored securely in 1Password):
   ```bash
   RESEND_API_KEY=re_your_actual_api_key_here
   SUPPORT_EMAIL=accountspayable@teachinglab.org
   ```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5174`

### Building for Production

```bash
npm run build
```

## 📚 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 5174 |
| `npm run build` | Build production bundle |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run supa:start` | Start local Supabase instance |
| `npm run supa:stop` | Stop local Supabase instance |
| `npm run supa:up` | Run pending database migrations |
| `npm run supa:down` | Rollback last migration |
| `npm run supa:new` | Create new migration file |
| `npm run supa:gen` | Generate TypeScript types from database schema |
| `npm run supa:reset` | Reset local database |
| `npm run supa:status` | Check migration status |

## 🗄 Database Schema

### Main Tables

- **`vendor_payment_submissions`** - Payment submission records
- **`vendor_payment_entries`** - Individual payment line items
- **`vendor_payment_email_logs`** - Email delivery tracking
- **`weekly_project_logs`** - Time tracking submissions

See `supabase/migrations/` for detailed schema definitions.

## 🔧 Configuration

### Supabase Edge Functions

The project includes automated email functionality via Supabase Edge Functions:

- **Function**: `send-vendor-payment-summaries`
- **Trigger**: Monthly cron job (3rd of each month)
- **Batch Size**: 15 emails per invocation
- **Rate Limiting**: 600ms delay between emails

To deploy edge functions:
```bash
supabase functions deploy send-vendor-payment-summaries
```

### Authentication

Google OAuth is configured to only accept Teaching Lab email addresses (`@teachinglab.org`). Authentication state is managed via Supabase Auth and React Context.

## 📖 Domain-Driven Design

The application follows domain-driven design principles with clear separation:

- **Model**: Data structures and types
- **Repository**: Data access layer
- **Service**: Business logic layer
- **Utils**: Domain-specific utilities

Each domain (employee, project, vendor-payment, etc.) is self-contained.

## 🔒 Security

- **Row Level Security (RLS)**: All Supabase tables have RLS policies
- **Protected Routes**: Authentication required for all forms and dashboards
- **Email Validation**: Domain-restricted authentication
- **CORS Configuration**: Properly configured for OAuth flows
- **Environment Variables**: Sensitive data stored securely

## 🧪 Testing

The application includes testing infrastructure for browser-based testing and form validation. See individual component files for validation logic.

## 🗂 Coach Log Question Spec

### How the coach log spec works

The coach log form's questions and logic are specified in a Google Sheet, [Coaching Log — Question Spec (FY27)](https://docs.google.com/spreadsheets/d/1R-0ysOEsBjxcuDzNzwEXVN9_DamNSJaLo4VbpoNoM1M/edit). It replaces the prose FY27 Coaching Log doc as the source of truth. Stakeholders edit it and file requests on its **Change requests** tab.

- **Questions** has one row per question: its ID (the form field), text, type, required flag, max selections, Monday column and a **Shows when** rule (e.g. `nycCoachType = "Reads Coach" AND district in ["NY_D9", "NY_D75"]`). Column M shows each rule in plain English. Column N checks each rule and flags unknown IDs, later questions, bad options and syntax errors.
- **Options** lists the options for each select, in order, with the exclusive, write-in and link flags.
- **Discrepancies** records where the old doc and the live form disagree, with a decision for each.
- **Changelog** has one row per released spec version.

`Rscript scripts/spec/export_spec.R` exports the sheet to `app/components/coach-log/spec/coach-log.spec.json`. It's read-only on Google, uses cached OAuth (set `GOOGLE_AUTH_EMAIL` to use another account) and refuses to write if anything in the sheet is invalid. The JSON's `specVersion` is the last Changelog row.

For now the form doesn't read the JSON. The tests in `app/components/coach-log/spec/*.test.ts` and `app/routes/api.coach-log.submit.spec.test.ts` fail when the JSON and the code disagree. They check options, max selections, exclusive options, write-ins and links against `constants.ts`. They check show-if and required against the form's validators. They also run the real submit route over shown and hidden scenarios to confirm shown answers land in the spec's Monday column and hidden ones are never written. They need no network and no R.

`Rscript scripts/spec/check_monday_columns.R` (not in CI; it needs `MONDAY_API_KEY`) confirms that every column the spec names exists on the live Coach Log board and its subitems board.

### How to apply a change request

1. Read the **accepted** rows on the Change requests tab.
2. Edit the Questions/Options tabs. Column N must show ✅ on every row.
3. Add a Changelog row with the next version, and set the requests' status to "in PR".
4. Run `Rscript scripts/spec/export_spec.R`. The JSON diff shows the spec change.
5. Update the form code (`constants.ts`, the question components, `use-coach-log-form.ts`, `build-submission.ts`, `api.coach-log.submit.tsx`) until `npm test` passes. If a Monday column changed, run `check_monday_columns.R`.
6. Open a PR with the JSON and the code.
7. After merging, set the requests to "live" with the PR link and version. Fill the Changelog row's PR link, and name the version in the sheet's **File → Version history** (the API can't do this).

## 📝 Additional Documentation

- [Local Development Setup](./LOCAL_DEV_SETUP.md) - Detailed local setup guide
- [Batch Processing Guide](./supabase/functions/send-vendor-payment-summaries/BATCH_PROCESSING_GUIDE.md)
- [Plan docs](./plan/) - migration plans, refactor notes, and review docs

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run type checking: `npm run typecheck`
4. Test locally with Supabase
5. Submit a pull request

## 📄 License

ISC

## 👥 Support

For issues or questions, contact the Teaching Lab operations team.

---

**Built with ❤️ for Teaching Lab**
