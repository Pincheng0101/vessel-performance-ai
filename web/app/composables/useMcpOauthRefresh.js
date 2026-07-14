export const useMcpOauthRefresh = () => {
  const { getRefreshToken, getClientId, setToken, setRefreshToken } = useMcpOauthToken();

  // Exchanges a stored refresh token for a fresh access token (RFC 6749). Returns
  // false when there's nothing to refresh with, or the refresh request fails.
  const refresh = async (mcpServerId, mcpEndpoint) => {
    const refreshToken = getRefreshToken(mcpServerId);
    const clientId = getClientId(mcpServerId);
    if (!refreshToken || !clientId || !mcpEndpoint) return false;

    try {
      const { authorizationServerUrl, metadata, resource } = await oauthUtils.discoverMetadata(mcpEndpoint);
      const tokens = await oauthUtils.refreshToken(authorizationServerUrl, {
        metadata,
        clientInformation: { client_id: clientId },
        refreshToken,
        resource,
      });
      setToken(mcpServerId, tokens.access_token, tokens.expires_in);
      if (tokens.refresh_token) setRefreshToken(mcpServerId, tokens.refresh_token);
      return true;
    } catch {
      return false;
    }
  };

  return {
    refresh,
  };
};
