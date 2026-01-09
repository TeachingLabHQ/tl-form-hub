# Local Development Setup Guide

## Prerequisites: Getting Environment Variables

Before you begin, you'll need to obtain the environment configuration files from the current development team.

### Required Environment Files

This project requires **two** environment files:

1. **`.env`** - Root level environment file (for the main application)
2. **`supabase/.env`** - Supabase-specific environment file (for Edge Functions)

### 🔐 How to Get Access

Both environment files are stored securely in onePassword. **Contact the current developer** to request:
- Access credentials to the password-protected storage
- Instructions on where to place each file
- Any additional setup requirements

**Important:** Do not commit these files to version control. They are already included in `.gitignore`.

---

## Setting Up Environment Variables

Once you have received the environment files, follow these setup instructions:

### Root Level Environment File

1. Place the `.env` file in the **root directory** of the project:
   ```
   tl-form-hub/
   ├── .env                 ← Place here
   ├── app/
   ├── supabase/
   └── ...
   ```

2. This file should contain:
   ```bash
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

### Supabase Edge Functions Environment File

Your local Supabase Edge Functions also need environment variables to work properly. Here's how to set them up:

#### Step 1: Place the Supabase Environment File

Place the `supabase/.env` file in the **supabase directory**:
```
tl-form-hub/
├── .env                      ← Root level
├── supabase/
│   ├── .env                 ← Place here
│   ├── functions/
│   └── ...
└── ...
```

#### Step 2: Verify Environment Variables

The `supabase/.env` file should contain:

```bash
# Get your actual API key from: https://resend.com/api-keys
RESEND_API_KEY=re_your_actual_api_key_here

# Optional: Support email
SUPPORT_EMAIL=accountspayable@teachinglab.org
```

**Note:** If you received the file from the development team, these values should already be filled in.

#### Step 3: Restart Supabase

Stop and restart your local Supabase to load the new environment variables:

```bash
supabase stop
supabase start
```

#### Step 4: Test the Function

Now test again:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-vendor-payment-summaries' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
  --header 'Content-Type: application/json'
```

---

## Troubleshooting

### Alternative: Using Supabase CLI Secrets

If you need to manually set secrets, you can use the Supabase CLI:

```bash
# Set the secret
supabase secrets set RESEND_API_KEY=re_your_actual_key_here --env-file supabase/.env

# List all secrets to verify
supabase secrets list
```

### Checking the Error

To see the actual error message when testing locally, check the Supabase logs:

```bash
# In another terminal, watch the function logs
supabase functions serve send-vendor-payment-summaries --debug
```

Or check the Docker logs:

```bash
docker logs supabase_edge_runtime_send-vendor-payment-summaries
```

### Common Issue: Missing RESEND_API_KEY

If you see a 500 error, it's likely because the function code checks for `RESEND_API_KEY` at startup:

```typescript
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set...");
}
```

Without the environment variable set, the function fails to initialize, resulting in a 500 error.

---

## Quick Start Checklist

1. ✅ **Contact current developer** for environment files access
2. ✅ Download both `.env` files (root and supabase)
3. ✅ Place `.env` in the root directory
4. ✅ Place `.env` in the `supabase/` directory
5. ✅ Install dependencies: `npm install`
6. ✅ Start Supabase: `supabase start`
7. ✅ Run migrations: `npm run supa:up`
8. ✅ Start dev server: `npm run dev`
9. ✅ Test the application at `http://localhost:5174`

## Production Deployment

Remember to also update the environment variable in production:

1. Go to Supabase Dashboard
2. **Project Settings** → **Edge Functions** → **Secrets**
3. Update or create `RESEND_API_KEY` with your valid API key
4. Deploy: `supabase functions deploy send-vendor-payment-summaries`

---

## Security Reminder

⚠️ **Never commit environment files to version control!**

Both `.env` files (root and supabase) are already included in `.gitignore`. These files contain sensitive API keys and credentials that must be kept secure.

**Summary:** Always request environment files from the current development team. Both files can be accessed from a single password-protected location. Keep these files secure and never share them publicly.



