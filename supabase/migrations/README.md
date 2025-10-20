# Multi-Tenant Database Schema

This directory contains SQL migrations for a comprehensive multi-tenant application database schema designed for business automation platforms like ClientFlow AI Suite.

## Migration Files Overview

### `001_initial_schema.sql`
Core database schema including:
- **Multi-tenant structure**: Organizations → Businesses → Users
- **CRM tables**: Customers, services, calls, conversations, appointments, reviews
- **Analytics**: Daily metrics, performance tracking
- **Automation**: AI scripts, notifications, audit logs

**Key Features:**
- UUID primary keys for security
- JSONB fields for flexible metadata
- Comprehensive constraints and validation
- Auto-updating timestamps via triggers
- Performance-optimized indexes

### `002_row_level_security.sql`
Comprehensive Row Level Security (RLS) policies:
- **Tenant isolation**: Users can only access data within their organization/business
- **Role-based access**: Owner, admin, staff, viewer permission levels
- **Service role bypass**: API operations using service role
- **Security functions**: Helper functions for permission checking

**Security Highlights:**
- Complete data isolation between tenants
- Granular permission controls
- Audit trail protection
- Prevents privilege escalation

### `003_user_management_and_automation.sql`
Business automation and data management:
- **User lifecycle**: Auto-profile creation, login tracking
- **Data automation**: Auto-link customers, conversations, calls
- **Metrics calculation**: Real-time daily metrics updates
- **Utility functions**: Phone validation, email validation, formatting

**Automation Features:**
- Customer auto-creation from interactions
- Conversation thread management
- Appointment/reservation linking
- Daily performance metrics

### `004_views_and_sample_data.sql`
API-friendly views and sample data:
- **Dashboard views**: Customer summaries, performance metrics
- **API endpoints**: Optimized views for frontend consumption
- **Sample data**: Realistic test data for development
- **Documentation**: Comments and schema documentation

## Database Schema Structure

### Tenant Hierarchy
```
Organizations (Top-level multi-tenant)
├── Businesses (Sub-tenants)
│   ├── Users (Business members with roles)
│   ├── Customers
│   ├── Services
│   ├── Calls
│   ├── Conversations
│   │   └── Messages
│   ├── Appointments
│   ├── Reviews
│   ├── AI Scripts
│   └── Daily Metrics
└── Notifications, Audit Logs, etc.
```

### Core Tables

#### Organizations
- Multi-tenant root entities
- Subscription management
- Billing and plan limits

#### Businesses  
- Sub-entities within organizations
- Business-specific settings
- Service catalogs and operations

#### Users/Profiles
- Authentication integration with Supabase Auth
- Role management within business contexts
- Permission granularity

#### CRM Tables
- **Customers**: Complete customer profiles with interaction history
- **Services**: Product/service catalog with pricing
- **Calls**: Call logs, transcripts, outcomes
- **Conversations**: Multi-channel communication threads
- **Appointments**: Booking system with status tracking
- **Reviews**: Customer feedback and ratings

#### Analytics & Automation
- **Daily Metrics**: Aggregated performance data
- **AI Scripts**: Conversation automation and voice scripts
- **Notifications**: User and system notifications
- **Audit Logs**: Complete audit trail for compliance

## Row Level Security Implementation

### Security Principles
1. **Complete Data Isolation**: Users can only access data within their tenant context
2. **Role-Based Permissions**: Granular access control based on user roles
3. **Audit Protection**: Audit logs can only be viewed by administrators
4. **Service Integration**: Service role bypass for API operations

### Permission Levels
- **Owner**: Full business management, user management, billing
- **Admin**: Business operations, user management, reporting
- **Staff**: Operate within business context, customer interaction
- **Viewer**: Read-only access to business data

### Key Security Functions
```sql
-- Check user's organization access
get_user_organization_id(user_id)

-- Check business access for user
can_access_business(user_id, business_id)

-- Check specific role permissions
has_business_role(user_id, business_id, role)

-- Admin-level access checks
is_business_admin(user_id, business_id)
```

## API Usage Examples

### Customer Management
```sql
-- Get customer summary with interaction history
SELECT * FROM customer_summary 
WHERE business_id = $1 
ORDER BY created_at DESC;

-- Search customers
SELECT * FROM customers 
WHERE business_id = $1 
AND (first_name ILIKE $2 OR last_name ILIKE $2 OR phone ILIKE $2);
```

### Analytics Dashboard
```sql
-- Get dashboard metrics
SELECT * FROM business_dashboard_data 
WHERE business_id = $1;

-- Performance metrics with trends
SELECT * FROM performance_metrics 
WHERE business_id = $1 
AND metric_date >= NOW() - INTERVAL '30 days';
```

### Conversation Management
```sql
--;
SELECT * FROM conversation_threads 
WHERE business_id = $1 
AND status = 'active'
ORDER BY last_message_at DESC;
```

## Migration Execution

### Prerequisites
- PostgreSQL 13+
- Supabase project
- Superuser/owner database access

### Running Migrations
```bash
# Apply all migrations in order
psql -d your_database -f 001_initial_schema.sql
psql -d your_database -f 002_row_level_security.sql
psql -d your_database -f 003_user_management_and_automation.sql
psql -d your_database -f 004_views_and_sample_data.sql
```

### Verification
```sql
-- Check schema creation
\dt public.*

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check functions and views
\df public.*
\dv public.*
```

## Environment Setup

### Environment Variables
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Application Integration
- **Supabase Client**: Use TypeScript-generated types
- **Authentication**: Leverage Supabase Auth for user management
- **Real-time**: Enable real-time subscriptions for live updates
- **Storage**: Use Supabase Storage for file attachments

## Performance Considerations

### Indexing Strategy
- Primary indexes on foreign keys for join performance
- Composite indexes for common query patterns
- Partial indexes for filtered searches
- Text search indexes for customer/contact search

### Query Optimization
- Use views for complex aggregations
- Leverage database functions for business logic
- Consider materialized views for heavy calculations
- Implement connection pooling

### Scaling Considerations
- Database partitioning for large tenants
- Read replicas for analytics queries
- Archival strategy for old audit logs
- Monitoring query performance

## Security Best Practices

### Data Protection
- All sensitive data encrypted at rest
- PII data access logged in audit trail
- Customer data export/deletion capabilities
- GDPR compliance features

### Access Control
- Principle of least privilege
- Regular permission audits
- Service account key rotation
- Multi-factor authentication for admin accounts

### Audit & Monitoring
- Complete audit trail for all operations
- Performance monitoring and alerting
- Failed access attempt logging
- Regular security reviews

## Sample Data

The schema includes sample data generation for:
- Organizations and businesses
- Users with different roles
- Customer records with varied backgrounds
- Historical calls, conversations, appointments
- Performance metrics and reviews

This enables immediate testing and development without manual data entry.

## Troubleshooting

### Common Issues
- **RLS blocking legitimate queries**: Check user context and business membership
- **Performance problems**: Verify indexes are being used
- **Data inconsistencies**: Review trigger functions and automation logic

### Debugging Tools
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- View active connections
SELECT * FROM pg_stat_activity;

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM your_query;
```

## Contributing

When extending the schema:
1. Follow existing naming conventions
2. Include comprehensive tests
3. Update documentation and comments
4. Consider migration dependencies
5. Test RLS policies thoroughly

---

This schema provides a robust foundation for multi-tenant business automation applications with comprehensive security, analytics, and automation capabilities.
