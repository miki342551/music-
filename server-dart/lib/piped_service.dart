import 'dart:convert';
import 'package:http/http.dart' as http;

/// Piped API Service - Uses NewPipe Extractor under the hood
/// Provides reliable YouTube stream extraction via public Piped instances
class PipedService {
  // List of public Piped instances (NewPipe Extractor)
  static const List<String> instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://api.piped.yt',
    'https://pipedapi.in.projectsegfau.lt',
    'https://pipedapi.leptons.xyz',
    'https://piped-api.lunar.icu',
    'https://pipedapi.colinslegacy.com',
  ];

  int _currentInstanceIndex = 0;

  String get _currentInstance => instances[_currentInstanceIndex];

  void _rotateInstance() {
    _currentInstanceIndex = (_currentInstanceIndex + 1) % instances.length;
    print('🔄 Rotating to Piped instance: $_currentInstance');
  }

  /// Get stream URL for a video using Piped API (NewPipe Extractor)
  Future<Map<String, dynamic>?> getStreamUrl(String videoId) async {
    // Try each instance until one works
    for (var attempt = 0; attempt < instances.length; attempt++) {
      try {
        final instance = instances[(_currentInstanceIndex + attempt) % instances.length];
        print('🎵 Piped: Getting stream for $videoId from $instance');
        
        final response = await http.get(
          Uri.parse('$instance/streams/$videoId'),
          headers: {'Accept': 'application/json'},
        ).timeout(Duration(seconds: 10));

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          
          // Get best audio stream
          final audioStreams = data['audioStreams'] as List? ?? [];
          if (audioStreams.isEmpty) {
            print('⚠️ No audio streams from $instance');
            continue;
          }

          // Sort by bitrate (highest first), prefer m4a/mp4 format
          audioStreams.sort((a, b) {
            final aFormat = a['format']?.toString().toLowerCase() ?? '';
            final bFormat = b['format']?.toString().toLowerCase() ?? '';
            final aIsM4a = aFormat.contains('m4a') || aFormat.contains('mp4');
            final bIsM4a = bFormat.contains('m4a') || bFormat.contains('mp4');
            
            if (aIsM4a && !bIsM4a) return -1;
            if (!aIsM4a && bIsM4a) return 1;
            
            final aBitrate = (a['bitrate'] as int?) ?? 0;
            final bBitrate = (b['bitrate'] as int?) ?? 0;
            return bBitrate.compareTo(aBitrate);
          });

          final bestAudio = audioStreams.first;
          final streamUrl = bestAudio['url'] as String?;
          
          if (streamUrl == null || streamUrl.isEmpty) {
            print('⚠️ Empty stream URL from $instance');
            continue;
          }

          print('✅ Piped stream found: ${bestAudio['format']} ${bestAudio['bitrate']}bps');
          print('🔗 URL: ${streamUrl.substring(0, 80.clamp(0, streamUrl.length))}...');

          // Update current instance on success
          _currentInstanceIndex = (_currentInstanceIndex + attempt) % instances.length;

          return {
            'url': streamUrl,
            'title': data['title'] ?? 'Unknown',
            'artist': data['uploader'] ?? data['uploaderName'] ?? 'Unknown',
            'thumbnail': data['thumbnailUrl'] ?? 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg',
            'duration': data['duration'] ?? 0,
            'bitrate': bestAudio['bitrate'] ?? 0,
            'codec': bestAudio['codec'] ?? '',
            'format': bestAudio['format'] ?? 'audio',
            'mimeType': bestAudio['mimeType'] ?? 'audio/mp4',
            'source': 'piped',
            'instance': instance,
          };
        } else {
          print('⚠️ Piped instance $instance returned ${response.statusCode}');
        }
      } catch (e) {
        print('⚠️ Piped instance ${instances[(_currentInstanceIndex + attempt) % instances.length]} failed: $e');
      }
    }

    print('❌ All Piped instances failed');
    return null;
  }

  /// Search for videos using Piped API
  Future<List<Map<String, dynamic>>> search(String query, {int limit = 20}) async {
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        final instance = instances[(_currentInstanceIndex + attempt) % instances.length];
        print('🔍 Piped: Searching "$query" on $instance');
        
        final response = await http.get(
          Uri.parse('$instance/search?q=${Uri.encodeComponent(query)}&filter=music_songs'),
          headers: {'Accept': 'application/json'},
        ).timeout(Duration(seconds: 10));

        if (response.statusCode == 200) {
          final data = json.decode(response.body);
          final items = data['items'] as List? ?? [];
          
          final results = items.take(limit).map<Map<String, dynamic>>((item) {
            final videoId = (item['url'] as String?)?.replaceAll('/watch?v=', '') ?? '';
            return {
              'videoId': videoId,
              'title': item['title'] ?? 'Unknown',
              'artist': item['uploaderName'] ?? item['uploader'] ?? 'Unknown',
              'thumbnail': item['thumbnail'] ?? 'https://i.ytimg.com/vi/$videoId/hqdefault.jpg',
              'duration': item['duration'] ?? 0,
            };
          }).toList();

          print('📋 Piped found ${results.length} results');
          return results;
        }
      } catch (e) {
        print('⚠️ Piped search failed on attempt $attempt: $e');
      }
    }
    return [];
  }
}
