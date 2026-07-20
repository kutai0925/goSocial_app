import React, { createContext, useState, useContext } from 'react';
import { logIn, signUp } from '../api/users';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loginUser = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await logIn(credentials);
      setUserId(id);
      setUsername(credentials.username);
    } catch (err) {
      console.error("Login Error:", err);
      setError("Failed to login. Check your credentials.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signupUser = async (credentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const id = await signUp(credentials);
      setUserId(id);
      setUsername(credentials.username);
    } catch (err) {
      console.error("Signup Error:", err);
      setError("Failed to sign up. Username may be taken.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logoutUser = () => {
    setUserId(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        username,
        isAuthenticated: !!userId,
        isLoading,
        error,
        loginUser,
        signupUser,
        logoutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
