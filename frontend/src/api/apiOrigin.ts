const HOSTED_API_URL = 'https://edunova-e4bo.onrender.com/api';
const HOSTED_SOCKET_URL = 'https://edunova-e4bo.onrender.com';

const isLoopbackUrl = (value: string) => /localhost|127\.0\.0\.1/i.test(value);

const pageIsLoopback = () => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }

  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const resolveHostedUrl = (configured: string | undefined, hostedUrl: string) => {
  const value = (configured || '').trim();
  if ((!value || isLoopbackUrl(value)) && !pageIsLoopback()) {
    return hostedUrl;
  }

  return value || hostedUrl;
};

export const resolveApiBaseUrl = () =>
  resolveHostedUrl(process.env.REACT_APP_API_URL, HOSTED_API_URL);

export const resolveSocketUrl = (apiBaseUrl: string) =>
  resolveHostedUrl(process.env.REACT_APP_SOCKET_URL, HOSTED_SOCKET_URL).replace(
    /\/api\/?$/,
    ''
  ) || apiBaseUrl.replace(/\/api\/?$/, '');
