# ==========================================
# STAGE 1: Build the application
# ==========================================
FROM maven:3.9.4-eclipse-temurin-21 AS builder

# Set the working directory inside the container
WORKDIR /build

# Copy the pom.xml and download dependencies first (caches them for faster rebuilds)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the actual source code and build the .jar file
COPY src ./src
# Skip tests during the Docker build to ensure it compiles quickly
RUN mvn clean package -DskipTests

# ==========================================
# STAGE 2: Run the application
# ==========================================
# Use a tiny, secure JRE (Java Runtime Environment) image for production
FROM eclipse-temurin:21-jre-alpine

# Create a non-root user for security (prevents privilege escalation attacks)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Set the working directory
WORKDIR /app

# Copy the compiled .jar file from the Builder stage
COPY --from=builder /build/target/*.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Command to run the application
ENTRYPOINT ["java", "-jar", "app.jar"]