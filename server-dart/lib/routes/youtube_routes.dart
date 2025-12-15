import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../youtube_service.dart';
import '../piped_service.dart';
import '../cache.dart';

/// YouTube API routes - Uses Piped (NewPipe Extractor) as primary source
Router youtubeRoutes(YouTubeService youtube) {
  final router = Router();
  final piped = PipedService();

  // Search endpoint
  router.get('/search', (Request request) async {
    final query = request.url.queryParameters['q'];
    
    if (query == null || query.isEmpty) {
      return Response.badRequest(body: json.encode({'error': 'Query is required'}));
    }

    final cacheKey = query.toLowerCase();
    final cached = AppCache.search.get(cacheKey);
    if (cached != null) {
      print('⚡ Cache hit for search: $query');
      return Response.ok(
        json.encode({'results': cached}),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      print('\n🔍 Searching for: $query');
      // Use youtube_explode for search (faster)
      final results = await youtube.search(query);
      AppCache.search.set(cacheKey, results);
      print('📋 Found ${results.length} results');
      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Search error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Search failed', 'results': []}),
      );
    }
  });

  // Stream URL endpoint - Uses Piped (NewPipe) as primary, youtube_explode as fallback
  router.get('/stream/<videoId>', (Request request, String videoId) async {
    final cached = AppCache.stream.get(videoId);
    if (cached != null) {
      print('⚡ Cache hit for stream: $videoId');
      return Response.ok(
        json.encode(cached),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      print('\n🎵 Getting stream for: $videoId');
      
      // Try Piped API first (NewPipe Extractor)
      print('📡 Trying Piped API (NewPipe Extractor)...');
      var streamData = await piped.getStreamUrl(videoId);
      
      // Fallback to youtube_explode if Piped fails
      if (streamData == null) {
        print('⚠️ Piped failed, falling back to youtube_explode...');
        streamData = await youtube.getStreamUrl(videoId);
        if (streamData != null) {
          streamData['source'] = 'youtube_explode';
        }
      }
      
      if (streamData == null) {
        return Response.internalServerError(
          body: json.encode({'error': 'Failed to get stream from all sources'}),
        );
      }

      // Cache result (30 min TTL - URLs expire after ~6 hours)
      AppCache.stream.set(videoId, streamData);
      
      print('✓ Stream found via ${streamData['source'] ?? 'unknown'}: ${streamData['title']}');
      return Response.ok(
        json.encode(streamData),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Stream error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get stream'}),
      );
    }
  });

  // Trending endpoint
  router.get('/trending', (Request request) async {
    if (AppCache.trending != null && !AppCache.trending!.isExpired(AppCache.trendingTtl)) {
      print('⚡ Cache hit for trending');
      return Response.ok(
        json.encode({'results': AppCache.trending!.data}),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      print('\n📈 Getting trending music');
      final results = await youtube.search('trending music 2024', limit: 20);
      AppCache.trending = CacheEntry(results);
      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Trending error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get trending', 'results': []}),
      );
    }
  });

  // Suggestions endpoint
  router.get('/suggestions', (Request request) async {
    final query = request.url.queryParameters['q'];
    
    if (query == null || query.length < 2) {
      return Response.ok(
        json.encode({'suggestions': []}),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      final suggestions = await youtube.getSuggestions(query);
      return Response.ok(
        json.encode({'suggestions': suggestions}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Suggestions error: $e');
      return Response.ok(
        json.encode({'suggestions': []}),
        headers: {'Content-Type': 'application/json'},
      );
    }
  });

  // Track details
  router.get('/track/<videoId>', (Request request, String videoId) async {
    try {
      final info = await youtube.getVideoInfo(videoId);
      if (info == null) {
        return Response.notFound(json.encode({'error': 'Track not found'}));
      }
      return Response.ok(
        json.encode(info),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Track details error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get track details'}),
      );
    }
  });

  // Related tracks
  router.get('/related/<videoId>', (Request request, String videoId) async {
    return Response.ok(
      json.encode({'results': []}),
      headers: {'Content-Type': 'application/json'},
    );
  });

  return router;
}
