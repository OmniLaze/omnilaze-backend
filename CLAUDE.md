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
- **Auth Module**: `src/modules/auth/` - JWT-based authentication with Aliyun SMS verification and user management
- **Orders Module**: `src/modules/orders/` - Order management with WebSocket support via `OrdersGateway`
- **Preferences Module**: `src/modules/preferences/` - User preference storage and management
- **Invites Module**: `src/modules/invites/` - Invitation system and referral management
- **Payments Module**: `src/modules/payments/` - Payment processing with WeChat Pay and Alipay providers
- **Admin Module**: `src/modules/admin/` - Administrative endpoints with system key and role-based access
- **Notifications Module**: `src/modules/notifications/` - Notification management system
- **Health Module**: `src/modules/health/` - Health check endpoints

### Database Schema (Prisma)
Key models in `prisma/schema.prisma`:
- `User` - User accounts with phone authentication and invite codes
- `Order` - Order records with delivery info, preferences, payment status, and arrival images
- `UserPreferences` - Cached user preferences for quick ordering
- `InviteCode` & `Invitation` - Referral system management
- `Payment` & `PaymentEvent` - Payment processing and tracking
- `OrderFeedback` & `OrderVoiceFeedback` - Rating and feedback system with audio support
- `Reservation` - Future reservation system

**Recent Schema Updates**:
- Added arrival image fields (`arrivalImageUrl`, `arrivalImageSource`, `arrivalImageTakenAt`)
- Added voice feedback support via `OrderVoiceFeedback` model
- Added delivery time field for order scheduling

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

### Utility Scripts for Data Management
```bash
# User management from CSV imports  
npm run import:users  # Import users from CSV file

# Invite code management and verification
npm run check:invites  # Check invite code status
./scripts/manage-invites.sh  # Manage invite codes via script

# Task definition generation for AWS ECS deployments
./scripts/generate-task-definition.sh <IMAGE_URI>  # Generate ECS task definition

# SSM Parameter Store management for environment variables
./scripts/setup-ssm-config.sh  # Setup AWS SSM parameters
./scripts/manage-ssm-config.sh  # Manage SSM configuration
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
- **Multi-stage Docker Build**: Optimized for production with separate deps, builder, and runner stages

## Environment Configuration

### Production Configuration
```bash
# Current production endpoints
BACKEND_URL="https://backend.omnilaze.co"
SWAGGER_DOCS="https://backend.omnilaze.co/docs"
HEALTH_CHECK="https://backend.omnilaze.co/v1/health"

# Local development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/omnilaze"
CORS_ORIGINS='["http://localhost:8081", "http://localhost:3000"]'
PORT=3000
NODE_ENV=development

# Required environment variables
JWT_SECRET="your-jwt-secret"

# WeChat Pay configuration (微信支付)
WECHAT_MCH_ID="your-merchant-id"              # 商户号
WECHAT_APP_ID="your-app-id"                    # 应用ID
WECHAT_API_KEY_V3="your-api-key-v3"            # API密钥v3
WECHAT_SERIAL_NO="your-cert-serial-no"         # 商户证书序列号
WECHAT_PRIVATE_KEY="your-private-key"          # 商户私钥（PEM格式）
WECHAT_NOTIFY_URL="https://backend.omnilaze.co/v1/payments/webhook/wechatpay"
WECHAT_GATEWAY="https://api.mch.weixin.qq.com" # API网关地址

# Alipay payment configuration (保留兼容)
ALIPAY_APP_ID="your-alipay-app-id"
ALIPAY_PRIVATE_KEY="your-alipay-private-key"
ALIPAY_PUBLIC_KEY="your-alipay-public-key"
ALIPAY_GATEWAY="https://openapi.alipay.com/gateway.do"
ALIPAY_NOTIFY_URL="https://backend.omnilaze.co/v1/payments/webhook/alipay"

# Admin access control
SYSTEM_API_KEY="your-system-api-key"  # For protected endpoints
ADMIN_USER_IDS="user_id_1,user_id_2"  # Comma-separated admin user IDs

# Aliyun SMS service (required for SMS verification)
ALIYUN_ACCESS_KEY_ID="your-aliyun-access-key-id"
ALIYUN_ACCESS_KEY_SECRET="your-aliyun-access-key-secret" 
ALIYUN_REGION_ID="cn-qingdao"                  # Aliyun region for SMS service
ALIYUN_SMS_SIGN_NAME="your-sms-signature"      # SMS signature name
ALIYUN_SMS_TEMPLATE_CODE="SMS_XXXXXX"         # SMS template code

# SPUG notification service (fallback for SMS)
SPUG_URL="https://push.spug.cc/send/your-token"  # SPUG webhook for notifications
```

### Docker Development
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
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

### SMS Verification System
- **Multi-provider Fallback**: Aliyun SMS (primary) → SPUG notifications (fallback) → Development mode
- **Phone-based Authentication**: 11-digit phone number validation with SMS codes
- **Development Testing**: Universal test code "100000" for development/testing
- **Code Expiration**: 5-minute expiration with automatic cleanup
- **Rate Limiting**: Built into overall API rate limiting (120 req/min per IP)

### Authentication & Authorization
- **JWT-based Authentication**: Custom JWT auth guard and roles decorator
- **Phone-based Registration**: Users authenticate via phone numbers with SMS verification
- **Role-based Access**: User roles with guard-based protection
- **Invite System**: Referral codes for user onboarding and access control
- **System Key Guard**: Protected endpoints using `SYSTEM_API_KEY` for administrative access
- **User Ownership Validation**: All user-specific operations verify ownership via JWT claims
- **Admin Guard**: Role-based admin access using `ADMIN_USER_IDS` environment variable
### Real-time Features
- **WebSocket Support**: `OrdersGateway` for real-time order updates with JWT authentication
- **Socket.IO Integration**: Bi-directional communication with authenticated clients only
- **Secure Room Subscriptions**: Users can only subscribe to their own channels

### Payment Processing
- **WeChat Pay Integration**: `WechatPayProvider` for Chinese market payment processing (H5, JSAPI, Native)
- **Alipay Integration**: `AlipayProvider` for alternative payment method (retained for compatibility)
- **Payment Events**: Comprehensive payment event tracking and webhook handling
- **Order-Payment Linking**: Integrated order and payment lifecycle management
- **Refund Support**: Full and partial refund capabilities with WeChat Pay
- **Payment Query**: Real-time payment status checking and synchronization

### Data Validation & API Documentation
- **Class Validation**: Global validation pipe with DTO transformation
- **Swagger Documentation**: Automatic API documentation generation
- **Type Safety**: Full TypeScript with Prisma type generation

## Development Patterns & Best Practices

### NestJS Module Architecture
Each feature follows consistent NestJS patterns:
- `*.module.ts` - Module definition with imports/exports and dependency injection
- `*.controller.ts` - REST API endpoints with OpenAPI decorators and validation
- `*.service.ts` - Business logic and database operations using Prisma
- `*.gateway.ts` - WebSocket event handlers using Socket.IO (where applicable)
- DTOs and validation using `class-validator` and `class-transformer`

### Database Patterns with Prisma
- **Type-safe Queries**: Generated Prisma client with full TypeScript support
- **Migration Management**: Versioned schema changes via `prisma migrate`
- **Multi-platform Support**: Binary targets for Docker deployment (`linux-musl`, `debian-openssl-3.0.x`)
- **Connection Management**: Prisma handles connection pooling automatically
- **Relationships**: Proper foreign key relationships with cascade options

### Authentication & Security
- **JWT Guards**: Custom `JwtAuthGuard` for endpoint protection
- **Current User Decorator**: `@CurrentUser()` and `@CurrentUserId()` for extracting authenticated user data
- **Role-based Access**: `@Roles()` decorator with `RolesGuard` for authorization
- **Admin Access Control**: `AdminGuard` for role-based administrative access
- **User Ownership Validation**: Automatic verification that users can only access their own data
- **Input Validation**: Global validation pipe with whitelist and transformation
- **Rate Limiting**: 120 requests per minute per IP address
- **CORS Configuration**: Environment-based origin allowlist

### Error Handling & Logging
- **Global Validation**: Automatic DTO validation with meaningful error messages
- **Request Logging**: IP-based request tracking with timestamps
- **Exception Handling**: NestJS built-in exception filters with proper HTTP status codes
- **Health Checks**: Comprehensive health endpoint for monitoring

### WebSocket Integration
- **Real-time Updates**: OrdersGateway provides live order status updates
- **Socket.IO**: Bi-directional communication for order tracking
- **JWT Authentication**: WebSocket connections require valid JWT tokens
- **Secure Subscriptions**: Users can only subscribe to their own user/order channels
- **Environment-based CORS**: Configurable origins instead of wildcard

## Security Architecture

### User Authentication Pattern
All user-facing endpoints follow this security pattern:
```typescript
@UseGuards(JwtAuthGuard)
async userEndpoint(
  @CurrentUserId() userId: string,
  @CurrentUser() user: JwtPayload, // Contains: sub, phone, role
  @CurrentUser('phone') phoneNumber: string,
  @Body() body: SomeDTO
) {
  // Use userId from JWT, never from request body
  // Verify ownership in service layer
}
```

### Admin Endpoint Pattern
Administrative endpoints use system key or admin role validation:
```typescript
// Option 1: System Key (Recommended for external services)
@UseGuards(SystemKeyGuard)
async adminEndpoint(@Body() body: AdminDTO) {
  // Only accessible with correct system key in X-System-Key header
}

// Option 2: Admin Role (For authenticated admin users)
@UseGuards(JwtAuthGuard, AdminGuard)
async adminEndpoint(@CurrentUserId() userId: string, @Body() body: AdminDTO) {
  // Only accessible by users listed in ADMIN_USER_IDS
}

// Option 3: Role-based (Using @Roles decorator)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
async adminEndpoint(@CurrentUser() user: JwtPayload, @Body() body: AdminDTO) {
  // Only accessible by users with admin or moderator role
}
```

**Current Strategy**: Administrative endpoints use `SystemKeyGuard` for external service access. This provides better security for automated systems and allows for easy revocation of access.

### WebSocket Authentication
WebSocket clients must authenticate with JWT tokens:
```javascript
// Client-side connection
const socket = io('/ws', {
  auth: { token: 'your-jwt-token' }
});
```

### Common Security Decorators
- `@CurrentUser()` - Extract full JWT payload
- `@CurrentUserId()` - Extract user ID from JWT
- `@UseGuards(JwtAuthGuard)` - Require valid JWT
- `@UseGuards(SystemKeyGuard)` - Require system API key
- `@UseGuards(AdminGuard)` - Require admin role (needs JWT first)

## Task Definition Management

The project uses a sophisticated task definition generation system for AWS ECS:
```bash
# Generate task definition with specific image
./scripts/generate-task-definition.sh 442729101249.dkr.ecr.ap-southeast-1.amazonaws.com/omnilaze-backend:latest

# The script automatically:
# 1. Replaces placeholders (__AWS_REGION__, ACCOUNT_ID, ENVIRONMENT) in template
# 2. Registers new task definition with AWS ECS
# 3. Returns ARN for deployment updates
```

**Template System**: Uses `task-definitions/template.json` with placeholder substitution for:
- Image URIs from ECR
- AWS region and account ID
- Environment-specific configurations
- SSM Parameter Store ARNs for secrets


## Utility Scripts & Management

### Invite Code Management
Located in `scripts/` directory:
- `check-invites.ts` - TypeScript script to check invite code status
- `manage-invites.js` - JavaScript utility for invite code operations  
- `update-invites-*.ts/js` - Various scripts for updating invite codes
- `invite-codes-update.sql` - SQL scripts for direct database updates

## Critical Implementation Notes

### Docker Multi-stage Build
The Dockerfile uses multi-stage build for production optimization:
- **Dependencies Stage**: `node:20-alpine` with production deps only
- **Builder Stage**: `node:20-alpine` for TypeScript compilation and Prisma generation  
- **Runner Stage**: `node:20-slim` with OpenSSL for Prisma Client compatibility
- Binary targets ensure compatibility with Linux containers (`linux-musl`, `debian-openssl-3.0.x`)

### AWS ECS Integration
- **Task Definition**: Auto-generated with image URIs from ECR
- **Service Updates**: Blue-green deployments with zero downtime
- **Health Checks**: ALB monitors `/v1/health` endpoint
- **Migration Tasks**: Separate ECS task for running database migrations

### Environment Detection
The application adapts behavior based on `NODE_ENV`:
- Development: Verbose logging, CORS development origins
- Production: Optimized logging, restricted CORS, health monitoring

## Common Issues & Solutions

### Database Connection Issues
- Ensure PostgreSQL is running: `docker-compose up -d`
- Check DATABASE_URL format: `postgresql://user:pass@host:port/db`
- Run migrations: `npm run prisma:migrate`

### CORS Issues
- Update CORS_ORIGINS environment variable with frontend URLs
- Include both HTTP and HTTPS versions for development
- Verify JSON array format: `'["http://localhost:3000"]'`

### WebSocket Connection Problems
- Check that Socket.IO client connects to correct backend URL
- Verify CORS settings allow WebSocket upgrades
- Ensure client provides valid JWT token in auth or query params
- Monitor browser network tab for connection attempts
- Check server logs for authentication failures

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
- System API key protection for administrative endpoints
- User ownership validation prevents unauthorized data access
- WebSocket authentication prevents unauthorized real-time subscriptions
- Admin role enforcement for sensitive operations

### Performance Optimizations  
- Prisma connection pooling
- Express body parsing limits (1MB JSON limit)
- Efficient database queries with Prisma relations
- WebSocket support for real-time features
- Multi-stage Docker builds for smaller production images

### Monitoring & Health
- Health check endpoint at `/v1/health`
- Request logging for debugging and monitoring
- Container-based deployment for scalability
- Comprehensive CI/CD pipeline with automated migrations

### Architecture Highlights
- **Modular Design**: Feature-based module organization following NestJS best practices
- **Type Safety**: Full TypeScript with Prisma-generated types throughout the application
- **Real-time Communication**: WebSocket gateway for live order updates and notifications
- **Payment Integration**: Alipay provider with webhook support and event tracking
- **Invite System**: Comprehensive referral and invitation management with usage tracking