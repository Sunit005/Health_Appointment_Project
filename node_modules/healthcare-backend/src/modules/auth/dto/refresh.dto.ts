/**
 * Data Transfer Object for the refresh token endpoint.
 * The refresh token is primarily read from the HttpOnly cookie,
 * but may optionally be provided in the body for non-browser clients.
 */
export interface RefreshDto {
  refreshToken?: string;
}
