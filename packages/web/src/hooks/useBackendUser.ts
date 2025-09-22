import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '@portfolio-tracker/shared-types';

// Cache the backend user ID in localStorage to avoid repeated API calls
const BACKEND_USER_KEY = 'portfolio-tracker-backend-user';

interface BackendUserCache {
  cognitoId: string;
  backendUser: User;
}

export function useBackendUser() {
  const { user: cognitoUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['backend-user', cognitoUser?.username],
    queryFn: async () => {
      if (!cognitoUser) {
        throw new Error('No authenticated user');
      }

      // Check localStorage cache first
      const cachedData = localStorage.getItem(BACKEND_USER_KEY);
      if (cachedData) {
        try {
          const cache: BackendUserCache = JSON.parse(cachedData);
          if (cache.cognitoId === cognitoUser.username) {
            // Validate that the user still exists in backend
            try {
              const user = await apiClient.users.get(cache.backendUser.id);
              return user;
            } catch (error) {
              // User doesn't exist anymore, remove cache
              localStorage.removeItem(BACKEND_USER_KEY);
            }
          }
        } catch (error) {
          localStorage.removeItem(BACKEND_USER_KEY);
        }
      }

      // Get user email from Cognito
      const email = cognitoUser.signInDetails?.loginId || cognitoUser.username || '';
      const name = cognitoUser.username || email.split('@')[0];

      try {
        // Try to create a new user
        const newUser = await apiClient.users.create({
          email,
          name,
        });

        // Cache the backend user
        const cache: BackendUserCache = {
          cognitoId: cognitoUser.username!,
          backendUser: newUser,
        };
        localStorage.setItem(BACKEND_USER_KEY, JSON.stringify(cache));

        return newUser;
      } catch (error: any) {
        // If user already exists (email conflict), we need to find them
        // Since we don't have a get-by-email endpoint, we'll need to handle this differently
        if (
          error.message?.includes('email already exists') ||
          error.message?.includes('EMAIL_EXISTS')
        ) {
          // For now, we'll throw an error. In a production app, you'd want to:
          // 1. Add a backend endpoint to get user by email
          // 2. Or use the Cognito sub/username as the user ID in DynamoDB
          throw new Error('User with this email already exists. Please contact support.');
        }
        throw error;
      }
    },
    enabled: isAuthenticated && !!cognitoUser,
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: (failureCount, error: any) => {
      // Don't retry if it's an email conflict
      if (error.message?.includes('already exists')) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

// Helper function to clear the backend user cache on sign out
export function clearBackendUserCache() {
  localStorage.removeItem(BACKEND_USER_KEY);
}
