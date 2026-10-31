# Build Vue App
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# copy source code & .env from host
COPY . .

RUN npm run build

# Serve with Nginx
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]