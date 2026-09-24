FROM maven:3.9.12-eclipse-temurin-21-alpine AS build
WORKDIR /workspace
COPY backend-springboot/pom.xml ./pom.xml
RUN mvn -B -q dependency:go-offline
COPY backend-springboot/src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S hris && adduser -S -G hris hris
WORKDIR /app
COPY --from=build /workspace/target/hris-backend-springboot-1.0.0.jar app.jar
RUN mkdir /app/uploads && chown -R hris:hris /app
USER hris
EXPOSE 3000
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65", "-jar", "/app/app.jar"]
