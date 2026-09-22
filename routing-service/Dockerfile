FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY target/*.war app.war
EXPOSE 8083
ENV TZ=Asia/Ho_Chi_Minh
ENV JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Ho_Chi_Minh
ENTRYPOINT ["java", "-jar", "app.war"]