class TempFilePresignedUrl {
  constructor({
    expires_at,
    url,
  } = {}) {
    this.expiresAt = expires_at;
    this.url = url;
  }
}

export default TempFilePresignedUrl;
