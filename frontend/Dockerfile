FROM khanhnv26/frontend:1.0

LABEL authors="Khanhnv26"

WORKDIR /app

RUN rm -rf /app/*

COPY . ./

EXPOSE 3000 3001

CMD ["node", "server.js", "3000"]
