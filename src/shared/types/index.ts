// Shared types between main and renderer processes

export interface TenantSummary {
  userCount: number;
  licensedUserCount: number;
  guestUserCount: number;
  inactiveUserCount: number;
  mfaAdoptionRate: number;
  skuSummary: Array<{
    skuId: string;
    skuPartNumber: string;
    enabled: number;
    consumed: number;
    available: number;
  }>;
  savingsOpportunity: {
    unusedLicenses: number;
    inactiveAccounts: number;
    estimatedMonthlySavings: number;
  };
}

export interface User {
  id: string;
  userPrincipalName: string;
  displayName: string;
  userType: string;
  accountEnabled: boolean;
  assignedLicenses: string[];
  lastSignIn?: Date;
  mfaRegistered: boolean;
}

export interface License {
  skuId: string;
  skuPartNumber: string;
  enabled: number;
  consumed: number;
  available: number;
}

export interface SafeFixPlan {
  licenseWaste: {
    targets: Array<{
      userId: string;
      userName: string;
      licenses: string[];
      reason: string;
    }>;
    estimatedSavings: number;
  };
  inactiveAccounts: {
    targets: Array<{
      userId: string;
      userName: string;
      lastSignIn?: Date;
      daysInactive: number;
    }>;
    estimatedSavings: number;
  };
  mfaGaps: {
    targets: Array<{
      userId: string;
      userName: string;
    }>;
    count: number;
  };
}

export interface FixResult {
  success: boolean;
  actionsTaken: number;
  errors: string[];
  savings: {
    licensesReclaimed: number;
    accountsDisabled: number;
    estimatedMonthlySavings: number;
  };
}

