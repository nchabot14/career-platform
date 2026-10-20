FROM node:24-slim

RUN npm install -g pnpm@11.24.0
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# NEXT_PUBLIC_* values are compiled into the client bundle, so Railway must
# pass them as build arguments (it does for every declared ARG).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_UMAMI_SCRIPT_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
