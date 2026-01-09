# Batch Processing Implementation Guide

## Overview

The `send-vendor-payment-summaries` Edge Function has been updated to implement batch processing with self-invocation to handle large volumes of vendor payment emails without timeout issues.

## What Changed

### 1. **Batch Processing Architecture**
- Processes emails in batches of 15 at a time
- Each batch completes well under the 150-second timeout limit
- Automatically triggers the next batch if more emails remain

### 2. **State Tracking**
- Uses existing `vendor_payment_email_logs` table to track sent emails
- Queries database before processing to filter out already-sent combinations
- **Idempotent**: Safe to run multiple times - won't send duplicates

### 3. **Self-Invocation**
- Function automatically calls itself to process remaining batches
- Only need to trigger once (via cron) - rest is automatic
- Each invocation is independent and logged separately

### 4. **Performance Optimizations**
- Reduced delay between emails from 800ms → 100ms
- Fixed hardcoded date (now uses actual current date)
- Fixed hardcoded email recipient (now sends to actual person's email)

## Key Configuration

```typescript
const BATCH_SIZE = 15; // Process 15 emails per invocation
const SLEEP_DELAY = 100; // 100ms delay between emails
```

**Time per batch**: ~90-110 seconds (well under 150s limit)

## How It Works

### Scenario: 45 emails need to be sent

**Invocation 1** (Triggered by cron):
```
- Queries all submissions for previous month
- Groups by project/person: 45 combinations found
- Queries email logs: 0 already sent
- Processes first 15 emails
- Updates their logs to 'sent'
- Triggers Invocation 2
- Returns response: { processed: 15, remaining: 30 }
```

**Invocation 2** (Auto-triggered):
```
- Queries submissions again
- Queries email logs: 15 already sent (skipped)
- Processes next 15 emails
- Updates their logs to 'sent'
- Triggers Invocation 3
- Returns response: { processed: 15, remaining: 15 }
```

**Invocation 3** (Auto-triggered):
```
- Queries submissions again
- Queries email logs: 30 already sent (skipped)
- Processes final 15 emails
- Updates their logs to 'sent'
- No more emails remaining
- Returns response: { processed: 15, remaining: 0, allComplete: true }
```

## Response Format

### During Processing
```json
{
  "message": "Batch processing completed. Processed: 15, Failed: 0, Remaining: 30.",
  "batchComplete": true,
  "processedInThisBatch": 15,
  "failedInThisBatch": 0,
  "totalAttemptedInThisBatch": 15,
  "remainingAfterBatch": 30,
  "allComplete": false,
  "nextBatchTriggered": true
}
```

### Final Batch
```json
{
  "message": "Batch processing completed. Processed: 15, Failed: 0, Remaining: 0.",
  "batchComplete": true,
  "processedInThisBatch": 15,
  "failedInThisBatch": 0,
  "totalAttemptedInThisBatch": 15,
  "remainingAfterBatch": 0,
  "allComplete": true,
  "nextBatchTriggered": false
}
```

## Testing

### Local Testing (Development)

1. Start Supabase locally:
```bash
supabase start
```

2. Deploy function locally:
```bash
supabase functions serve send-vendor-payment-summaries
```

3. Test with curl:
```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/send-vendor-payment-summaries' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

4. Check logs for:
   - "Processing batch of X emails"
   - "TRIGGERING NEXT BATCH" (if more remain)
   - "ALL EMAILS PROCESSED" (when complete)

### Production Testing

1. Deploy to production:
```bash
supabase functions deploy send-vendor-payment-summaries
```

2. Test with curl (replace with your project URL):
```bash
curl -i --location --request POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-vendor-payment-summaries' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json'
```

3. Monitor in Supabase Dashboard:
   - Go to Edge Functions → send-vendor-payment-summaries
   - Check logs for multiple invocations
   - Verify emails are sent (check `vendor_payment_email_logs` table)

## Monitoring

### Database Queries

Check processing status:
```sql
-- See all sent emails for current month
SELECT project_name, cf_email, status, sent_at
FROM vendor_payment_email_logs
WHERE month = '2024-10-01T00:00:00.000Z' -- Adjust month
  AND status = 'sent'
ORDER BY sent_at DESC;

-- Count by status
SELECT status, COUNT(*) as count
FROM vendor_payment_email_logs
WHERE month = '2024-10-01T00:00:00.000Z'
GROUP BY status;

-- Check for failures
SELECT project_name, cf_email, error_message, created_at
FROM vendor_payment_email_logs
WHERE month = '2024-10-01T00:00:00.000Z'
  AND status = 'failed'
ORDER BY created_at DESC;
```

### Logs to Watch For

**Success indicators:**
- ✅ "Processing batch of X emails"
- ✅ "Email sent successfully"
- ✅ "Log status updated to 'sent'"
- ✅ "ALL EMAILS PROCESSED"

**Warning indicators:**
- ⚠️ "Error creating 'pending' log" (duplicate or constraint issue)
- ⚠️ "Error sending email" (email service issue)
- ⚠️ "Failed to trigger next batch" (self-invocation issue)

**Error indicators:**
- ❌ "Global error" (unhandled exception)
- ❌ "shutdown" with "EarlyDrop" (timeout - shouldn't happen now!)

## Troubleshooting

### Issue: Emails not sent
**Check:**
1. Are submissions in database for previous month?
2. Are email logs showing 'failed' status?
3. Check error_message column in email logs

### Issue: Duplicate emails
**This shouldn't happen!** The system checks existing logs before processing.
If it does happen:
1. Check if constraint was dropped: `SELECT * FROM information_schema.table_constraints WHERE table_name = 'vendor_payment_email_logs'`
2. Verify logs are being created with 'sent' status

### Issue: Self-invocation not working
**Check:**
1. Environment variables set: `SUPABASE_URL` and `SUPABASE_ANON_KEY`
2. Check logs for "Failed to trigger next batch"
3. Manually trigger again if needed (safe - won't send duplicates)

### Issue: Still timing out
**Adjust batch size:**
```typescript
const BATCH_SIZE = 10; // Reduce from 15 to 10
```

## Rollback Plan

If issues occur, you can revert to processing all at once by:

1. Checkout previous version from git
2. Or comment out batch limiting code:
```typescript
// const batch = pendingCombos.slice(0, BATCH_SIZE);
const batch = pendingCombos; // Process all
```

## Maintenance

### Adjusting Batch Size

If processing is too slow:
```typescript
const BATCH_SIZE = 20; // Increase (but watch for timeouts!)
```

If approaching timeout limits:
```typescript
const BATCH_SIZE = 10; // Decrease
```

### Cleaning Up Old Logs

Periodically clean up old logs (optional):
```sql
DELETE FROM vendor_payment_email_logs
WHERE month < NOW() - INTERVAL '6 months';
```

## Cron Schedule

No changes needed! Existing cron job will trigger the function on the 6th of each month, and batch processing handles the rest automatically.

## Support

If you encounter issues:
1. Check Supabase Edge Functions logs
2. Query `vendor_payment_email_logs` table for status
3. Verify environment variables are set correctly
4. Test with a single project first (add filter for testing)

---

**Implementation Date**: October 2024
**Version**: 2.0 (Batch Processing)

