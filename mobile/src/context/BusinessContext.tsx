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

interface BusinessContextType {
  businesses: BusinessEntity[];
  activeBusiness: BusinessEntity | null;
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
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
   */
  const loadUserProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const storedProfileStr = await AppStorage.getItem(STORAGE_KEY_USER_PROFILE);
      if (storedProfileStr) {
        try {
          const parsed = JSON.parse(storedProfileStr);
          setCurrentUser(parsed);
          setIsAuthenticated(true);
        } catch {}
      }

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
   * Fetches businesses strictly for the authenticated tenant session
   */
  const fetchBusinesses = useCallback(async (userKey: 'user-a' | 'user-b' | 'superadmin' = currentUserKey) => {
    setIsLoading(true);
    setError(null);
    try {
      const hasStoredToken = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
      if (hasStoredToken) {
        await MizanApi.ensureAuthenticated();
        await loadUserProfile();
      } else {
        await MizanApi.ensureAuthenticated(userKey);
      }

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

      setBusinesses(mapped);

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
      setBusinesses([]);
      setActiveBusinessIdState(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserKey, loadUserProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          MizanApi.setAuthToken(idToken);
          await AppStorage.setItem(STORAGE_KEY_AUTH_TOKEN, idToken);
          await loadUserProfile();
          await fetchBusinesses();
        } catch (e) {
          console.warn('Firebase auth state listener error:', e);
        }
      } else {
        const hasToken = await AppStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
        if (!hasToken) {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      }
    });

    (async () => {
      const savedUserKey = (await AppStorage.getItem(STORAGE_KEY_USER_KEY)) as any;
      const initialKey = savedUserKey === 'user-b' || savedUserKey === 'superadmin' ? savedUserKey : 'user-a';
      setCurrentUserKey(initialKey);
      await fetchBusinesses(initialKey);
    })();

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
        return [savedBusiness, ...filtered];
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
    await fetchBusinesses(userKey);
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

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        currentUser,
        isAuthenticated,
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
