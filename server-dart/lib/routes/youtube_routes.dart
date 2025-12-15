import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../youtube_service.dart';
import '../cache.dart';

/// YouTube API routes
Router youtubeRoutes(YouTubeService youtube) {
  final router = Router();

  // Search endpoint
  router.get('/search', (Request request) async {
    final query = request.url.queryParameters['q'];
    
    if (query == null || query.isEmpty) {
      return Response.badRequest(body: json.encode({'error': 'Query is required'}));
    }

    // Check cache
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
      final results = await youtube.search(query);
      
      // Cache results
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

  // Stream URL endpoint
  router.get('/stream/<videoId>', (Request request, String videoId) async {
    // Check cache
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
      final streamData = await youtube.getStreamUrl(videoId);
      
      if (streamData == null) {
        return Response.internalServerError(
          body: json.encode({'error': 'Failed to get stream'}),
        );
      }

      // Cache result
      AppCache.stream.set(videoId, streamData);
      
      print('✓ Stream found: ${streamData['title']}');
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
    // Check cache
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
      
      // Cache results
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

  // Related tracks (YouTube - minimal implementation)
  router.get('/related/<videoId>', (Request request, String videoId) async {
    return Response.ok(
      json.encode({'results': []}),
      headers: {'Content-Type': 'application/json'},
    );
  });

  return router;
}
