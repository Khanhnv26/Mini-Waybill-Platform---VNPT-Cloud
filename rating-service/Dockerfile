FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY . .
RUN mvn -B -pl rating-service -am package -Dmaven.test.skip=true \
    && cp rating-service/target/rating-service-1.0-SNAPSHOT.jar /workspace/app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
EXPOSE 8092
ENTRYPOINT ["java", "-jar", "app.jar"]
