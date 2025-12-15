/// In-memory cache with TTL support
class CacheEntry<T> {
  final T data;
  final DateTime timestamp;

  CacheEntry(this.data) : timestamp = DateTime.now();

  bool isExpired(Duration ttl) {
    return DateTime.now().difference(timestamp) > ttl;
  }
}

class Cache<T> {
  final Map<String, CacheEntry<T>> _cache = {};
  final Duration ttl;
  final int maxSize;

  Cache({required this.ttl, this.maxSize = 100});

  T? get(String key) {
    final entry = _cache[key];
    if (entry == null) return null;
    if (entry.isExpired(ttl)) {
      _cache.remove(key);
      return null;
    }
    return entry.data;
  }

  void set(String key, T value) {
    // Prune if too large
    if (_cache.length >= maxSize) {
      final firstKey = _cache.keys.first;
      _cache.remove(firstKey);
    }
    _cache[key] = CacheEntry(value);
  }

  bool has(String key) {
    return get(key) != null;
  }

  int get size => _cache.length;

  void clear() {
    _cache.clear();
  }
}

/// Global cache instances
class AppCache {
  static final search = Cache<List<Map<String, dynamic>>>(
    ttl: Duration(hours: 1),
    maxSize: 100,
  );

  static final stream = Cache<Map<String, dynamic>>(
    ttl: Duration(hours: 1),
    maxSize: 200,
  );

  static final spotify = Cache<List<Map<String, dynamic>>>(
    ttl: Duration(hours: 1),
    maxSize: 100,
  );

  static CacheEntry<List<Map<String, dynamic>>>? trending;
  static final trendingTtl = Duration(hours: 3);
}
