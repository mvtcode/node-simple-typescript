ARG NODE_VERSION=22.20.0-alpine3.22

FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Ensure public folder exists and has proper permissions for node user
RUN mkdir -p /app/public && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
