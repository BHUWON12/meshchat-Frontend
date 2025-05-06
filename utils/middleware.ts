import { storage } from '../utils/storage';

/**
 * Checks if the user is authenticated by verifying the presence of a token.
 * Optionally, you can extend this to validate the token with your backend.
 * @returns {Promise<boolean>} Whether the user is authenticated.
 */
export async function requireAuth(): Promise<boolean> {
  const token = await storage.getItem('token');
  return !!token;
}

/**
 * Clears the user's authentication token and optionally performs other cleanup.
 */
export async function logoutAndRedirect() {
  await storage.deleteItem('token');
  // For web, force a redirect. For native, you may want to use navigation.
  if (typeof window !== 'undefined') {
    window.location.href = '/(auth)/login';
  }
}
