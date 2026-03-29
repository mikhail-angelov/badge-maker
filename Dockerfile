FROM node:22-alpine

WORKDIR /app

# Copy all
COPY server ./server
COPY src ./src
COPY package.json ./package.json

# Set environment variables
ENV NODE_ENV=production
