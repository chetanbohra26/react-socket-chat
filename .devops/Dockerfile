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
COPY --chown=node:node package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production
COPY --chown=node:node server/ ./server/
COPY --chown=node:node --from=builder /app/build ./build
USER node
EXPOSE 7500
CMD ["node", "./server/app"]
