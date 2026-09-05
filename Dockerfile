# Generated for Smithery / container deploy — TypeScript on Bun, MCP 2.0

FROM oven/bun:1.4-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ENV PATH="/root/.bun/bin:${PATH}"
EXPOSE 8081

# Smithery sets SMITHERY_DEPLOYMENT + PORT
ENV SMITHERY_DEPLOYMENT=1
ENV HOST=0.0.0.0
ENV PORT=8081

CMD ["bun", "run", "src/index.ts"]
