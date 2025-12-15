import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

/// Spotify API service for metadata and recommendations
class SpotifyService {
  final String? clientId;
  final String? clientSecret;
  
  String? _accessToken;
  DateTime _tokenExpiresAt = DateTime.fromMillisecondsSinceEpoch(0);

  SpotifyService({
    String? clientId,
    String? clientSecret,
  })  : clientId = clientId ?? Platform.environment['SPOTIFY_CLIENT_ID'],
        clientSecret = clientSecret ?? Platform.environment['SPOTIFY_CLIENT_SECRET'];

  bool get hasCredentials => clientId != null && clientSecret != null && 
      clientId!.isNotEmpty && clientSecret!.isNotEmpty;

  /// Get access token using Client Credentials flow
  Future<String?> getToken() async {
    // Return cached token if still valid
    if (_accessToken != null && DateTime.now().isBefore(_tokenExpiresAt.subtract(Duration(seconds: 60)))) {
      return _accessToken;
    }

    if (!hasCredentials) {
      print('⚠️ Spotify credentials not configured');
      return null;
    }

    try {
      print('🔑 Refreshing Spotify token...');
      
      final credentials = base64Encode(utf8.encode('$clientId:$clientSecret'));
      
      final response = await http.post(
        Uri.parse('https://accounts.spotify.com/api/token'),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic $credentials',
        },
        body: 'grant_type=client_credentials',
      );

      if (response.statusCode != 200) {
        throw Exception('Spotify auth failed: ${response.body}');
      }

      final data = json.decode(response.body);
      _accessToken = data['access_token'];
      _tokenExpiresAt = DateTime.now().add(Duration(seconds: data['expires_in']));
      
      print('✓ Spotify token refreshed');
      return _accessToken;
    } catch (e) {
      print('Spotify token error: $e');
      return null;
    }
  }

  /// Search tracks on Spotify
  Future<List<Map<String, dynamic>>> searchTracks(String query) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      print('🎵 Spotify search: $query');
      
      final response = await http.get(
        Uri.parse('https://api.spotify.com/v1/search?q=${Uri.encodeComponent(query)}&type=track&limit=20'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Spotify API error: ${response.statusCode}');
      }

      final data = json.decode(response.body);
      final tracks = data['tracks']['items'] as List;

      final results = tracks.map<Map<String, dynamic>>((track) {
        final artists = (track['artists'] as List).map((a) => a['name']).join(', ');
        final artistId = (track['artists'] as List).isNotEmpty ? track['artists'][0]['id'] : null;
        final images = track['album']['images'] as List;
        
        return {
          'spotifyId': track['id'],
          'title': track['name'],
          'artist': artists,
          'artistId': artistId,
          'album': track['album']['name'],
          'albumId': track['album']['id'],
          'thumbnail': images.isNotEmpty ? images[0]['url'] : null,
          'duration': (track['duration_ms'] / 1000).floor(),
          'ytSearchQuery': '${track['name']} ${(track['artists'] as List).isNotEmpty ? track['artists'][0]['name'] : ''}',
        };
      }).toList();

      print('📋 Found ${results.length} Spotify results');
      return results;
    } catch (e) {
      print('Spotify search error: $e');
      return [];
    }
  }

  /// Get related tracks (recommendations)
  Future<List<Map<String, dynamic>>> getRelatedTracks(String spotifyId) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      print('📻 Getting related tracks for: $spotifyId');
      
      final response = await http.get(
        Uri.parse('https://api.spotify.com/v1/recommendations?seed_tracks=$spotifyId&limit=20'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Spotify API error: ${response.statusCode}');
      }

      final data = json.decode(response.body);
      return _parseTracksResponse(data['tracks'] as List);
    } catch (e) {
      print('Related tracks error: $e');
      return [];
    }
  }

  /// Get personalized recommendations
  Future<List<Map<String, dynamic>>> getMadeForYou(String seeds, String type) async {
    final token = await getToken();
    if (token == null) return [];

    try {
      print('🎯 Getting Made For You: $type with seeds: $seeds');
      
      // Don't URI encode the seeds - Spotify expects comma-separated IDs directly
      // Also limit to 5 seeds max as per Spotify API docs
      final seedList = seeds.split(',').take(5).join(',');
      String params = 'seed_tracks=$seedList&limit=25';
      
      switch (type) {
        case 'chill':
          params += '&target_energy=0.4&target_valence=0.5&target_tempo=100';
          break;
        case 'energetic':
          params += '&target_energy=0.8&target_danceability=0.7&target_tempo=130';
          break;
        case 'discovery':
          params += '&min_popularity=20&max_popularity=60';
          break;
        case 'focus':
          params += '&target_instrumentalness=0.5&target_energy=0.5&target_tempo=110';
          break;
      }

      final url = 'https://api.spotify.com/v1/recommendations?$params';
      print('📡 Calling: $url');
      
      final response = await http.get(
        Uri.parse(url),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        print('❌ Spotify response: ${response.statusCode} - ${response.body}');
        throw Exception('Spotify API error: ${response.statusCode}');
      }

      final data = json.decode(response.body);
      final tracks = data['tracks'] as List?;
      if (tracks == null || tracks.isEmpty) {
        print('⚠️ No tracks returned from recommendations');
        return [];
      }
      
      final results = _parseTracksResponse(tracks);
      print('✓ Got ${results.length} Made For You tracks');
      return results;
    } catch (e) {
      print('Made For You error: $e');
      return [];
    }
  }

  /// Get trending/new releases
  Future<List<Map<String, dynamic>>> getTrending() async {
    final token = await getToken();
    if (token == null) return [];

    try {
      print('📈 Getting Spotify new releases');
      
      final response = await http.get(
        Uri.parse('https://api.spotify.com/v1/browse/new-releases?limit=20'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Spotify API error: ${response.statusCode}');
      }

      final data = json.decode(response.body);
      final albums = data['albums']['items'] as List;

      // Get first track from each album
      final results = <Map<String, dynamic>>[];
      
      for (var album in albums.take(10)) {
        try {
          final tracksRes = await http.get(
            Uri.parse('https://api.spotify.com/v1/albums/${album['id']}/tracks?limit=1'),
            headers: {'Authorization': 'Bearer $token'},
          );
          
          if (tracksRes.statusCode == 200) {
            final tracksData = json.decode(tracksRes.body);
            final items = tracksData['items'] as List;
            
            if (items.isNotEmpty) {
              final track = items[0];
              final artists = (track['artists'] as List).map((a) => a['name']).join(', ');
              final images = album['images'] as List;
              
              results.add({
                'spotifyId': track['id'],
                'title': track['name'],
                'artist': artists,
                'album': album['name'],
                'thumbnail': images.isNotEmpty ? images[0]['url'] : null,
                'duration': (track['duration_ms'] / 1000).floor(),
                'ytSearchQuery': '${track['name']} ${(track['artists'] as List).isNotEmpty ? track['artists'][0]['name'] : ''}',
              });
            }
          }
        } catch (e) {
          // Skip failed album
        }
      }

      print('📋 Got ${results.length} trending tracks');
      return results;
    } catch (e) {
      print('Spotify trending error: $e');
      return [];
    }
  }

  List<Map<String, dynamic>> _parseTracksResponse(List tracks) {
    return tracks.map<Map<String, dynamic>>((track) {
      final artists = (track['artists'] as List).map((a) => a['name']).join(', ');
      final images = track['album']['images'] as List;
      
      return {
        'spotifyId': track['id'],
        'title': track['name'],
        'artist': artists,
        'album': track['album']['name'],
        'thumbnail': images.isNotEmpty ? images[0]['url'] : null,
        'duration': (track['duration_ms'] / 1000).floor(),
        'ytSearchQuery': '${track['name']} ${(track['artists'] as List).isNotEmpty ? track['artists'][0]['name'] : ''}',
      };
    }).toList();
  }
}
