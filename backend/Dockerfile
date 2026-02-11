FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (canvas)
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Runtime dependencies for canvas
RUN apk add --no-cache cairo pango jpeg giflib pixman

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JS
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["npm", "start"]
