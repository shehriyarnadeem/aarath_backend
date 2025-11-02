# Cron Job Test Routes

This document provides API endpoints to manually test and manage cron jobs during development.

## Base URL

All cron job test routes are available under:

```
/api/admin/cron
```

## Authentication

⚠️ **Security Note**: These routes are currently unprotected. In production, add authentication middleware to restrict access to admin users only.

---

## Individual Job Testing

### Auction Jobs

#### Check Expired Auctions

```http
POST /api/admin/cron/test/auction/expired
```

Manually triggers the expired auction check job.

**Response:**

```json
{
  "success": true,
  "message": "Expired auctions check completed successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

#### Update Auction Statistics

```http
POST /api/admin/cron/test/auction/stats
```

Manually triggers auction statistics update.

**Response:**

```json
{
  "success": true,
  "message": "Auction statistics updated successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

#### Clean Up Old Auctions

```http
POST /api/admin/cron/test/auction/cleanup
```

Manually triggers auction cleanup job.

**Response:**

```json
{
  "success": true,
  "message": "Auction cleanup completed successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

---

## Cron Job Management

### Get Status

```http
GET /api/admin/cron/status
```

Returns the current status of all cron jobs.

**Response:**

```json
{
  "success": true,
  "message": "Cron job status retrieved successfully",
  "data": {
    "totalJobs": 2,
    "jobs": [
      {
        "index": 0,
        "running": true
      },
      {
        "index": 1,
        "running": true
      }
    ]
  },
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

### Start Cron Jobs

```http
POST /api/admin/cron/start
```

Starts all cron jobs.

**Response:**

```json
{
  "success": true,
  "message": "Cron jobs started successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

### Stop Cron Jobs

```http
POST /api/admin/cron/stop
```

Stops all cron jobs.

**Response:**

```json
{
  "success": true,
  "message": "Cron jobs stopped successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

### Restart Cron Jobs

```http
POST /api/admin/cron/restart
```

Stops, reinitializes, and starts all cron jobs.

**Response:**

```json
{
  "success": true,
  "message": "Cron jobs restarted successfully",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

---

## Test All Jobs

### Run All Available Tests

```http
POST /api/admin/cron/test/all
```

Runs all currently available cron job tests in sequence.

**Response:**

```json
{
  "success": true,
  "message": "All available cron jobs tested. 3 succeeded, 0 failed",
  "data": {
    "executionTimeMs": 1250,
    "totalJobs": 3,
    "successCount": 3,
    "failedCount": 0,
    "results": [
      {
        "job": "checkExpiredAuctions",
        "status": "success"
      },
      {
        "job": "updateAuctionStats",
        "status": "success"
      },
      {
        "job": "cleanupOldAuctions",
        "status": "success"
      }
    ]
  },
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Failed to check expired auctions",
  "error": "Database connection failed",
  "timestamp": "2025-10-31T10:30:00.000Z"
}
```

---

## Usage Examples

### Using cURL

```bash
# Check expired auctions
curl -X POST http://localhost:3000/api/admin/cron/test/auction/expired

# Get cron job status
curl http://localhost:3000/api/admin/cron/status

# Run all tests
curl -X POST http://localhost:3000/api/admin/cron/test/all

# Restart cron jobs
curl -X POST http://localhost:3000/api/admin/cron/restart
```

### Using JavaScript/Fetch

```javascript
// Test expired auctions
const response = await fetch("/api/admin/cron/test/auction/expired", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
});
const result = await response.json();
console.log(result);

// Get status
const statusResponse = await fetch("/api/admin/cron/status");
const status = await statusResponse.json();
console.log(status);
```

---

## Development Workflow

### Testing Individual Jobs

1. Use individual test endpoints during development
2. Check logs for detailed execution information
3. Verify database changes after running tests

### Testing All Jobs

1. Use `/test/all` endpoint for comprehensive testing
2. Review the results array for any failed jobs
3. Check execution time for performance monitoring

### Managing Jobs During Development

1. Use `/stop` to halt jobs during debugging
2. Use `/restart` after making code changes
3. Use `/status` to verify job states

---

## Commented Routes

The following routes are available when the corresponding job modules are uncommented:

### Cleanup Jobs

- `POST /api/admin/cron/test/cleanup/old-data`
- `POST /api/admin/cron/test/cleanup/temp-files`

### Notification Jobs

- `POST /api/admin/cron/test/notifications/ending-reminders`
- `POST /api/admin/cron/test/notifications/queue`

### Statistics Jobs

- `POST /api/admin/cron/test/stats/daily-reports`
- `POST /api/admin/cron/test/stats/user-activity`

To enable these routes:

1. Uncomment the corresponding imports in `cronJobs.ts`
2. Uncomment the route handlers in `cronTest.ts`
3. Restart the server

---

## Security Considerations

### Production Deployment

- Add authentication middleware to all `/api/admin/*` routes
- Implement role-based access control (admin only)
- Add rate limiting to prevent abuse
- Log all admin actions for audit purposes

### Example Auth Middleware

```typescript
// Add this to protect admin routes
app.use(
  "/api/admin/cron",
  verifyFirebaseToken,
  requireAdminRole,
  cronTestRouter
);
```

---

## Monitoring and Logging

- All test executions are logged with timestamps
- Check server logs for detailed job execution information
- Use the status endpoint for health monitoring
- Monitor execution times in the `/test/all` response
