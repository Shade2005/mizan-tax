// ============================================================================
// Mizan (ميزان) - Business Multi-Entity Context
// Manages active business entity switching, tenant sync, authenticated user profile
// ============================================================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import {
  MizanApi,
  SaveTradeLicensePayload,
  STORAGE_KEY_AUTH_TOKEN,
  STORAGE_KEY_USER_PROFILE,
} from '../services/api';
import { AppStorage } from '../utils/storage';
import { auth, onAuthStateChanged } from '../services/firebase';

export interface BusinessEntity {
  id: string;
  organisationId?: string;
  legalName: string;
  tradeName?: string;
  legalEntityType: string;
  jurisdictionType: string;
  licensingAuthority: string;
  emirate: string;
  tradeLicenseNumber: string;
  issueDate?: string;
  expiryDate?: string;
  vatTrn?: string;
  corporateTaxTrn?: string;
  annualRevenueEstimateAED: number;
  taxRegime: string;
  isSbrEligible: boolean;
  isQfzpEligible: boolean;
  verificationStatus: string;
  address?: string;
  businessActivities?: string[];
  icon?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role?: string;
  organisationName?: string;
}

const STORAGE_KEY_ACTIVE_BIZ = 'mizan_active_business_id';
const STORAGE_KEY_USER_KEY = 'mizan_current_user_key';
const STORAGE_KEY_CACHED_BUSINESSES = 'mizan_cached_businesses';

interface BusinessContextType {
  businesses: BusinessEntity[];
  activeBusiness: BusinessEntity | null;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  error: string | null;
  currentUserKey: 'user-a' | 'user-b' | 'superadmin';
  setActiveBusinessId: (id: string) => void;
  addOrUpdateBusiness: (entity: Partial<BusinessEntity>) => Promise<BusinessEntity>;
  refreshBusinesses: () => Promise<void>;
  switchTenantUser: (userKey: 'user-a' | 'user-b' | 'superadmin') => Promise<void>;
  logout: () => Promise<void>;
  loadUserProfile: () => Promise<UserProfile | null>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessEntity[]>([]);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserKey, setCurrentUserKey] = useState<'user-a' | 'user-b' | 'superadmin'>('user-a');

  /**
   * Loads current authenticated user profile
   * Priority 1: Instant zero-latency resolution from Firebase Auth currentUser
   * Priority 2: Stored cached profile from AsyncStorage
   * Priority 3: Remote backend fetch with graceful offline degradation
   */
  const loadUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      // 1. Instant resolution from Firebase Auth session (0 ms latency)
      if (auth.currentUser) {
        const u = auth.currentUser;
        const profile: UserProfile = {
          id: u.uid,
          email: u.email || '',
          fullName: u.displayName || u.email?.split('@')[0] || 'Tax Admin',
          phone: u.phoneNumber || undefined,
          role: 'ADMIN',
          organisationName: u.displayName ? `${u.displayName}'s Entity` : 'UAE Enterprise',
        };
        setCurrentUser(profile);
        setIsAuthenticated(true);
        AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile)).catch(() => {});
        return profile;
      }

      // 2. Fallback to cached profile if offline
      const storedProfileStr = await AppStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (storedProfileStr) {
        try {
          const parsed = JSON.parse(storedProfileStr);
          setCurrentUser(parsed);
          setIsAuthenticated(true);
          return parsed;
        } catch {}
      }

      // 3. Fallback query to backend profile endpoint
      const res = await MizanApi.getProfile();
      if (res?.user) {
        const profile: UserProfile = {
          id: res.user.id,
          email: res.user.email,
          fullName: res.user.fullName,
          phone: res.user.phone,
          role: res.activeOrganisation?.role || 'ADMIN',
          organisationName: res.activeOrganisation?.name,
        };
        setCurrentUser(profile);
        setIsAuthenticated(true);
        await AppStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
        return profile;
      }
    } catch (err: any) {
      // If unauthorized, clear state
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    }
    return null;
  }, []);

  /**
   * Fetches businesses strictly for the authenticated session
   */
  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const hasStoredToken = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      if (!hasStoredToken && !auth.currentUser) {
        // Unauthenticated session: strictly do not load demo entities
        setIsAuthenticated(false);
        setCurrentUser(null);
        setBusinesses([]);
        setActiveBusinessIdState(null);
        setIsLoading(false);
        return;
      }

      await MizanApi.ensureAuthenticated();
      await loadUserProfile();

      const data = await MizanApi.getBusinesses();

      const mapped: BusinessEntity[] = (data || []).map((b: any) => ({
        id: b.id || `biz-${b.tradeLicenseNumber}`,
        organisationId: b.organisationId,
        legalName: b.legalName || 'Unnamed Business',
        tradeName: b.tradeName || b.legalName,
        legalEntityType: b.legalEntityType || 'LLC',
        jurisdictionType: b.jurisdictionType || 'MAINLAND',
        licensingAuthority: b.licensingAuthority || 'Department of Economy and Tourism (DET)',
        emirate: b.emirate || 'Dubai',
        tradeLicenseNumber: b.tradeLicenseNumber || '',
        issueDate: b.issueDate,
        expiryDate: b.expiryDate,
        vatTrn: b.vatTrn,
        corporateTaxTrn: b.corporateTaxTrn,
        annualRevenueEstimateAED: b.annualRevenueEstimateAED ?? 1200000,
        taxRegime: b.taxRegime || 'Mainland LLC • SBR Eligible (0% up to AED 3M)',
        isSbrEligible: b.isSbrEligible ?? true,
        isQfzpEligible: b.isQfzpEligible ?? false,
        verificationStatus: b.verificationStatus || 'OCR_EXTRACTED',
        address: b.address,
        businessActivities: b.businessActivities || [],
        icon: b.legalEntityType === 'NATURAL_PERSON' ? 'person-outline' : b.jurisdictionType === 'FREE_ZONE' ? 'globe-outline' : 'business-outline',
      }));

      if (mapped.length > 0) {
        setBusinesses(mapped);
        await AppStorage.setItem(STORAGE_KEY_CACHED_BUSINESSES, JSON.stringify(mapped));
      } else {
        const cachedStr = await AppStorage.getItem(STORAGE_KEY_CACHED_BUSINESSES);
        if (cachedStr) {
          try {
            const cachedList = JSON.parse(cachedStr);
            if (Array.isArray(cachedList) && cachedList.length > 0) {
              setBusinesses(cachedList);
              const activeId = cachedList[0]?.id;
              if (activeId) {
                setActiveBusinessIdState(activeId);
                await AppStorage.setItem(STORAGE_KEY_ACTIVE_BIZ, activeId);
              }
              setIsLoading(false);
              return;
            }
          } catch {}
        }
        setBusinesses([]);
      }

      // Restore or validate active business
      const storedActiveId = await AppStorage.getItem(STORAGE_KEY_ACTIVE_BIZ);
      const isValidStored = storedActiveId && mapped.some((b) => b.id === storedActiveId);

      if (isValidStored) {
        setActiveBusinessIdState(storedActiveId);
      } else if (mapped.length > 0) {
        setActiveBusinessIdState(mapped[0].id);
        await AppStorage.setItem(STORAGE_KEY_ACTIVE_BIZ, mapped[0].id);
      } else {
        setActiveBusinessIdState(null);
      }
    } catch (err: any) {
      console.warn('Failed to load businesses from backend:', err?.message || err);
      setError(err?.message || 'Failed to connect to Mizan business service');
      
      const cachedStr = await AppStorage.getItem(STORAGE_KEY_CACHED_BUSINESSES).catch(() => null);
      if (cachedStr) {
        try {
          const cachedList = JSON.parse(cachedStr);
          if (Array.isArray(cachedList) && cachedList.length > 0) {
            setBusinesses(cachedList);
            setActiveBusinessIdState(cachedList[0]?.id || null);
            setIsLoading(false);
            return;
          }
        } catch {}
      }
      setBusinesses([]);
      setActiveBusinessIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          MizanApi.setAuthToken(idToken);
          await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, idToken);
          setIsAuthenticated(true);
          await loadUserProfile();
          await fetchBusinesses();
        } catch (e) {
          console.warn('Firebase auth state listener error:', e);
          setIsLoading(false);
        }
      } else {
        const hasToken = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (hasToken) {
          setIsAuthenticated(true);
          await loadUserProfile();
          await fetchBusinesses();
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
          setBusinesses([]);
          setActiveBusinessIdState(null);
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchBusinesses, loadUserProfile]);

  const setActiveBusinessId = useCallback((id: string) => {
    const exists = businesses.some((b) => b.id === id);
    if (exists) {
      setActiveBusinessIdState(id);
      AppStorage.setItem(STORAGE_KEY_ACTIVE_BIZ, id).catch(() => {});
      Haptics.selectionAsync().catch(() => {});
    }
  }, [businesses]);

  const addOrUpdateBusiness = useCallback(async (entity: Partial<BusinessEntity>): Promise<BusinessEntity> => {
    setIsLoading(true);
    try {
      const payload: SaveTradeLicensePayload = {
        tradeLicenseNumber: entity.tradeLicenseNumber || `TL-${Date.now().toString().slice(-6)}`,
        legalName: entity.legalName || 'New Venture LLC',
        tradeName: entity.tradeName || entity.legalName,
        legalEntityType: (entity.legalEntityType as any) || 'LLC',
        jurisdictionType: (entity.jurisdictionType as any) || 'MAINLAND',
        licensingAuthority: entity.licensingAuthority || 'Department of Economy and Tourism (DET)',
        emirate: entity.emirate || 'Dubai',
        annualRevenueEstimateAED: entity.annualRevenueEstimateAED || 0,
        vatTrn: entity.vatTrn,
        corporateTaxTrn: entity.corporateTaxTrn,
        address: entity.address,
        businessActivities: entity.businessActivities || [],
        issueDate: entity.issueDate,
        expiryDate: entity.expiryDate,
      };

      const backendSaved = await MizanApi.saveTradeLicense(payload);

      const savedBusiness: BusinessEntity = {
        id: backendSaved.id,
        organisationId: backendSaved.organisationId,
        legalName: backendSaved.legalName,
        tradeName: backendSaved.tradeName || backendSaved.legalName,
        legalEntityType: backendSaved.legalEntityType,
        jurisdictionType: backendSaved.jurisdictionType,
        licensingAuthority: backendSaved.licensingAuthority,
        emirate: backendSaved.emirate,
        tradeLicenseNumber: backendSaved.tradeLicenseNumber,
        issueDate: backendSaved.issueDate,
        expiryDate: backendSaved.expiryDate,
        vatTrn: backendSaved.vatTrn,
        corporateTaxTrn: backendSaved.corporateTaxTrn,
        annualRevenueEstimateAED: backendSaved.annualRevenueEstimateAED ?? 0,
        taxRegime: backendSaved.taxRegime || 'Standard UAE Tax Regime',
        isSbrEligible: backendSaved.isSbrEligible ?? true,
        isQfzpEligible: backendSaved.isQfzpEligible ?? false,
        verificationStatus: backendSaved.verificationStatus || 'VERIFIED',
        address: backendSaved.address,
        businessActivities: backendSaved.businessActivities || [],
        icon: 'business-outline',
      };

      setBusinesses((prev) => {
        const filtered = prev.filter((b) => b.id !== savedBusiness.id);
        const updated = [savedBusiness, ...filtered];
        AppStorage.setItem(STORAGE_KEY_CACHED_BUSINESSES, JSON.stringify(updated)).catch(() => {});
        return updated;
      });

      setActiveBusinessIdState(savedBusiness.id);
      await AppStorage.setItem(STORAGE_KEY_ACTIVE_BIZ, savedBusiness.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      return savedBusiness;
    } catch (err: any) {
      setError(err?.message || 'Failed to save trade license');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshBusinesses = useCallback(async () => {
    await fetchBusinesses();
  }, [fetchBusinesses]);

  const switchTenantUser = useCallback(async (userKey: 'user-a' | 'user-b' | 'superadmin') => {
    setCurrentUserKey(userKey);
    await AppStorage.setItem(STORAGE_KEY_USER_KEY, userKey);
    await MizanApi.initSession(userKey);
    await fetchBusinesses();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, [fetchBusinesses]);

  const logout = useCallback(async () => {
    await MizanApi.logout();
    setBusinesses([]);
    setActiveBusinessIdState(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0] || null;
  const hasCompletedOnboarding = isAuthenticated && businesses.length > 0;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        currentUser,
        isAuthenticated,
        hasCompletedOnboarding,
        isLoading,
        error,
        currentUserKey,
        setActiveBusinessId,
        addOrUpdateBusiness,
        refreshBusinesses,
        switchTenantUser,
        logout,
        loadUserProfile,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
