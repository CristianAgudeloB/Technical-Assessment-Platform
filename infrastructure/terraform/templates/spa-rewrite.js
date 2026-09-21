function handler(event) {
  var request = event.request;
  var uri = request.uri;

  if (!uri.startsWith('/api/') && !uri.includes('.') && uri !== '/') {
    request.uri = '/index.html';
  }

  return request;
}
