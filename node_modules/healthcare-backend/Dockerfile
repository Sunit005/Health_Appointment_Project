FROM node:20-alpine AS base
WORKDIR /app

FROM base AS dependencies
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm ci

FROM dependencies AS builder
COPY . .
RUN npm run build:shared
RUN npm run build:backend

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/prisma ./backend/prisma

EXPOSE 5000
CMD ["npm", "start", "-w", "backend"]
