# build stage
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV=development
WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./
RUN pnpm install --frozen-lockfile

COPY src ./src
RUN pnpm build

# prod stage
FROM node:22-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/build ./build

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile --prod

CMD ["node", "build/index.js"]