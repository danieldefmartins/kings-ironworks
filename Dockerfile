FROM node:22-slim

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build Next.js
RUN pnpm run build

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Start Next.js
CMD ["pnpm", "run", "start"]
