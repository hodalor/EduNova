class OfflineData<T> {
  const OfflineData({
    required this.data,
    this.isStale = false,
  });

  final T data;
  final bool isStale;
}
