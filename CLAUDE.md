# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the `omnilaze-backend` - a NestJS REST API backend service for the OmniLaze food ordering platform. It provides authentication, order management, user preferences, invitations, and payment processing capabilities using PostgreSQL with Prisma ORM. The service is designed for AWS ECS Fargate deployment with automated CI/CD.

## Architecture

### NestJS Modular Architecture
- **Main Application**: `src/main.ts` - Bootstrap with CORS, validation, rate limiting, and Swagger docs
- **App Module**: `src/app.module.ts` - Root module importing all feature modules
- **Database**: `src/db/` - Prisma service and module for PostgreSQL integration
- **Configuration**: `src/config/` - Environment configuration management
- **Common**: `src/common/` - Shared decorators and guards (JWT auth, roles)

### Feature Modules
- **Auth Module**: `src/modules/auth/` - JWT-based authentication and user management
- **Orders Module**: `src/modules/orders/` - Order management with WebSocket support via `OrdersGateway`
- **Preferences Module**: `src/modules/preferences/` - User preference storage and management
- **Invites Module**: `src/modules/invites/` - Invitation system and referral management
- **Payments Module**: `src/modules/payments/` - Payment processing with Alipay provider
- **Health Module**: `src/modules/health/` - Health check endpoints

### Database Schema (Prisma)
Key models in `prisma/schema.prisma`:
- `User` - User accounts with phone authentication and invite codes
- `Order` - Order records with delivery info, preferences, and payment status
- `UserPreferences` - Cached user preferences for quick ordering
- `InviteCode` & `Invitation` - Referral system management
- `Payment` & `PaymentEvent` - Payment processing and tracking
- `OrderFeedback` - Rating and feedback system
- `Reservation` - Future reservation system

## Development Commands

### Local Development
```bash
# Start development server with hot reload
npm run dev

# Run with Docker Compose (PostgreSQL + Redis)
docker-compose up -d
npm run dev
```

### Database Management
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Deploy migrations to production
npm run prisma:deploy

# Open Prisma Studio
npm run prisma:studio
```

### Build and Production
```bash
# Build TypeScript to dist/
npm run build

# Start production server
npm run start
# or
npm run start:prod
```

### Testing
```bash
# No test framework currently configured
npm run lint  # Currently just echoes "No linter configured"
```

## Deployment Architecture

### AWS ECS Fargate Deployment
- **Container Orchestration**: AWS ECS Fargate for serverless container deployment
- **Load Balancing**: Application Load Balancer (ALB) with health checks at `/v1/health`
- **Container Registry**: Amazon ECR for Docker image storage
- **Networking**: VPC with private subnets and security groups
- **Database**: External PostgreSQL (likely RDS)

### Automated Deployment
- **CI/CD Pipeline**: `.github/workflows/aws-deploy.yml` - Automated deployment on push to `main`
- **Infrastructure Setup**: `deploy-ecs.sh` - Initial ECS cluster and service creation
- **ALB Setup**: `infra/setup-aws-infrastructure.sh` - Load balancer and target group creation

### Key Configuration
- **Port**: Application runs on port 3000
- **Health Check**: `/v1/health` endpoint for load balancer monitoring
- **CORS**: Configurable origins via `CORS_ORIGINS` environment variable
- **Rate Limiting**: 120 requests per minute per IP
- **API Documentation**: Swagger UI available at `/docs`

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/omnilaze"

# CORS Configuration  
CORS_ORIGINS='["http://localhost:3000", "https://yourdomain.com"]'

# Application
PORT=3000
NODE_ENV=production
```

### AWS Secrets (GitHub Actions)
- `AWS_REGION` - Target AWS region
- `AWS_ROLE_ARN` - IAM role for deployment
- `ECR_REPOSITORY` - ECR repository name
- `ECS_CLUSTER` - ECS cluster name
- `ECS_SERVICE` - ECS service name
- `ECS_TASK_MIGRATIONS` - Task definition for migrations
- `SUBNETS` - VPC subnet IDs (comma-separated)
- `SECURITY_GROUPS` - Security group IDs (comma-separated)

## Key Features

### Authentication & Authorization
- **JWT-based Authentication**: Custom JWT auth guard and roles decorator
- **Phone-based Registration**: Users authenticate via phone numbers
- **Role-based Access**: User roles with guard-based protection
- **Invite System**: Referral codes for user onboarding

### Real-time Features
- **WebSocket Support**: `OrdersGateway` for real-time order updates
- **Socket.IO Integration**: Bi-directional communication with clients

### Payment Processing
- **Alipay Integration**: `AlipayProvider` for Chinese market payment processing
- **Payment Events**: Comprehensive payment event tracking and webhook handling
- **Order-Payment Linking**: Integrated order and payment lifecycle management

### Data Validation & API Documentation
- **Class Validation**: Global validation pipe with DTO transformation
- **Swagger Documentation**: Automatic API documentation generation
- **Type Safety**: Full TypeScript with Prisma type generation

## Development Patterns

### Module Structure
Each feature follows consistent NestJS patterns:
- `*.module.ts` - Module definition with imports/exports
- `*.controller.ts` - REST API endpoints with validation
- `*.service.ts` - Business logic and database operations
- `*.gateway.ts` - WebSocket event handlers (where applicable)

### Database Patterns
- **Prisma Integration**: Type-safe database queries with generated client
- **Migration Management**: Versioned schema changes via Prisma migrate
- **Binary Targets**: Multi-platform support for Docker deployment (`linux-musl`, `debian-openssl-3.0.x`)

### Error Handling & Logging
- **Global Validation**: Automatic DTO validation with whitelist transformation
- **Request Logging**: Comprehensive request logging with IP tracking
- **Rate Limiting**: Express rate limit middleware for DDoS protection

## Infrastructure Requirements

### Local Development
- Node.js 20+
- PostgreSQL database
- Redis (optional, for caching)
- Docker & Docker Compose (for containerized local development)

### Production Deployment
- AWS Account with ECS, ECR, and VPC access
- Application Load Balancer setup
- RDS PostgreSQL instance
- Proper IAM roles for ECS task execution and deployment

## Critical Notes

### Security Considerations
- JWT tokens for authentication (ensure secure secret management)
- Rate limiting enabled (120 req/min per IP)
- CORS configured for specific origins only
- Input validation on all endpoints

### Performance Optimizations  
- Prisma connection pooling
- Express body parsing limits (1MB JSON limit)
- Efficient database queries with Prisma relations
- WebSocket support for real-time features

### Monitoring & Health
- Health check endpoint at `/v1/health`
- Request logging for debugging and monitoring
- Container-based deployment for scalability