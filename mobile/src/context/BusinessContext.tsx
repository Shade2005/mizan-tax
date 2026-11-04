// ============================================================================
// Mizan (ميزان) - Business Multi-Entity Context
// Manages active business entity switching across Mainland LLC, Free Zone, Freelance
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { MizanApi } from '../services/api';

export interface BusinessEntity {
  id: string;
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
  icon?: string;
}

const DEFAULT_BUSINESSES: BusinessEntity[] = [
  {
    id: 'biz-1234567',
    legalName: 'Al Nahda Trading LLC',
    tradeName: 'Al Nahda Trading',
    legalEntityType: 'LLC',
    jurisdictionType: 'MAINLAND',
    licensingAuthority: 'Department of Economy and Tourism (DET)',
    emirate: 'Dubai',
    tradeLicenseNumber: '1234567',
    issueDate: '2024-01-15',
    expiryDate: '2027-01-15',
    vatTrn: '100234567800003',
    corporateTaxTrn: 'CT-1002345678',
    annualRevenueEstimateAED: 1200000,
    taxRegime: 'Mainland LLC • SBR Eligible (0% up to AED 3M)',
    isSbrEligible: true,
    isQfzpEligible: false,
    verificationStatus: 'REGISTRY_VERIFIED',
    icon: '🏢',
  },
  {
    id: 'biz-fz-892144',
    legalName: 'Desert Cloud Solutions FZE',
    tradeName: 'Desert Cloud',
    legalEntityType: 'FREE_ZONE_ESTABLISHMENT',
    jurisdictionType: 'FREE_ZONE',
    licensingAuthority: 'Dubai Multi Commodities Centre (DMCC)',
    emirate: 'Dubai',
    tradeLicenseNumber: 'FZ-892144',
    issueDate: '2023-09-01',
    expiryDate: '2026-09-01',
    vatTrn: '100987654300001',
    corporateTaxTrn: 'CT-2009876543',
    annualRevenueEstimateAED: 4800000,
    taxRegime: 'Qualifying Free Zone Person (0% on Qualifying Income)',
    isSbrEligible: false,
    isQfzpEligible: true,
    verificationStatus: 'REGISTRY_VERIFIED',
    icon: '🌐',
  },
  {
    id: 'biz-fl-440912',
    legalName: 'Hamza Al Mansoori (Tech & Design Consulting)',
    tradeName: 'Hamza Consulting',
    legalEntityType: 'NATURAL_PERSON',
    jurisdictionType: 'MAINLAND',
    licensingAuthority: 'Abu Dhabi Department of Economic Development (ADDED)',
    emirate: 'Abu Dhabi',
    tradeLicenseNumber: 'FL-440912',
    issueDate: '2024-03-10',
    expiryDate: '2027-03-10',
    vatTrn: 'NOT_REGISTERED',
    corporateTaxTrn: 'EXEMPT_CABINET_DEC_49',
    annualRevenueEstimateAED: 420000,
    taxRegime: 'Natural Person Freelance (< AED 1M exempt under CD 49/2023)',
    isSbrEligible: true,
    isQfzpEligible: false,
    verificationStatus: 'OCR_EXTRACTED',
    icon: '👤',
  },
];

interface BusinessContextType {
  businesses: BusinessEntity[];
  activeBusiness: BusinessEntity;
  setActiveBusinessId: (id: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessEntity[]>(DEFAULT_BUSINESSES);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>('biz-1234567');

  const fetchBusinesses = async () => {
    try {
      const data = await MizanApi.getBusinesses();
      if (Array.isArray(data) && data.length > 0) {
        setBusinesses(data);
      }
    } catch {
      // Retain defaults if server unreachable
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const setActiveBusinessId = (id: string) => {
    setActiveBusinessIdState(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const activeBusiness =
    businesses.find((b) => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESSES[0];

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        setActiveBusinessId,
        refreshBusinesses: fetchBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
