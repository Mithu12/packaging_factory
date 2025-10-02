import { useState, useEffect } from 'react';

interface User {
  user_id: string;
  username: string;
  email: string;
  full_name?: string;
  role?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For now, we'll simulate getting user data from localStorage or API
    // In a real app, this would fetch from your auth service
    const getCurrentUser = async () => {
      try {
        // Check if user data exists in localStorage (from login)
        const userData = localStorage.getItem('user');
        if (userData) {
          setUser(JSON.parse(userData));
        } else {
          // Fallback to a default user for development
          setUser({
            user_id: '1',
            username: 'admin',
            email: 'admin@example.com',
            full_name: 'System Administrator',
            role: 'admin'
          });
        }
      } catch (error) {
        console.error('Error getting current user:', error);
        // Set a default user if there's an error
        setUser({
          user_id: '1',
          username: 'admin',
          email: 'admin@example.com',
          full_name: 'System Administrator',
          role: 'admin'
        });
      } finally {
        setLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  return { user, loading };
}
