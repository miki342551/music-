import 'package:youtube_explode_dart/youtube_explode_dart.dart';

/// YouTube service using youtube_explode_dart
class YouTubeService {
  final YoutubeExplode _yt = YoutubeExplode();

  /// Search for videos
  Future<List<Map<String, dynamic>>> search(String query, {int limit = 20}) async {
    try {
      final searchList = await _yt.search.search(query);
      
      final results = <Map<String, dynamic>>[];
      for (var i = 0; i < limit && i < searchList.length; i++) {
        final video = searchList[i];
        results.add({
          'videoId': video.id.value,
          'title': video.title,
          'artist': video.author,
          'thumbnail': video.thumbnails.highResUrl,
          'duration': video.duration?.inSeconds ?? 0,
        });
      }
      
      return results;
    } catch (e) {
      print('YouTube search error: $e');
      return [];
    }
  }

  /// Get stream URL for a video
  Future<Map<String, dynamic>?> getStreamUrl(String videoId) async {
    try {
      print('🎵 Getting stream for: $videoId');
      
      final video = await _yt.videos.get(videoId);
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      
      final audioStreams = manifest.audioOnly.toList();
      if (audioStreams.isEmpty) {
        throw Exception('No audio streams found');
      }
      
      print('📊 Found ${audioStreams.length} audio streams');
      
      // Log available streams
      for (var stream in audioStreams) {
        print('  - ${stream.container.name} | ${stream.audioCodec} | ${stream.bitrate.kiloBitsPerSecond.toStringAsFixed(0)}kbps');
      }
      
      // Prefer MP4/AAC for better mobile compatibility
      // Sort by: 1. Container (mp4 first), 2. Bitrate (higher first)
      audioStreams.sort((a, b) {
        // Prefer MP4 container (AAC codec) for mobile compatibility
        final aIsMp4 = a.container.name.toLowerCase() == 'mp4' || 
                       a.audioCodec.toLowerCase().contains('aac') ||
                       a.audioCodec.toLowerCase().contains('mp4a');
        final bIsMp4 = b.container.name.toLowerCase() == 'mp4' || 
                       b.audioCodec.toLowerCase().contains('aac') ||
                       b.audioCodec.toLowerCase().contains('mp4a');
        
        if (aIsMp4 && !bIsMp4) return -1;
        if (!aIsMp4 && bIsMp4) return 1;
        
        // Then sort by bitrate (higher first)
        return b.bitrate.bitsPerSecond.compareTo(a.bitrate.bitsPerSecond);
      });
      
      final bestAudio = audioStreams.first;
      
      print('✅ Selected: ${bestAudio.container.name} | ${bestAudio.audioCodec} | ${bestAudio.bitrate.kiloBitsPerSecond.toStringAsFixed(0)}kbps');
      print('🔗 URL: ${bestAudio.url.toString().substring(0, 80)}...');
      
      return {
        'url': bestAudio.url.toString(),
        'title': video.title,
        'artist': video.author,
        'thumbnail': video.thumbnails.highResUrl,
        'duration': video.duration?.inSeconds ?? 0,
        'bitrate': bestAudio.bitrate.bitsPerSecond,
        'codec': bestAudio.audioCodec,
        'container': bestAudio.container.name,
        'mimeType': 'audio/${bestAudio.container.name}',
      };
    } catch (e, stackTrace) {
      print('❌ Stream error for $videoId: $e');
      print('Stack trace: $stackTrace');
      return null;
    }
  }

  /// Get video info
  Future<Map<String, dynamic>?> getVideoInfo(String videoId) async {
    try {
      final video = await _yt.videos.get(videoId);
      
      return {
        'videoId': video.id.value,
        'title': video.title,
        'artist': video.author,
        'thumbnail': video.thumbnails.highResUrl,
        'duration': video.duration?.inSeconds ?? 0,
        'description': video.description,
      };
    } catch (e) {
      print('Video info error: $e');
      return null;
    }
  }

  /// Get search suggestions
  Future<List<String>> getSuggestions(String query) async {
    try {
      final suggestions = await _yt.search.getQuerySuggestions(query);
      return suggestions.take(8).toList();
    } catch (e) {
      print('Suggestions error: $e');
      return [];
    }
  }

  /// Get audio stream bytes for a video - uses youtube_explode's authenticated client
  Future<List<int>?> getAudioBytes(String videoId) async {
    try {
      print('🎵 Streaming audio bytes for: $videoId');
      
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      final audioStreams = manifest.audioOnly.toList();
      
      if (audioStreams.isEmpty) {
        throw Exception('No audio streams found');
      }
      
      // Sort: prefer MP4/AAC, then by bitrate
      audioStreams.sort((a, b) {
        final aIsMp4 = a.container.name.toLowerCase() == 'mp4' || 
                       a.audioCodec.toLowerCase().contains('mp4a');
        final bIsMp4 = b.container.name.toLowerCase() == 'mp4' || 
                       b.audioCodec.toLowerCase().contains('mp4a');
        
        if (aIsMp4 && !bIsMp4) return -1;
        if (!aIsMp4 && bIsMp4) return 1;
        return b.bitrate.bitsPerSecond.compareTo(a.bitrate.bitsPerSecond);
      });
      
      final bestAudio = audioStreams.first;
      print('✅ Streaming: ${bestAudio.container.name} | ${bestAudio.audioCodec} | ${bestAudio.bitrate.kiloBitsPerSecond.toStringAsFixed(0)}kbps');
      
      // Use youtube_explode's stream client which handles authentication
      final stream = _yt.videos.streamsClient.get(bestAudio);
      final bytes = <int>[];
      
      await for (final chunk in stream) {
        bytes.addAll(chunk);
      }
      
      print('✅ Downloaded ${bytes.length} bytes');
      return bytes;
    } catch (e, stack) {
      print('❌ Audio stream error: $e');
      print('Stack: $stack');
      return null;
    }
  }

  /// Get audio stream info for a video
  Future<AudioOnlyStreamInfo?> getBestAudioStream(String videoId) async {
    try {
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      final audioStreams = manifest.audioOnly.toList();
      
      if (audioStreams.isEmpty) return null;
      
      // Sort: prefer MP4/AAC, then by bitrate
      audioStreams.sort((a, b) {
        final aIsMp4 = a.container.name.toLowerCase() == 'mp4' || 
                       a.audioCodec.toLowerCase().contains('mp4a');
        final bIsMp4 = b.container.name.toLowerCase() == 'mp4' || 
                       b.audioCodec.toLowerCase().contains('mp4a');
        
        if (aIsMp4 && !bIsMp4) return -1;
        if (!aIsMp4 && bIsMp4) return 1;
        return b.bitrate.bitsPerSecond.compareTo(a.bitrate.bitsPerSecond);
      });
      
      return audioStreams.first;
    } catch (e) {
      print('Error getting audio stream: $e');
      return null;
    }
  }

  /// Get the YoutubeExplode instance for direct stream access
  YoutubeExplode get yt => _yt;

  /// Close the client
  void close() {
    _yt.close();
  }
}
