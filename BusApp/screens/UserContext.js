import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState({
    userId: 'dummy_user_123',
    role: null,
    profileComplete: false,
    profileData: null,
  });

  const setUserRole = (role) => {
    setUser((prev) => ({ ...prev, role }));
  };

  const setUserProfile = (profileData) => {
    setUser((prev) => ({
      ...prev,
      profileComplete: true,
      profileData,
    }));
  };

  return (
    <UserContext.Provider value={{ user, setUserRole, setUserProfile }}>
      {children}
    </UserContext.Provider>
  );
};