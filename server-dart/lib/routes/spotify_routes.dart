import 'dart:convert';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import '../spotify_service.dart';
import '../youtube_service.dart';
import '../cache.dart';

/// Spotify API routes
Router spotifyRoutes(SpotifyService spotify, YouTubeService youtube) {
  final router = Router();

  // Spotify search
  router.get('/search', (Request request) async {
    final query = request.url.queryParameters['q'];
    
    if (query == null || query.isEmpty) {
      return Response.badRequest(body: json.encode({'error': 'Query is required'}));
    }

    // Check cache
    final cacheKey = 'spotify:${query.toLowerCase()}';
    final cached = AppCache.spotify.get(cacheKey);
    if (cached != null) {
      print('⚡ Cache hit for Spotify search: $query');
      return Response.ok(
        json.encode({'results': cached}),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      final results = await spotify.searchTracks(query);
      
      if (results.isEmpty) {
        // Return error so frontend can fallback to YouTube
        return Response.internalServerError(
          body: json.encode({'error': 'Spotify search failed', 'fallback': true}),
        );
      }

      // Cache results
      AppCache.spotify.set(cacheKey, results);
      
      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Spotify search error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Spotify search failed', 'fallback': true}),
      );
    }
  });

  // Match Spotify track to YouTube video
  router.get('/match', (Request request) async {
    final title = request.url.queryParameters['title'];
    final artist = request.url.queryParameters['artist'];
    
    if (title == null || title.isEmpty) {
      return Response.badRequest(body: json.encode({'error': 'Title is required'}));
    }

    final searchQuery = artist != null && artist.isNotEmpty ? '$title $artist' : title;

    // Check cache
    final cacheKey = 'match:${searchQuery.toLowerCase()}';
    final cached = AppCache.search.get(cacheKey);
    if (cached != null && cached.isNotEmpty) {
      print('⚡ Cache hit for match: $searchQuery');
      final item = cached[0];
      return Response.ok(
        json.encode({
          'videoId': item['videoId'],
          'ytTitle': item['title'],
          'ytArtist': item['artist'],
        }),
        headers: {'Content-Type': 'application/json'},
      );
    }

    try {
      print('\n🔗 Matching to YouTube: $searchQuery');
      
      final results = await youtube.search(searchQuery, limit: 1);
      
      if (results.isEmpty) {
        return Response.notFound(json.encode({'error': 'No match found'}));
      }

      final item = results[0];
      final result = {
        'videoId': item['videoId'],
        'ytTitle': item['title'],
        'ytArtist': item['artist'],
      };

      // Cache result
      AppCache.search.set(cacheKey, [item]);
      
      print('✓ Matched to: ${item['videoId']} - ${item['title']}');
      return Response.ok(
        json.encode(result),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Match error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to match track'}),
      );
    }
  });

  // Related tracks
  router.get('/related/<spotifyId>', (Request request, String spotifyId) async {
    try {
      final results = await spotify.getRelatedTracks(spotifyId);
      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Related tracks error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get related tracks', 'results': []}),
      );
    }
  });

  // Made for you recommendations
  router.get('/made-for-you', (Request request) async {
    final seeds = request.url.queryParameters['seeds'];
    final type = request.url.queryParameters['type'] ?? 'default';
    
    if (seeds == null || seeds.isEmpty) {
      return Response.badRequest(body: json.encode({'error': 'Seed tracks required'}));
    }

    try {
      final results = await spotify.getMadeForYou(seeds, type);
      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Made For You error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get recommendations', 'results': []}),
      );
    }
  });

  // Trending / new releases
  router.get('/trending', (Request request) async {
    try {
      final results = await spotify.getTrending();
      
      if (results.isEmpty) {
        return Response.internalServerError(
          body: json.encode({'error': 'Failed to get trending', 'results': []}),
        );
      }

      return Response.ok(
        json.encode({'results': results}),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Spotify trending error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get trending', 'results': []}),
      );
    }
  });

  return router;
}
