import 'dart:convert';
import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf_router/shelf_router.dart';
import 'package:http/http.dart' as http;
import '../youtube_service.dart';
import '../cache.dart';

// Store stream URLs for proxy access
final Map<String, String> _streamUrlCache = {};

/// YouTube API routes
Router youtubeRoutes(YouTubeService youtube) {
  final router = Router();

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

  // Stream URL endpoint - returns JSON with proxy URL
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
      final streamData = await youtube.getStreamUrl(videoId);
      
      if (streamData == null) {
        return Response.internalServerError(
          body: json.encode({'error': 'Failed to get stream'}),
        );
      }

      // Store the direct URL for proxy endpoint
      _streamUrlCache[videoId] = streamData['url'] as String;
      
      // Return proxy URL instead of direct YouTube URL
      final host = request.requestedUri.host;
      final port = request.requestedUri.port;
      final scheme = request.requestedUri.scheme;
      final proxyUrl = '$scheme://$host${port != 80 && port != 443 ? ':$port' : ''}/api/audio/$videoId';
      
      final responseData = {
        ...streamData,
        'url': proxyUrl, // Use our proxy instead of direct YouTube URL
        'directUrl': streamData['url'], // Keep original for debugging
      };

      AppCache.stream.set(videoId, responseData);
      
      print('✓ Stream found: ${streamData['title']}');
      print('🔗 Proxy URL: $proxyUrl');
      return Response.ok(
        json.encode(responseData),
        headers: {'Content-Type': 'application/json'},
      );
    } catch (e) {
      print('Stream error: $e');
      return Response.internalServerError(
        body: json.encode({'error': 'Failed to get stream'}),
      );
    }
  });

  // Audio proxy endpoint - streams audio through our server
  router.get('/audio/<videoId>', (Request request, String videoId) async {
    print('🎧 Audio proxy request for: $videoId');
    
    // Get the direct URL from cache or fetch it
    String? directUrl = _streamUrlCache[videoId];
    
    if (directUrl == null) {
      // Need to fetch the stream URL first
      final streamData = await youtube.getStreamUrl(videoId);
      if (streamData == null) {
        return Response.notFound('Stream not found');
      }
      directUrl = streamData['url'] as String;
      _streamUrlCache[videoId] = directUrl;
    }

    try {
      print('🔗 Proxying audio from YouTube CDN');
      
      // Handle range requests for seeking
      final rangeHeader = request.headers['range'];
      final headers = <String, String>{
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      };
      
      if (rangeHeader != null) {
        headers['Range'] = rangeHeader;
        print('📍 Range request: $rangeHeader');
      }
      
      // Make request to YouTube CDN
      final response = await http.get(
        Uri.parse(directUrl),
        headers: headers,
      );

      if (response.statusCode != 200 && response.statusCode != 206) {
        print('❌ YouTube CDN error: ${response.statusCode}');
        // URL might be expired, try to refresh
        final newStreamData = await youtube.getStreamUrl(videoId);
        if (newStreamData != null) {
          _streamUrlCache[videoId] = newStreamData['url'] as String;
          // Retry with new URL
          final retryResponse = await http.get(
            Uri.parse(newStreamData['url'] as String),
            headers: headers,
          );
          if (retryResponse.statusCode == 200 || retryResponse.statusCode == 206) {
            return Response(
              retryResponse.statusCode,
              body: retryResponse.bodyBytes,
              headers: {
                'Content-Type': retryResponse.headers['content-type'] ?? 'audio/mp4',
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                if (retryResponse.headers['content-length'] != null)
                  'Content-Length': retryResponse.headers['content-length']!,
                if (retryResponse.headers['content-range'] != null)
                  'Content-Range': retryResponse.headers['content-range']!,
              },
            );
          }
        }
        return Response.internalServerError(body: 'Failed to proxy audio');
      }

      print('✅ Proxying ${response.bodyBytes.length} bytes');
      
      return Response(
        response.statusCode,
        body: response.bodyBytes,
        headers: {
          'Content-Type': response.headers['content-type'] ?? 'audio/mp4',
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          if (response.headers['content-length'] != null)
            'Content-Length': response.headers['content-length']!,
          if (response.headers['content-range'] != null)
            'Content-Range': response.headers['content-range']!,
        },
      );
    } catch (e, stack) {
      print('❌ Audio proxy error: $e');
      print('Stack: $stack');
      return Response.internalServerError(body: 'Audio proxy failed: $e');
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
