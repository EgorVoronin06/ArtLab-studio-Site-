import type { Response } from 'express';

const ACCESS = 'access_token';
const REFRESH = 'refresh_token';

const isProd = process.env.NODE_ENV === 'production';

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeSec: number,
  refreshMaxAgeSec: number
) {
  res.cookie(ACCESS, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: accessMaxAgeSec * 1000
  });
  res.cookie(REFRESH, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    maxAge: refreshMaxAgeSec * 1000
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS, { path: '/', httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax' });
  res.clearCookie(REFRESH, { path: '/', httpOnly: true, secure: isProd, sameSite: isProd ? 'strict' : 'lax' });
}

export const COOKIE_ACCESS = ACCESS;
export const COOKIE_REFRESH = REFRESH;
