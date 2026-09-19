FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.war app.war
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.war"]