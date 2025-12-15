import 'dart:convert';
import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';
import 'package:shelf_cors_headers/shelf_cors_headers.dart';

import 'package:music_server/youtube_service.dart';
import 'package:music_server/spotify_service.dart';
import 'package:music_server/cache.dart';
import 'package:music_server/routes/youtube_routes.dart';
import 'package:music_server/routes/spotify_routes.dart';

void main() async {
  // Initialize services
  final youtube = YouTubeService();
  final spotify = SpotifyService(
    clientId: Platform.environment['SPOTIFY_CLIENT_ID'],
    clientSecret: Platform.environment['SPOTIFY_CLIENT_SECRET'],
  );

  // Create main router
  final app = Router();

  // Mount YouTube routes under /api
  app.mount('/api/', youtubeRoutes(youtube).call);
  
  // Mount Spotify routes under /api/spotify
  app.mount('/api/spotify/', spotifyRoutes(spotify, youtube).call);

  // Health check
  app.get('/api/health', (Request request) {
    return Response.ok(
      json.encode({
        'status': 'ok',
        'mode': 'youtube_explode_dart',
        'cacheSize': {
          'search': AppCache.search.size,
          'stream': AppCache.stream.size,
          'spotify': AppCache.spotify.size,
        }
      }),
      headers: {'Content-Type': 'application/json'},
    );
  });

  // Create pipeline with CORS
  final handler = Pipeline()
      .addMiddleware(corsHeaders())
      .addMiddleware(logRequests())
      .addHandler(app.call);

  // Get port from environment or default
  final port = int.parse(Platform.environment['PORT'] ?? '3001');

  // Start server
  final server = await shelf_io.serve(handler, InternetAddress.anyIPv4, port);

  print('''
╔═══════════════════════════════════════════════════╗
║  🎵 GE'EZ Music Backend (Dart + youtube_explode)  ║
║  Running on http://\${server.address.host}:\${server.port}        ║
║  ⚡ Caching Enabled                               ║
╚═══════════════════════════════════════════════════╝
  ''');

  // Handle shutdown gracefully
  ProcessSignal.sigint.watch().listen((_) {
    print('\n👋 Shutting down...');
    youtube.close();
    server.close();
    exit(0);
  });
}
