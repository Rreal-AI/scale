# Auto-Archiving Feature

## Overview

The auto-archiving feature automatically archives inactive orders at the end of each day. Archived orders remain searchable and filterable with no data loss.

## Features

### 1. Automatic Archiving
- **Scheduler**: Runs daily at midnight (configurable in `vercel.json`)
- **Criteria**: Archives orders that:
  - Have status `pending_weight` (not yet processed)
  - Were created more than 24 hours ago
  - Have had no activity (no updates) in the last 24 hours

### 2. Manual Archiving
- API endpoint: `POST /api/orders/archive`
- Manually archive one or more orders
- Optional custom reason for archiving

### 3. Unarchiving/Restoring Orders
- API endpoint: `PUT /api/orders/archive`
- Restore archived orders to any status
- Clears archive metadata

### 4. Searchable & Filterable
- Filter by archived status in the UI
- Filter by archive date range
- Full text search works on archived orders
- Sort by any field including archive date

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
# CRON Secret for scheduled archiving
# Generate a random string: openssl rand -base64 32
CRON_SECRET=your-secret-key-here
```

### Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/archive-inactive-orders",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Schedule format**: [Cron expression](https://crontab.guru/)
- `0 0 * * *` = Daily at midnight UTC
- `0 2 * * *` = Daily at 2 AM UTC
- `0 0 * * 1` = Weekly on Monday at midnight

### Configuring Archive Rules

Edit `/src/app/api/cron/archive-inactive-orders/route.ts`:

```typescript
// Change the inactivity threshold (default: 24 hours)
const cutoffTime = new Date();
cutoffTime.setHours(cutoffTime.getHours() - 24); // Change 24 to your desired hours

// Add custom exclusions (example: skip VIP customers)
const inactiveOrders = await db
  .select()
  .from(orders)
  .where(
    and(
      eq(orders.status, "pending_weight"),
      lt(orders.created_at, cutoffTime),
      lt(orders.updated_at, cutoffTime),
      // Add custom conditions here:
      // not(eq(orders.customer_email, "vip@example.com"))
    )
  );
```

## API Endpoints

### Auto-Archive (Cron)

```bash
GET /api/cron/archive-inactive-orders
Authorization: Bearer YOUR_CRON_SECRET

Response:
{
  "message": "Orders archived successfully",
  "archived_count": 5,
  "archived_order_ids": ["uuid1", "uuid2", ...],
  "timestamp": "2025-10-22T00:00:00.000Z"
}
```

### Manual Archive

```bash
POST /api/orders/archive
Content-Type: application/json

{
  "order_ids": ["uuid1", "uuid2"],
  "reason": "Manual archive - customer requested"
}

Response:
{
  "message": "Orders archived successfully",
  "archived_count": 2,
  "archived_orders": [...]
}
```

### Unarchive/Restore

```bash
PUT /api/orders/archive
Content-Type: application/json

{
  "order_ids": ["uuid1", "uuid2"],
  "restore_status": "pending_weight"  // or "weighed", "completed", "cancelled"
}

Response:
{
  "message": "Orders unarchived successfully",
  "unarchived_count": 2,
  "unarchived_orders": [...]
}
```

### List Orders with Filters

```bash
GET /api/orders?status=archived&archived_from=2025-10-01&archived_to=2025-10-22

Response:
{
  "orders": [...],
  "pagination": {...},
  "filters": {
    "status": "archived",
    "archived_from": "2025-10-01",
    "archived_to": "2025-10-22"
  }
}
```

## UI Features

### 1. Archived Filter Button
Located in the orders dashboard next to "Cancelled":
- Shows count of archived orders
- Click to filter only archived orders

### 2. Archived Date Range Filter
When "Archived" status is selected in advanced filters:
- **Archived From**: Start date filter
- **Archived To**: End date filter

### 3. Archive Indicator
In the orders table, archived orders show:
- "Archived" badge
- Archive date (📦 MM/DD/YYYY)
- Hover to see archive reason

## Database Schema

### New Fields

```sql
-- Added to orders table
archived_at: timestamp       -- When the order was archived
archived_reason: text         -- Why it was archived
```

### New Status

```sql
-- Added to order_status enum
"archived"  -- Order is archived
```

## Migration

Run the migration to add the new fields:

```bash
# Generate migration (already done)
pnpm drizzle-kit generate

# Apply migration to database
pnpm drizzle-kit push
```

Migration file: `src/db/migrations/0009_greedy_the_renegades.sql`

## Testing

### Test Auto-Archive Locally

```bash
# Using curl
curl -X GET http://localhost:3000/api/cron/archive-inactive-orders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or use the Vercel CLI
vercel env pull .env.local
vercel dev
```

### Test Manual Archive

```typescript
// Example: Archive specific orders
const response = await fetch('/api/orders/archive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_ids: ['order-uuid-1', 'order-uuid-2'],
    reason: 'Testing manual archive'
  })
});
```

## Deployment

1. **Set Environment Variable** in Vercel:
   ```bash
   vercel env add CRON_SECRET production
   ```

2. **Deploy** (cron jobs auto-configure):
   ```bash
   git push origin main
   # or
   vercel --prod
   ```

3. **Verify Cron Job** in Vercel Dashboard:
   - Go to Project > Settings > Cron Jobs
   - Should see: `/api/cron/archive-inactive-orders` scheduled

## Monitoring

### Vercel Logs

View cron execution logs:
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Logs"
4. Filter by path: `/api/cron/archive-inactive-orders`

### Check Archived Orders

```sql
-- In your database
SELECT COUNT(*) FROM orders WHERE status = 'archived';
SELECT * FROM orders WHERE status = 'archived' ORDER BY archived_at DESC LIMIT 10;
```

## Troubleshooting

### Cron not running?

1. **Check environment variable** is set in Vercel
2. **Verify `vercel.json`** is in project root
3. **Check logs** in Vercel Dashboard for errors
4. **Test endpoint manually** with curl

### Orders not being archived?

1. **Check criteria**: Orders must be `pending_weight` AND older than 24h AND no updates in 24h
2. **Review logs** for errors
3. **Manually test** the endpoint

### How to prevent specific orders from being archived?

Add custom conditions in `/src/app/api/cron/archive-inactive-orders/route.ts`:

```typescript
const inactiveOrders = await db
  .select()
  .from(orders)
  .where(
    and(
      eq(orders.status, "pending_weight"),
      lt(orders.created_at, cutoffTime),
      lt(orders.updated_at, cutoffTime),
      // Example exclusions:
      not(ilike(orders.customer_email, "%vip%")),  // Skip VIP emails
      not(gte(orders.total_amount, 10000))         // Skip orders > $100
    )
  );
```

## Future Enhancements

- [ ] Email notifications for archived orders
- [ ] Bulk restore UI
- [ ] Archive to separate database/storage
- [ ] Configurable archive rules via admin UI
- [ ] Archive analytics dashboard
