# ---- build stage ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ---- run stage ----
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY server/ ./server/
COPY --from=builder /app/build ./build
RUN chown -R node:node /app
USER node
EXPOSE 7500
CMD ["node", "./server/app"]
