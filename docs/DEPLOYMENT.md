# Deployment Guide

This guide covers deploying the ClientFlow AI Suite to production.

## Prerequisites

- Docker and Docker Compose
- Domain name and SSL certificate
- Environment variables configured
- Database backup strategy

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/clientflow/ai-suite.git
   cd clientflow-ai-suite
   ```

2. Configure environment variables:
   ```bash
   cp env/api/env.example apps/api/.env
   cp env/web/env.example apps/web/.env
   cp env/worker/env.example apps/worker/.env
   ```

3. Deploy with Docker Compose:
   ```bash
   docker-compose up -d
   ```

## Environment Configuration

### API Server (.env)

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
REDIS_URL=redis://host:6379
```

### Web Application (.env)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### Worker (.env)

```bash
REDIS_URL=redis://host:6379
OPENAI_API_KEY=sk-your-openai-key
SENTRY_DSN=https://your-sentry-dsn
```

## Production Deployment

### Using Docker Compose

1. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

2. **Check service status:**
   ```bash
   docker-compose ps
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

### Using Kubernetes

1. **Apply configurations:**
   ```bash
   kubectl apply -f k8s/
   ```

2. **Check pod status:**
   ```bash
   kubectl get pods
   ```

### Using Vercel (Web App)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd apps/web
   vercel --prod
   ```

### Using Railway (API)

1. **Connect repository to Railway**
2. **Set environment variables**
3. **Deploy automatically on push**

## Monitoring

### Health Checks

- API: `GET /health`
- Web: `GET /api/health`
- Worker: Check logs for errors

### Logs

- **API logs:** `docker-compose logs api`
- **Web logs:** `docker-compose logs web`
- **Worker logs:** `docker-compose logs worker`

### Metrics

- Application metrics via Winston
- Database metrics via PostgreSQL
- Cache metrics via Redis
- External monitoring via Sentry

## Scaling

### Horizontal Scaling

- **API:** Multiple instances behind load balancer
- **Worker:** Multiple worker instances
- **Web:** CDN for static assets

### Vertical Scaling

- Increase container resources
- Optimize database queries
- Implement caching strategies

## Security

### SSL/TLS

- Use Let's Encrypt for free certificates
- Configure reverse proxy (Nginx/Traefik)
- Enable HTTPS redirects

### Environment Variables

- Never commit secrets to version control
- Use secret management services
- Rotate keys regularly

### Database Security

- Use connection pooling
- Enable SSL connections
- Regular security updates

## Backup Strategy

### Database Backups

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql $DATABASE_URL < backup_file.sql
```

### File Storage

- Use cloud storage (S3, GCS)
- Enable versioning
- Regular backups

## Troubleshooting

### Common Issues

1. **Port conflicts:** Check if ports 3000, 4000, 5432, 6379 are available
2. **Database connection:** Verify DATABASE_URL and credentials
3. **Redis connection:** Check REDIS_URL and Redis service
4. **Environment variables:** Ensure all required variables are set

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
docker-compose up
```

### Performance Issues

1. **Database queries:** Use query analysis tools
2. **Memory usage:** Monitor container resources
3. **Network latency:** Check DNS and network configuration

## Maintenance

### Updates

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Rebuild and restart:**
   ```bash
   docker-compose up -d --build
   ```

### Database Migrations

```bash
# Run migrations
docker-compose exec api npm run migrate
```

### Cleanup

```bash
# Remove unused containers and images
docker system prune -a

# Clean up volumes
docker volume prune
```

## Support

For deployment issues:

- Check logs: `docker-compose logs`
- Review documentation
- Contact support: dev@clientflow.ai
- Create GitHub issue

