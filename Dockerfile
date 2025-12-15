# ========================================
# GE'EZ Music Backend - Dart Server
# Uses youtube_explode_dart for streaming
# ========================================

# Build stage
FROM dart:stable AS build

WORKDIR /app

# Copy pubspec first for better caching
COPY server-dart/pubspec.* ./
RUN dart pub get

# Copy source code
COPY server-dart/bin ./bin
COPY server-dart/lib ./lib

# Compile to native executable
RUN dart compile exe bin/server.dart -o bin/server

# Runtime stage - minimal image
FROM debian:bookworm-slim

# Install ca-certificates for HTTPS
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the executable
COPY --from=build /app/bin/server /app/server

# Expose port
EXPOSE 3001

ENV PORT=3001

# Run the server
CMD ["/app/server"]
