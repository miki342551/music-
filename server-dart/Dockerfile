# Build stage
FROM dart:stable AS build

WORKDIR /app

# Copy pubspec first for better caching
COPY pubspec.* ./
RUN dart pub get

# Copy source code
COPY . .

# Compile to native executable
RUN dart compile exe bin/server.dart -o bin/server

# Runtime stage - minimal image
FROM scratch

# Copy the executable
COPY --from=build /runtime/ /
COPY --from=build /app/bin/server /app/bin/server

# Expose port
EXPOSE 3001

# Run the server
CMD ["/app/bin/server"]
