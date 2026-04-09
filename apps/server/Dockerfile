FROM node:18-slim AS pruner
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=@webhookey/server --docker

FROM node:18-slim AS builder
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/yarn.lock ./yarn.lock
RUN corepack enable && yarn install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN yarn turbo build --filter=@webhookey/server
RUN yarn workspace @webhookey/server exec prisma generate

FROM node:18-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y openssl
COPY --from=builder /app/apps/server/dist ./dist
COPY --from=builder /app/apps/server/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/server/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main.js"]
