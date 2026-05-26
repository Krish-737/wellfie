import React, {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useState,

} from 'react';

import { apiFetch } from '../api/apiFetch';

import type { ProfileSex, ProfileSmoking } from '../utils/userProfile';



// ── Types ─────────────────────────────────────────────────────────────────────



export interface AuthUser {

  id: string;

  email: string;

  full_name: string | null;

  is_verified: boolean;

  sex: ProfileSex | null;

  date_of_birth: string | null;

  age: number | null;

  created_at: string | null;

  updated_at: string | null;

  height_cm: number | null;

  weight_kg: number | null;

  smoking_status: ProfileSmoking | null;

  profile_complete: boolean;

}



export interface ProfileUpdatePayload {

  sex?: ProfileSex;

  date_of_birth?: string;

  height_cm?: number;

  weight_kg?: number;

  smoking_status?: ProfileSmoking;

}



interface AuthContextValue {

  user: AuthUser | null;

  token: string | null;

  scansRemaining: number;

  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;

  loginWithToken: (token: string) => Promise<AuthUser | null>;

  signup: (email: string, password: string, fullName?: string) => Promise<void>;

  logout: () => void;

  refreshEntitlement: () => Promise<void>;

  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;

}



// ── Context ───────────────────────────────────────────────────────────────────



const AuthContext = createContext<AuthContextValue | null>(null);



const TOKEN_KEY = 'mywellfie_token';



function normalizeUser(data: Record<string, unknown>): AuthUser {

  return {

    id: data.id as string,

    email: data.email as string,

    full_name: (data.full_name as string | null) ?? null,

    is_verified: Boolean(data.is_verified),

    sex: (data.sex as ProfileSex | null) ?? null,

    date_of_birth: (data.date_of_birth as string | null) ?? null,

    age: data.age != null ? Number(data.age) : null,

    created_at: (data.created_at as string | null) ?? null,

    updated_at: (data.updated_at as string | null) ?? null,

    height_cm: data.height_cm != null ? Number(data.height_cm) : null,

    weight_kg: data.weight_kg != null ? Number(data.weight_kg) : null,

    smoking_status: (data.smoking_status as ProfileSmoking | null) ?? null,

    profile_complete: Boolean(data.profile_complete),

  };

}



// ── Provider ──────────────────────────────────────────────────────────────────



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const [user, setUser] = useState<AuthUser | null>(null);

  const [scansRemaining, setScansRemaining] = useState<number>(-1);

  const [isLoading, setIsLoading] = useState<boolean>(true);



  const authHeaders = useCallback(

    (tok: string) => ({

      'Content-Type': 'application/json',

      Authorization: `Bearer ${tok}`,

    }),

    [],

  );



  const fetchUser = useCallback(async (tok: string): Promise<AuthUser | null> => {

    try {

      const res = await apiFetch('/auth/me', {

        headers: authHeaders(tok),

      });

      if (!res.ok) return null;

      const data = await res.json();

      return normalizeUser(data);

    } catch {

      return null;

    }

  }, [authHeaders]);



  const fetchEntitlement = useCallback(async (tok: string): Promise<number> => {

    try {

      const res = await apiFetch('/payments/entitlement', {

        headers: authHeaders(tok),

      });

      if (!res.ok) return -1;

      const data = await res.json();

      return data.total_scans_remaining ?? -1;

    } catch {

      return -1;

    }

  }, [authHeaders]);



  useEffect(() => {

    if (!token) {

      setIsLoading(false);

      return;

    }

    (async () => {

      const profile = await fetchUser(token);

      if (profile) {

        setUser(profile);

        const remaining = await fetchEntitlement(token);

        setScansRemaining(remaining);

      } else {

        localStorage.removeItem(TOKEN_KEY);

        setToken(null);

      }

      setIsLoading(false);

    })();

  }, [token, fetchUser, fetchEntitlement]);



  const login = useCallback(async (email: string, password: string) => {

    const res = await apiFetch('/auth/login', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ email, password }),

    });

    if (!res.ok) {

      const err = await res.json();

      throw new Error(err.detail || 'Login failed');

    }

    const data = await res.json();

    const tok: string = data.access_token;



    localStorage.setItem(TOKEN_KEY, tok);

    setToken(tok);



    const profile = await fetchUser(tok);

    setUser(profile);



    const remaining = await fetchEntitlement(tok);

    setScansRemaining(remaining);

  }, [fetchUser, fetchEntitlement]);



  const loginWithToken = useCallback(

    async (tok: string): Promise<AuthUser | null> => {

      localStorage.setItem(TOKEN_KEY, tok);

      setToken(tok);



      const profile = await fetchUser(tok);

      if (!profile) {

        localStorage.removeItem(TOKEN_KEY);

        setToken(null);

        throw new Error('Invalid sign-in token');

      }

      setUser(profile);



      const remaining = await fetchEntitlement(tok);

      setScansRemaining(remaining);

      return profile;

    },

    [fetchUser, fetchEntitlement],

  );



  const signup = useCallback(

    async (email: string, password: string, fullName?: string) => {

      const res = await apiFetch('/auth/signup', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ email, password, full_name: fullName || null }),

      });

      if (!res.ok) {

        const err = await res.json();

        throw new Error(err.detail || 'Signup failed');

      }

      await login(email, password);

    },

    [login],

  );



  const logout = useCallback(() => {

    localStorage.removeItem(TOKEN_KEY);

    setToken(null);

    setUser(null);

    setScansRemaining(-1);

  }, []);



  const refreshEntitlement = useCallback(async () => {

    if (!token) return;

    const remaining = await fetchEntitlement(token);

    setScansRemaining(remaining);

  }, [token, fetchEntitlement]);



  const updateProfile = useCallback(

    async (payload: ProfileUpdatePayload) => {

      if (!token) throw new Error('Not signed in');

      const res = await apiFetch('/auth/me/profile', {

        method: 'PATCH',

        headers: authHeaders(token),

        body: JSON.stringify(payload),

      });

      if (!res.ok) {

        const err = await res.json();

        const detail = err.detail;

        const message =

          typeof detail === 'string'

            ? detail

            : Array.isArray(detail)

              ? detail.map((d: { msg?: string }) => d.msg).join(', ')

              : 'Failed to update profile';

        throw new Error(message);

      }

      const data = await res.json();

      setUser(normalizeUser(data));

    },

    [token, authHeaders],

  );



  return (

    <AuthContext.Provider

      value={{

        user,

        token,

        scansRemaining,

        isLoading,

        login,

        loginWithToken,

        signup,

        logout,

        refreshEntitlement,

        updateProfile,

      }}

    >

      {children}

    </AuthContext.Provider>

  );

};



export const useAuth = (): AuthContextValue => {

  const ctx = useContext(AuthContext);

  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');

  return ctx;

};

