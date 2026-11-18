# Genius Sound — Production Deployment Guide

## Overview

Genius Sound consists of three independently scalable services:
1. **Web App** (Next.js, Node.js)
2. **Media API** (FastAPI, Python)
3. **Job Worker** (Node.js background processor)

## Prerequisites

- PostgreSQL 16+
- Node.js 20+
- Python 3.10+
- S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.)
- Docker (for containerization, optional but recommended)

---

## Architecture for Production

```
┌─────────────────┐
│  Users Browser  │
└────────┬────────┘
         │
    ┌────▼──────────┐
    │  Web App      │      (Vercel, AWS Lambda, Railway, Fly.io)
    │  (Next.js)    │      PORT 3876
    └────┬──────────┘
         │
    ┌────▼──────────┬──────────────┐
    │  Media API    │  Job Worker  │  (AWS ECS, Render, Railway)
    │  (FastAPI)    │  (Node.js)   │  API: PORT 8876
    └────┬──────────┴──────────────┘
         │
    ┌────▼──────────────────┐
    │  PostgreSQL           │  (AWS RDS, Neon, Supabase)
    │  S3 Storage           │  (AWS S3, Cloudflare R2, MinIO)
    │  (Optional: Redis)    │  (AWS ElastiCache, Upstash)
    └───────────────────────┘
```

---

## 1. Database Setup

### AWS RDS (PostgreSQL)

```bash
# Create database
aws rds create-db-instance \
  --db-instance-identifier genius-sound-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.3 \
  --master-username geniussound \
  --master-user-password "<STRONG_PASSWORD>" \
  --allocated-storage 20 \
  --publicly-accessible true
```

### Alternative: Supabase / Neon (Easiest)

Supabase: https://app.supabase.com
- One-click PostgreSQL setup
- Built-in monitoring

Neon: https://console.neon.tech
- Serverless PostgreSQL
- Auto-scales to zero

### Configure Credentials

```bash
# In your production .env:
DATABASE_URL="postgresql://user:password@hostname:5432/geniussound"
```

---

## 2. Object Storage (S3)

### Option A: AWS S3

```bash
# Create bucket
aws s3api create-bucket \
  --bucket geniussound-prod \
  --region us-east-1

# Create IAM user with S3 access
aws iam create-user --user-name geniussound-app
aws iam attach-user-policy \
  --user-name geniussound-app \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Generate credentials
aws iam create-access-key --user-name geniussound-app
```

### Option B: Cloudflare R2 (Cheaper)

```bash
# No setup needed - create bucket in Cloudflare dashboard
# https://dash.cloudflare.com/account/storage/r2
```

### Option C: MinIO (Self-hosted)

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=<PASSWORD> \
  minio/minio server /data --console-address ":9001"
```

### Configure Credentials

```bash
# In your production .env:
STORAGE_DRIVER="s3"
S3_BUCKET="geniussound-prod"
S3_ENDPOINT="https://s3.amazonaws.com"  # or Cloudflare/MinIO endpoint
S3_ACCESS_KEY_ID="<YOUR_ACCESS_KEY>"
S3_SECRET_ACCESS_KEY="<YOUR_SECRET>"
```

---

## 3. Web App Deployment

### Option A: Vercel (Recommended)

Vercel is the official Next.js platform.

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Settings → Environment Variables:
# - DATABASE_URL
# - AUTH_SECRET
# - API_URL (point to your Media API)
# - API_INTERNAL_TOKEN
# - STORAGE_DRIVER, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
```

### Option B: AWS Amplify

```bash
# Connect your GitHub repo to Amplify
# https://console.aws.amazon.com/amplify

# Enable environment variables in Amplify console
# Build & deployment triggers automatically on git push
```

### Option C: Railway / Render

Railway: https://railway.app
Render: https://render.com

```bash
# Connect GitHub repo
# Configure environment variables
# Deploy automatically on git push
```

### Option D: Self-hosted (Docker)

```dockerfile
# Build stage
FROM node:20-alpine as builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3876
CMD ["npm", "start"]
```

```bash
docker build -t geniussound-web .
docker run -p 3876:3876 \
  -e DATABASE_URL="..." \
  -e AUTH_SECRET="..." \
  geniussound-web
```

---

## 4. Media API Deployment

### Option A: AWS ECS / Fargate

```bash
# Create ECR repository
aws ecr create-repository --repository-name geniussound-api

# Build & push Docker image
docker build -t geniussound-api api/
docker tag geniussound-api:latest <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/geniussound-api:latest
docker push <ACCOUNT>.dkr.ecr.<REGION>.amazonaws.com/geniussound-api:latest

# Create ECS task definition pointing to ECR image
# Configure environment variables in task definition
```

### Option B: Render / Railway

```bash
# In Render/Railway dashboard:
# - New Service → Docker
# - Point to Dockerfile in api/
# - Set PORT=8876
# - Configure environment variables
```

### Option C: Self-hosted

```dockerfile
# api/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8876
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8876"]
```

```bash
docker build -t geniussound-api api/
docker run -p 8876:8876 \
  -e DATABASE_URL="..." \
  -e STORAGE_DRIVER="s3" \
  -e S3_ENDPOINT="..." \
  geniussound-api
```

---

## 5. Job Worker Deployment

The worker processes background jobs (audio analysis, scene generation, final export).

### Option A: ECS / Fargate

```bash
# Same as Media API, but separate task
# Command: npm run worker
# No exposed ports needed (internal only)
```

### Option B: Dedicated Server

```bash
# SSH into server
ssh ubuntu@worker.example.com

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repo and configure
git clone <REPO>
cd GeniusSound
npm ci
export DATABASE_URL="..."
export API_URL="http://media-api:8876"
npm run worker
```

### Option C: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start worker
pm2 start "npm run worker" --name "geniussound-worker"

# Monitor
pm2 logs geniussound-worker
pm2 save  # Save process list
```

---

## 6. Environment Configuration

Create `.env` in production:

```bash
# Database
DATABASE_URL="postgresql://user:password@db.example.com:5432/geniussound"

# Auth
AUTH_SECRET="<GENERATE_WITH: openssl rand -base64 32>"

# Storage
STORAGE_DRIVER="s3"
S3_BUCKET="geniussound-prod"
S3_ENDPOINT="https://s3.amazonaws.com"
S3_ACCESS_KEY_ID="<YOUR_KEY>"
S3_SECRET_ACCESS_KEY="<YOUR_SECRET>"

# APIs
API_URL="https://api.geniussound.com"
API_INTERNAL_TOKEN="<GENERATE_WITH: openssl rand -base64 32>"

# Worker
WORKER_CONCURRENCY="4"  # Increase for more parallel jobs
WORKER_POLL_MS="2000"

# Optional: AI Providers (leave empty to disable)
COMFYUI_URL=""
REPLICATE_API_TOKEN=""
FAL_KEY=""

# LLM (Creative Director)
LLM_BASE_URL=""
LLM_API_KEY=""
LLM_MODEL=""

# Node environment
NODE_ENV="production"
```

---

## 7. Database Migrations

Run migrations in production:

```bash
# Option A: Automatic (recommended)
# In your CI/CD pipeline, before deploying web app:
npm run db:migrate

# Option B: Manual
npx prisma migrate deploy
```

---

## 8. Monitoring & Logging

### Application Monitoring

```bash
# Option A: Sentry (Error Tracking)
npm install @sentry/nextjs

# Option B: Datadog
npm install @datadog/rum-core

# Option C: Cloudflare Analytics
# Built-in if deploying to Cloudflare Workers
```

### Logs

```bash
# View logs in cloud provider console:
# - Vercel: Vercel Dashboard → Logs
# - AWS: CloudWatch Logs
# - Railway/Render: Dashboard → Logs
```

### Database Monitoring

```bash
# AWS RDS:
# - CloudWatch → RDS → db-instance-identifier
# Monitor: CPU, connections, storage

# Supabase/Neon:
# - Built-in monitoring in dashboard
```

---

## 9. Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] HTTPS enforced (all services)
- [ ] Database behind VPC (not publicly accessible unless necessary)
- [ ] S3 bucket not public (private by default)
- [ ] API_INTERNAL_TOKEN set and enforced
- [ ] Regular database backups enabled
- [ ] SSL/TLS certificates valid
- [ ] API rate limiting configured
- [ ] CORS properly configured for your domain
- [ ] Auth headers validated on all requests

---

## 10. Scaling

### Horizontal Scaling

```
Web App:
- Run multiple instances behind load balancer
- Stateless (session in database)
- Scale based on CPU/memory

Media API:
- Run multiple instances
- Configure load balancer to distribute requests
- May need Redis for distributed caching

Worker:
- Run multiple instances
- Job queue naturally distributes work
- Increase WORKER_CONCURRENCY per instance
```

### Vertical Scaling

```
Database:
- Upgrade RDS instance type
- Increase storage
- Add read replicas for query distribution

Storage:
- S3 handles unlimited scale automatically
- No additional configuration needed

API/Web:
- Increase container memory/CPU in cloud console
```

---

## 11. Troubleshooting

### App not starting

```bash
# Check environment variables
echo $DATABASE_URL
echo $AUTH_SECRET

# Check database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check API connectivity
curl http://api.geniussound.com/health
```

### Jobs not processing

```bash
# Check worker logs
pm2 logs geniussound-worker

# Verify worker is running
ps aux | grep worker

# Check database for stuck jobs
select * from "Job" where status='RUNNING' and updated_at < NOW() - INTERVAL '1 hour';
```

### S3 upload failing

```bash
# Test S3 credentials
aws s3 ls s3://geniussound-prod/ \
  --region us-east-1 \
  --profile geniussound

# Check CORS configuration
aws s3api get-bucket-cors --bucket geniussound-prod
```

---

## 12. Cost Estimation (AWS)

Monthly cost for single-user to small team:

- **RDS (db.t3.micro):** $15
- **S3 (100GB storage, 1TB transfer):** $20
- **NAT Gateway (if VPC):** $32
- **API/Web compute:** $20-100 (varies by traffic)
- **Total:** ~$100-150/month

For heavy usage, migrate to Fargate or ECS.

---

## Deployment Checklist

- [ ] Database set up and migrated
- [ ] S3 bucket created and credentials configured
- [ ] AUTH_SECRET generated and set
- [ ] API_INTERNAL_TOKEN generated and set
- [ ] Web app deployed to production domain
- [ ] Media API deployed and health check passing
- [ ] Worker deployed and processing jobs
- [ ] Environment variables confirmed in all three services
- [ ] Database backups enabled
- [ ] Monitoring/logging configured
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] User documentation created

---

## Support

For issues:
1. Check logs in cloud provider console
2. Verify all environment variables are set
3. Test connectivity: `curl <SERVICE_URL>/health`
4. Review database migrations: `npx prisma migrate status`

---

**Last Updated:** 2026-11-18
**Version:** 1.0
