# Use official Node.js LTS image
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install with pnpm if lock exists, else yarn or npm
RUN if [ -f pnpm-lock.yaml ]; then \
  npm i -g pnpm && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
  yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
  npm ci; \
  else \
  npm install; \
  fi

# Copy source
COPY . .

# Ensure `public` exists so later COPY won't fail when absent
RUN mkdir -p public

# Build Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# If you use next/image with sharp, add libvips dependencies here
RUN apk add --no-cache libc6-compat

# Copy only necessary files
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start
CMD ["npm", "start"]
