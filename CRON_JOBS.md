# Cron Job System Documentation

This document explains the cron job system implemented in the Aarath backend.

## Overview

The cron job system automatically handles various background tasks including:

- Auction management (expiry checks, statistics updates)
- Data cleanup (old records, temporary files)
- Notifications (auction reminders, daily summaries)
- Statistics (reports, user activity tracking)

## Architecture

### Main Components

1. **CronJobManager** (`src/jobs/cronJobs.ts`)
   - Main coordinator for all cron jobs
   - Handles initialization, starting, stopping, and graceful shutdown

2. **Job Modules**
   - `auctionJobs.ts` - Auction-related tasks
   - `cleanupJobs.ts` - Data and file cleanup
   - `notificationJobs.ts` - Notification processing
   - `statsJobs.ts` - Statistics and reporting

## Job Schedules

### Auction Jobs

- **Expired Auctions Check**: Every 5 minutes (`*/5 * * * *`)
  - Updates auction status from 'active' to 'completed'
  - Marks winning bids and sets winners
- **Auction Statistics**: Every 15 minutes (`*/15 * * * *`)
  - Updates bid counts, participant counts
  - Calculates current highest bids

### Cleanup Jobs

- **Old Data Cleanup**: Daily at 2:00 AM (`0 2 * * *`)
  - Removes old test counters
  - Cleans up inactive auction participants
- **Temp Files**: Every 6 hours (`0 */6 * * *`)
  - Deletes temporary files older than 24 hours

### Statistics Jobs

- **Daily Reports**: Daily at 1:00 AM (`0 1 * * *`)
  - Generates comprehensive daily statistics
  - Tracks auctions, bids, users, products
- **User Activity**: Every hour (`0 * * * *`)
  - Updates user activity metrics
  - Tracks active bidders and participants

### Notification Jobs

- **Auction Ending Reminders**: Every 10 minutes (`*/10 * * * *`)
  - Sends reminders for auctions ending within 1 hour
- **Notification Queue**: Every 2 minutes (`*/2 * * * *`)
  - Processes recent bid notifications

## Usage

### Automatic Startup

The cron jobs automatically start when the server starts:

```typescript
// In app.ts
await CronJobManager.initialize();
CronJobManager.start();
```

### Manual Control

```typescript
// Initialize jobs
await CronJobManager.initialize();

// Start all jobs
CronJobManager.start();

// Stop all jobs
CronJobManager.stop();

// Get job status
const status = CronJobManager.getStatus();

// Graceful shutdown
await CronJobManager.shutdown();
```

### API Endpoints

#### Get Cron Job Status

```
GET /api/admin/cron-status
```

Response:

```json
{
  "message": "Cron job status retrieved",
  "jobs": [
    {
      "index": 0,
      "running": true
    },
    ...
  ]
}
```

## Individual Job Functions

### Auction Jobs

```typescript
import { auctionJobs } from "./jobs/auctionJobs";

// Check for expired auctions
await auctionJobs.checkExpiredAuctions();

// Update auction statistics
await auctionJobs.updateAuctionStats();

// Clean up old auction data
await auctionJobs.cleanupOldAuctions();
```

### Cleanup Jobs

```typescript
import { cleanupJobs } from "./jobs/cleanupJobs";

// Clean up old database records
await cleanupJobs.cleanupOldData();

// Clean up temporary files
await cleanupJobs.cleanupTempFiles();

// Clean up expired sessions
await cleanupJobs.cleanupExpiredSessions();
```

### Notification Jobs

```typescript
import { notificationJobs } from "./jobs/notificationJobs";

// Send auction ending reminders
await notificationJobs.sendAuctionEndingReminders();

// Process notification queue
await notificationJobs.processNotificationQueue();

// Send daily summary
await notificationJobs.sendDailySummary();
```

### Statistics Jobs

```typescript
import { statsJobs } from "./jobs/statsJobs";

// Generate daily reports
const report = await statsJobs.generateDailyReports();

// Update user activity stats
await statsJobs.updateUserActivityStats();

// Calculate trending auctions
const trending = await statsJobs.calculateTrendingAuctions();
```

## Configuration

### Environment Variables

The system uses the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string (required)
- `NODE_ENV` - Environment (development/production)

### Timezone

All cron jobs are configured to run in Asia/Karachi timezone.

## Error Handling

- All jobs include comprehensive error handling
- Errors are logged to console with descriptive messages
- Failed jobs don't affect other jobs
- Graceful shutdown ensures jobs complete before termination

## Database Schema Dependencies

The cron jobs work with these Prisma models:

- `AuctionRoom` - Main auction data
- `AuctionBid` - Bid records
- `AuctionParticipant` - Participant tracking
- `Product` - Product information
- `User` - User data
- `TestCounter` - Test/development data

## Monitoring

### Logs

All job executions are logged with timestamps and status:

```
⏰ Running auction expiry check...
📊 Updating auction statistics...
🔔 Checking for auction ending reminders...
```

### Health Checks

Use the status endpoint to monitor job health:

```bash
curl http://localhost:3000/api/admin/cron-status
```

## Development

### Adding New Jobs

1. Add job function to appropriate module or create new module
2. Add job to CronJobManager.initialize()
3. Set appropriate schedule using cron syntax
4. Test thoroughly in development

### Testing Jobs Manually

```typescript
// Test individual jobs
await auctionJobs.checkExpiredAuctions();
```

### Cron Schedule Syntax

```
 ┌───────────── minute (0 - 59)
 │ ┌───────────── hour (0 - 23)
 │ │ ┌───────────── day of the month (1 - 31)
 │ │ │ ┌───────────── month (1 - 12)
 │ │ │ │ ┌───────────── day of the week (0 - 6) (0 to 6 are Sunday to Saturday)
 │ │ │ │ │
 │ │ │ │ │
 * * * * *
```

Examples:

- `*/5 * * * *` - Every 5 minutes
- `0 2 * * *` - Daily at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Weekly on Sunday at midnight

## Production Considerations

1. **Resource Usage**: Monitor CPU and memory usage during job execution
2. **Database Locks**: Jobs that modify same tables should be scheduled carefully
3. **Notifications**: Implement actual notification services (email, SMS, push)
4. **Monitoring**: Add proper monitoring and alerting for job failures
5. **Scaling**: Consider job queues (Bull, Agenda) for high-volume scenarios
