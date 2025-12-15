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
      final video = await _yt.videos.get(videoId);
      final manifest = await _yt.videos.streamsClient.getManifest(videoId);
      
      // Get best audio stream
      final audioStreams = manifest.audioOnly.sortByBitrate();
      if (audioStreams.isEmpty) {
        throw Exception('No audio streams found');
      }
      
      final bestAudio = audioStreams.last; // Highest bitrate
      
      return {
        'url': bestAudio.url.toString(),
        'title': video.title,
        'artist': video.author,
        'thumbnail': video.thumbnails.highResUrl,
        'duration': video.duration?.inSeconds ?? 0,
        'bitrate': bestAudio.bitrate.bitsPerSecond,
      };
    } catch (e) {
      print('Stream error for $videoId: $e');
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

  /// Close the client
  void close() {
    _yt.close();
  }
}
