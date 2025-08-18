FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma (required for Prisma Client)
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy app source
COPY . .

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000
# Use ts-node with transpile-only to skip type checking
CMD ["npx", "ts-node", "--transpile-only", "src/main.ts"]
