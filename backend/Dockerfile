FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (canvas)
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev

# Install all dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune devDependencies
RUN npm prune --omit=dev

# Production image
FROM node:20-alpine

WORKDIR /app

# Runtime dependencies for canvas
RUN apk add --no-cache cairo pango jpeg giflib pixman

# Copy pre-built node_modules (with native canvas already compiled)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3001

CMD ["npm", "start"]
