FROM eclipse-temurin:21-jre-alpine
LABEL authors="LENOVO"
WORKDIR /app
COPY target/*.war app.war
EXPOSE 8762
ENTRYPOINT ["java", "-jar", "app.war"]