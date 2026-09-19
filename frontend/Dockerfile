FROM node:20-alpine

LABEL authors="Khanhnv26"

WORKDIR /app
COPY server.js ./
COPY frontend/ ./frontend/

EXPOSE 3000 3001

CMD ["node", "server.js", "3000"]
