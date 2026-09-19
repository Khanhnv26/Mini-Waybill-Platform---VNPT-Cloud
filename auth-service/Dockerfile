FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.war app.war
EXPOSE 8087
ENTRYPOINT ["java", "-jar", "app.war"]