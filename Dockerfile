FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs && chown -R node:node /app/logs
USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
