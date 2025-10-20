# ClientFlow Worker

Background job processor for ClientFlow CRM using BullMQ and Redis.

## Features

- **Reminder Processing**: Automated appointment reminders (24h and 3h before)
- **Nurture Campaigns**: Drip email/SMS sequences
- **Dunning Management**: Payment reminder automation
- **Daily Snapshots**: KPI metrics calculation
- **Scheduled Jobs**: Cron-based job scheduling
- **Observability**: Sentry error tracking, OpenTelemetry tracing
- **Retry Logic**: Exponential backoff with dead letter handling

## Queues

### Reminders Queue
- **Purpose**: Appointment reminders
- **Jobs**: `process-reminder`
- **Schedule**: Hourly scan for upcoming appointments
- **Retry**: 3 attempts with exponential backoff

### Nurture Queue
- **Purpose**: Drip campaign automation
- **Jobs**: `process-nurture`
- **Schedule**: On-demand via API
- **Retry**: 3 attempts with exponential backoff

### Dunning Queue
- **Purpose**: Payment reminder automation
- **Jobs**: `process-dunning`
- **Schedule**: On-demand via API
- **Retry**: 3 attempts with exponential backoff

### Snapshots Queue
- **Purpose**: Daily KPI calculations
- **Jobs**: `process-snapshots`
- **Schedule**: Daily at 01:00
- **Retry**: 3 attempts with exponential backoff

## Scheduled Jobs

### Hourly Appointment Scan
- **Cron**: `0 * * * *`
- **Purpose**: Find appointments needing reminders
- **Actions**: Queue 24h and 3h reminder jobs

### Daily Snapshots
- **Cron**: `0 1 * * *`
- **Purpose**: Calculate daily KPIs
- **Actions**: Queue snapshot jobs for all organizations

## Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Database
DATABASE_URL=postgresql://...

# Observability
SENTRY_DSN=
OTEL_EXPORTER_OTLP_ENDPOINT=

# External Services
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SENDGRID_API_KEY=
OPENAI_API_KEY=

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Build for production
pnpm build

# Start production build
pnpm start
```

## Monitoring

The worker includes comprehensive monitoring:

- **Sentry**: Error tracking and performance monitoring
- **OpenTelemetry**: Distributed tracing
- **Pino**: Structured logging with PII redaction
- **Queue Stats**: Job counts and processing metrics

## Error Handling

- **Retry Logic**: Exponential backoff for failed jobs
- **Dead Letter**: Failed jobs moved to dead letter queue
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT
- **Uncaught Exceptions**: Process exit on critical errors

## Job Types

### Reminder Jobs
```typescript
{
  orgId: string;
  contactId: string;
  appointmentId: string;
  message: string;
  scheduledFor: Date;
  reminderType: '24h' | '3h';
}
```

### Nurture Jobs
```typescript
{
  orgId: string;
  contactId: string;
  sequenceStep: number;
  template: string;
  personalization: Record<string, any>;
}
```

### Dunning Jobs
```typescript
{
  orgId: string;
  contactId: string;
  amount: number;
  daysOverdue: number;
  paymentLink: string;
}
```

### Snapshot Jobs
```typescript
{
  orgId: string;
  date: string;
}
```

## Health Checks

The worker provides health check endpoints:

- **Queue Health**: Redis connection and queue status
- **Job Processing**: Active job counts and processing rates
- **Scheduled Jobs**: Cron job status and last execution

## Scaling

The worker can be scaled horizontally:

- **Multiple Instances**: Run multiple worker processes
- **Queue Partitioning**: Distribute jobs across instances
- **Redis Clustering**: Use Redis Cluster for high availability
- **Load Balancing**: Distribute cron jobs across instances

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis server status
   - Verify connection credentials
   - Check network connectivity

2. **Jobs Not Processing**
   - Check worker status
   - Verify queue configuration
   - Check job data format

3. **Scheduled Jobs Not Running**
   - Verify cron expressions
   - Check system timezone
   - Review job logs

### Debugging

```bash
# Check queue status
redis-cli monitor

# View job logs
tail -f logs/worker.log

# Check Sentry for errors
# Check OpenTelemetry traces
```

## Production Deployment

1. **Environment Setup**
   - Configure all environment variables
   - Set up Redis cluster
   - Configure Sentry DSN

2. **Monitoring**
   - Set up alerts for failed jobs
   - Monitor queue depths
   - Track processing rates

3. **Scaling**
   - Run multiple worker instances
   - Use Redis Cluster
   - Implement health checks

4. **Maintenance**
   - Regular queue cleanup
   - Monitor dead letter queues
   - Update job processors
