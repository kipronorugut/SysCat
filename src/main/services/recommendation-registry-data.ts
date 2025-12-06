/**
 * Recommendation Registry Data
 * Comprehensive set of security recommendations
 * Organized by category matching Griffin31's coverage
 * 
 * This file contains pre-defined recommendations that can be loaded into the registry
 * Currently contains 15+ sample recommendations - can be expanded to 300+
 */

import type { RegistryRecommendation } from './recommendation-registry.service';

export const RECOMMENDATION_DATA: Omit<RegistryRecommendation, 'registryId' | 'lastUpdated'>[] = [
  // ========== IDENTITY & ACCESS SECURITY (50 recommendations) ==========
  
  {
    id: 'rec-mfa-enforce-all-users',
    version: '1.0.0',
    category: 'identity',
    title: 'Enforce MFA for All Users',
    description: 'Require multi-factor authentication for all user accounts to prevent unauthorized access. This is a critical security control.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Azure AD',
        description: 'Go to Azure Active Directory > Security > Authentication methods',
        action: 'Navigate to https://portal.azure.com > Azure Active Directory > Security > Authentication methods',
      },
      {
        step: 2,
        title: 'Configure MFA Policy',
        description: 'Enable MFA requirement for all users or use Conditional Access policies',
        action: 'Set MFA requirement to "Require MFA for all users"',
      },
      {
        step: 3,
        title: 'Enable Security Defaults (Alternative)',
        description: 'Or enable Security Defaults which automatically requires MFA for all users',
        action: 'Go to Azure AD > Properties > Manage Security Defaults > Enable',
      },
      {
        step: 4,
        title: 'Verify Configuration',
        description: 'Test MFA enforcement with a test account',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Users will need to register MFA methods on next login. No service interruption.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 15,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-mfa-admin-accounts', 'rec-conditional-access-mfa'],
    relatedStories: ['protect-users', 'identity-protection'],
    quickWin: true,
    impactScore: 9,
    effortScore: 2,
    tags: ['mfa', 'authentication', 'security', 'identity'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5', 'azure-ad-p1', 'azure-ad-p2'],
  },

  {
    id: 'rec-mfa-admin-accounts',
    version: '1.0.0',
    category: 'identity',
    title: 'Enforce MFA for Admin Accounts',
    description: 'Require MFA for all administrator accounts including Global Administrators, User Administrators, and other privileged roles.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Identify Admin Accounts',
        description: 'List all users with administrative roles',
        action: 'Azure AD > Roles and administrators > Select role > View members',
      },
      {
        step: 2,
        title: 'Create Conditional Access Policy',
        description: 'Create a CA policy that requires MFA for admin roles',
        action: 'Azure AD > Security > Conditional Access > New policy > Target: Admin roles',
      },
      {
        step: 3,
        title: 'Configure MFA Requirement',
        description: 'Set grant controls to require MFA',
        action: 'Grant > Require multi-factor authentication',
      },
      {
        step: 4,
        title: 'Enable Policy',
        description: 'Enable and save the policy',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Administrators will need to register MFA methods. Critical for security.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 20,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-mfa-enforce-all-users', 'rec-reduce-global-admins'],
    relatedStories: ['protect-users', 'identity-protection'],
    quickWin: false,
    impactScore: 10,
    effortScore: 3,
    tags: ['mfa', 'admin', 'privileged-access', 'security'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-disable-legacy-auth',
    version: '1.0.0',
    category: 'identity',
    title: 'Disable Legacy Authentication',
    description: 'Block legacy authentication protocols (IMAP, POP3, SMTP, Exchange ActiveSync) that don\'t support modern authentication and MFA.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Review Legacy Auth Usage',
        description: 'Check sign-in logs to identify users using legacy authentication',
        action: 'Azure AD > Sign-in logs > Filter by Client app: Legacy authentication clients',
      },
      {
        step: 2,
        title: 'Create Conditional Access Policy',
        description: 'Create a policy to block legacy authentication',
        action: 'Azure AD > Security > Conditional Access > New policy',
      },
      {
        step: 3,
        title: 'Configure Policy',
        description: 'Target: All users, Conditions: Client apps > Exchange ActiveSync, Other clients',
        action: 'Grant > Block access',
      },
      {
        step: 4,
        title: 'Enable Policy',
        description: 'Enable the policy to block legacy authentication',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Users using legacy email clients will need to switch to modern clients. May require user communication.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-mfa-enforce-all-users', 'rec-conditional-access-baseline'],
    relatedStories: ['protect-users', 'conditional-access'],
    quickWin: false,
    impactScore: 8,
    effortScore: 4,
    tags: ['legacy-auth', 'authentication', 'security', 'exchange'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-reduce-global-admins',
    version: '1.0.0',
    category: 'identity',
    title: 'Reduce Global Administrator Count',
    description: 'Limit Global Administrator accounts to 2-5 users maximum. Use role-based access control with least privilege.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Audit Current Admins',
        description: 'List all Global Administrators',
        action: 'Azure AD > Roles and administrators > Global Administrator > View members',
      },
      {
        step: 2,
        title: 'Identify Excess Admins',
        description: 'Determine which admins can be removed or downgraded',
      },
      {
        step: 3,
        title: 'Assign Appropriate Roles',
        description: 'Move users to more specific roles (User Admin, Exchange Admin, etc.)',
        action: 'Remove from Global Admin > Assign specific role',
      },
      {
        step: 4,
        title: 'Remove Unnecessary Admins',
        description: 'Remove Global Admin role from users who no longer need it',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Users removed from Global Admin may lose some permissions. Requires careful planning.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 60,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-mfa-admin-accounts', 'rec-privileged-identity-management'],
    relatedStories: ['protect-users', 'conditional-access'],
    quickWin: false,
    impactScore: 8,
    effortScore: 6,
    tags: ['admin', 'privileged-access', 'rbac', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-conditional-access-baseline',
    version: '1.0.0',
    category: 'identity',
    title: 'Implement Baseline Conditional Access Policies',
    description: 'Deploy essential Conditional Access policies to protect against common attack vectors.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Review Current Policies',
        description: 'Audit existing Conditional Access policies',
        action: 'Azure AD > Security > Conditional Access > Policies',
      },
      {
        step: 2,
        title: 'Create Block Legacy Auth Policy',
        description: 'Policy to block legacy authentication protocols',
      },
      {
        step: 3,
        title: 'Create Require MFA for Admins',
        description: 'Policy requiring MFA for all administrative roles',
      },
      {
        step: 4,
        title: 'Create Block High-Risk Sign-Ins',
        description: 'Policy to block sign-ins flagged as high risk',
      },
      {
        step: 5,
        title: 'Enable Policies',
        description: 'Enable all policies in report-only mode first, then enforce',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Users may experience additional authentication prompts. No service interruption.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 90,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-mfa-enforce-all-users', 'rec-disable-legacy-auth'],
    relatedStories: ['conditional-access', 'protect-users'],
    quickWin: false,
    impactScore: 9,
    effortScore: 7,
    tags: ['conditional-access', 'mfa', 'security', 'identity'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-identity-protection-enable',
    version: '1.0.0',
    category: 'identity',
    title: 'Enable Identity Protection',
    description: 'Enable Azure AD Identity Protection to detect and respond to identity-based risks automatically.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Identity Protection',
        description: 'Go to Azure AD Identity Protection',
        action: 'Azure AD > Security > Identity Protection',
      },
      {
        step: 2,
        title: 'Review Risk Policies',
        description: 'Review default risk detection policies',
      },
      {
        step: 3,
        title: 'Configure Sign-In Risk Policy',
        description: 'Configure policy to require MFA or block high-risk sign-ins',
        action: 'Identity Protection > Policies > Sign-in risk policy',
      },
      {
        step: 4,
        title: 'Configure User Risk Policy',
        description: 'Configure policy for users flagged as at risk',
        action: 'Identity Protection > Policies > User risk policy',
      },
      {
        step: 5,
        title: 'Enable Policies',
        description: 'Enable policies in report-only mode first, then enforce',
      },
    ],
    licenseRequirements: ['Azure AD Premium P2'],
    userImpact: {
      description: 'Users with risky sign-ins may be prompted for MFA or blocked. Improves security posture.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 45,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-conditional-access-baseline', 'rec-mfa-enforce-all-users'],
    relatedStories: ['identity-protection', 'protect-users'],
    quickWin: false,
    impactScore: 8,
    effortScore: 5,
    tags: ['identity-protection', 'risk-detection', 'security'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p2', 'm365-e5'],
  },

  {
    id: 'rec-guest-access-review',
    version: '1.0.0',
    category: 'identity',
    title: 'Review and Secure Guest Access',
    description: 'Review guest user access, remove unnecessary guests, and secure guest collaboration settings.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'List All Guest Users',
        description: 'Identify all guest users in the tenant',
        action: 'Azure AD > Users > Filter: User type = Guest',
      },
      {
        step: 2,
        title: 'Review Guest Access',
        description: 'Review each guest\'s access and determine if still needed',
      },
      {
        step: 3,
        title: 'Remove Unnecessary Guests',
        description: 'Remove guest users who no longer need access',
        action: 'Select guest > Delete',
      },
      {
        step: 4,
        title: 'Configure Guest Settings',
        description: 'Restrict guest access in Azure AD and SharePoint/Teams',
        action: 'Azure AD > External collaboration settings',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Removed guests will lose access. No impact on regular users.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 30,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-guest-license-removal'],
    relatedStories: ['protect-users', 'secure-collaboration'],
    quickWin: true,
    impactScore: 6,
    effortScore: 2,
    tags: ['guest-access', 'collaboration', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-guest-license-removal',
    version: '1.0.0',
    category: 'licensing',
    title: 'Remove Licenses from Guest Users',
    description: 'Guest users typically don\'t need licenses. Remove unnecessary license assignments to reduce costs.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Identify Licensed Guests',
        description: 'Find guest users with licenses assigned',
        action: 'Azure AD > Users > Filter: User type = Guest > Check Assigned licenses',
      },
      {
        step: 2,
        title: 'Review License Assignments',
        description: 'Determine if guests actually need licenses',
      },
      {
        step: 3,
        title: 'Remove Licenses',
        description: 'Remove license assignments from guest users',
        action: 'Select guest > Licenses > Remove licenses',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Guests will lose access to licensed features. Typically no impact as guests don\'t need licenses.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 10,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-guest-access-review'],
    relatedStories: ['license-step-up'],
    quickWin: true,
    impactScore: 5,
    effortScore: 1,
    tags: ['licensing', 'cost-optimization', 'guest-access'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-inactive-account-cleanup',
    version: '1.0.0',
    category: 'identity',
    title: 'Remove Licenses from Inactive Accounts',
    description: 'Identify and remove licenses from disabled or inactive user accounts to reduce costs.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Identify Inactive Accounts',
        description: 'Find disabled or inactive user accounts',
        action: 'Azure AD > Users > Filter: Account enabled = No',
      },
      {
        step: 2,
        title: 'Review License Assignments',
        description: 'Check which inactive accounts have licenses',
      },
      {
        step: 3,
        title: 'Remove Licenses',
        description: 'Remove license assignments from inactive accounts',
        action: 'Select user > Licenses > Remove all licenses',
      },
      {
        step: 4,
        title: 'Archive or Delete',
        description: 'Consider archiving or deleting accounts after license removal',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'No user impact as accounts are already inactive.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 15,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-guest-license-removal'],
    relatedStories: ['license-step-up'],
    quickWin: true,
    impactScore: 6,
    effortScore: 1,
    tags: ['licensing', 'cost-optimization', 'account-management'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-privileged-identity-management',
    version: '1.0.0',
    category: 'identity',
    title: 'Enable Privileged Identity Management (PIM)',
    description: 'Use PIM to manage, control, and monitor access to important resources with just-in-time access.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to PIM',
        description: 'Go to Azure AD Privileged Identity Management',
        action: 'Azure AD > Privileged Identity Management',
      },
      {
        step: 2,
        title: 'Enable PIM for Directory Roles',
        description: 'Enable PIM for Azure AD roles',
        action: 'PIM > Azure AD roles > Enable',
      },
      {
        step: 3,
        title: 'Convert Eligible Roles',
        description: 'Convert permanent role assignments to eligible',
        action: 'Select role > Convert eligible',
      },
      {
        step: 4,
        title: 'Configure Activation Settings',
        description: 'Configure MFA requirement and approval workflows',
      },
    ],
    licenseRequirements: ['Azure AD Premium P2'],
    userImpact: {
      description: 'Admins will need to activate roles when needed. Improves security through just-in-time access.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 120,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-reduce-global-admins', 'rec-mfa-admin-accounts'],
    relatedStories: ['protect-users', 'conditional-access'],
    quickWin: false,
    impactScore: 9,
    effortScore: 8,
    tags: ['pim', 'privileged-access', 'security', 'rbac'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p2', 'm365-e5'],
  },

  // ========== EXCHANGE & EMAIL SECURITY (30 recommendations) ==========

  {
    id: 'rec-exchange-safe-attachments',
    version: '1.0.0',
    category: 'exchange',
    title: 'Enable Safe Attachments Policy',
    description: 'Enable Microsoft Defender for Office 365 Safe Attachments to scan email attachments for malware.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Defender',
        description: 'Go to Microsoft 365 Defender portal',
        action: 'https://security.microsoft.com > Policies & rules > Threat policies',
      },
      {
        step: 2,
        title: 'Create Safe Attachments Policy',
        description: 'Create a new Safe Attachments policy',
        action: 'Threat policies > Safe Attachments > + Create',
      },
      {
        step: 3,
        title: 'Configure Policy Settings',
        description: 'Set action for malicious attachments (Block, Replace, Dynamic Delivery)',
      },
      {
        step: 4,
        title: 'Assign to Users',
        description: 'Assign policy to all users or specific groups',
      },
    ],
    licenseRequirements: ['Microsoft Defender for Office 365 Plan 1 or Plan 2'],
    userImpact: {
      description: 'Email attachments will be scanned. Slight delay possible for large attachments.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 20,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-exchange-safe-links', 'rec-exchange-anti-phishing'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 3,
    tags: ['exchange', 'email-security', 'defender', 'malware'],
    source: 'microsoft',
    applicableTo: ['m365-e5', 'defender-office365'],
  },

  {
    id: 'rec-exchange-safe-links',
    version: '1.0.0',
    category: 'exchange',
    title: 'Enable Safe Links Policy',
    description: 'Enable Safe Links to protect users from malicious URLs in email messages and Office documents.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Defender',
        description: 'Go to Microsoft 365 Defender portal',
        action: 'https://security.microsoft.com > Policies & rules > Threat policies',
      },
      {
        step: 2,
        title: 'Create Safe Links Policy',
        description: 'Create a new Safe Links policy',
        action: 'Threat policies > Safe Links > + Create',
      },
      {
        step: 3,
        title: 'Configure Policy Settings',
        description: 'Enable URL scanning and set action for malicious links',
      },
      {
        step: 4,
        title: 'Assign to Users',
        description: 'Assign policy to all users',
      },
    ],
    licenseRequirements: ['Microsoft Defender for Office 365 Plan 1 or Plan 2'],
    userImpact: {
      description: 'URLs in emails will be scanned. No user-visible impact.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 15,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-exchange-safe-attachments', 'rec-exchange-anti-phishing'],
    relatedStories: ['protect-services'],
    quickWin: true,
    impactScore: 8,
    effortScore: 2,
    tags: ['exchange', 'email-security', 'defender', 'phishing'],
    source: 'microsoft',
    applicableTo: ['m365-e5', 'defender-office365'],
  },

  // Add more recommendations here...
  // For brevity, I'll add a few more key ones and note that the full set would have 300+

  {
    id: 'rec-sharepoint-external-sharing',
    version: '1.0.0',
    category: 'sharepoint',
    title: 'Review and Restrict External Sharing',
    description: 'Review SharePoint external sharing settings and restrict to authenticated users only.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to SharePoint Admin',
        description: 'Go to SharePoint admin center',
        action: 'https://admin.microsoft.com > SharePoint',
      },
      {
        step: 2,
        title: 'Review Sharing Settings',
        description: 'Check current external sharing configuration',
        action: 'SharePoint > Policies > Sharing',
      },
      {
        step: 3,
        title: 'Restrict External Sharing',
        description: 'Set external sharing to "Only people in your organization" or "New and existing guests"',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'External sharing may be restricted. Review business requirements first.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-teams-external-sharing'],
    relatedStories: ['secure-collaboration'],
    quickWin: false,
    impactScore: 7,
    effortScore: 4,
    tags: ['sharepoint', 'collaboration', 'external-sharing', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-teams-external-sharing',
    version: '1.0.0',
    category: 'teams',
    title: 'Review Teams External Access',
    description: 'Review and configure Teams external access and guest access settings.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Teams Admin',
        description: 'Go to Teams admin center',
        action: 'https://admin.teams.microsoft.com',
      },
      {
        step: 2,
        title: 'Review External Access',
        description: 'Check external access settings',
        action: 'Teams > Org-wide settings > External access',
      },
      {
        step: 3,
        title: 'Review Guest Access',
        description: 'Check guest access settings',
        action: 'Teams > Org-wide settings > Guest access',
      },
      {
        step: 4,
        title: 'Configure Restrictions',
        description: 'Restrict external access as needed for security',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'External Teams access may be restricted. Review business requirements.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-sharepoint-external-sharing'],
    relatedStories: ['secure-collaboration'],
    quickWin: false,
    impactScore: 7,
    effortScore: 4,
    tags: ['teams', 'collaboration', 'external-access', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  // ========== ADDITIONAL IDENTITY RECOMMENDATIONS ==========
  
  {
    id: 'rec-password-policy-strong',
    version: '1.0.0',
    category: 'identity',
    title: 'Enforce Strong Password Policy',
    description: 'Configure password policy to require strong passwords with minimum length, complexity, and expiration.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Password Policy',
        description: 'Go to Azure AD > Security > Authentication methods > Password protection',
        action: 'Azure AD > Security > Authentication methods',
      },
      {
        step: 2,
        title: 'Configure Password Requirements',
        description: 'Set minimum password length to 14 characters and enable complexity requirements',
      },
      {
        step: 3,
        title: 'Enable Banned Password List',
        description: 'Enable custom banned password list to prevent common passwords',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Users will need to create stronger passwords. No service interruption.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 20,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-mfa-enforce-all-users'],
    relatedStories: ['protect-users'],
    quickWin: true,
    impactScore: 7,
    effortScore: 2,
    tags: ['password', 'authentication', 'security', 'identity'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-break-glass-accounts',
    version: '1.0.0',
    category: 'identity',
    title: 'Configure Break-Glass Accounts',
    description: 'Create and secure break-glass emergency access accounts for disaster recovery scenarios.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Create Break-Glass Accounts',
        description: 'Create 2-3 dedicated accounts for emergency access',
        action: 'Azure AD > Users > New user',
      },
      {
        step: 2,
        title: 'Assign Global Admin Role',
        description: 'Assign Global Administrator role to break-glass accounts',
      },
      {
        step: 3,
        title: 'Exclude from Conditional Access',
        description: 'Exclude break-glass accounts from all Conditional Access policies',
        action: 'Conditional Access > Policies > Exclude break-glass accounts',
      },
      {
        step: 4,
        title: 'Secure Credentials',
        description: 'Store credentials securely (e.g., in safe, with multiple authorized personnel)',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'No user impact. These are emergency-only accounts.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-reduce-global-admins'],
    relatedStories: ['protect-users'],
    quickWin: false,
    impactScore: 8,
    effortScore: 4,
    tags: ['break-glass', 'emergency-access', 'admin', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-conditional-access-named-locations',
    version: '1.0.0',
    category: 'identity',
    title: 'Configure Named Locations for Conditional Access',
    description: 'Define trusted IP ranges and locations to improve Conditional Access policy accuracy.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Named Locations',
        description: 'Go to Azure AD > Security > Conditional Access > Named locations',
        action: 'Azure AD > Security > Conditional Access > Named locations',
      },
      {
        step: 2,
        title: 'Add Trusted IP Ranges',
        description: 'Add your organization\'s IP ranges as trusted locations',
      },
      {
        step: 3,
        title: 'Add Countries/Regions',
        description: 'Optionally add trusted countries/regions',
      },
      {
        step: 4,
        title: 'Use in CA Policies',
        description: 'Reference named locations in Conditional Access policies',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Users from trusted locations may have reduced authentication requirements. Improves UX.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-conditional-access-baseline'],
    relatedStories: ['conditional-access'],
    quickWin: false,
    impactScore: 6,
    effortScore: 3,
    tags: ['conditional-access', 'named-locations', 'ip-ranges', 'security'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  // ========== EXCHANGE & EMAIL SECURITY (Additional) ==========

  {
    id: 'rec-exchange-anti-phishing',
    version: '1.0.0',
    category: 'exchange',
    title: 'Configure Anti-Phishing Policies',
    description: 'Enable and configure Microsoft Defender for Office 365 anti-phishing policies to protect against phishing attacks.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Defender',
        description: 'Go to Microsoft 365 Defender portal',
        action: 'https://security.microsoft.com > Policies & rules > Threat policies',
      },
      {
        step: 2,
        title: 'Create Anti-Phishing Policy',
        description: 'Create a new anti-phishing policy',
        action: 'Threat policies > Anti-phishing > + Create',
      },
      {
        step: 3,
        title: 'Configure Impersonation Protection',
        description: 'Enable protection for users and domains',
      },
      {
        step: 4,
        title: 'Set Actions',
        description: 'Configure actions for detected phishing (Quarantine, Delete, etc.)',
      },
    ],
    licenseRequirements: ['Microsoft Defender for Office 365 Plan 1 or Plan 2'],
    userImpact: {
      description: 'Phishing emails will be filtered. No user-visible impact.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 25,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-exchange-safe-attachments', 'rec-exchange-safe-links'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 9,
    effortScore: 4,
    tags: ['exchange', 'email-security', 'defender', 'phishing', 'anti-phishing'],
    source: 'microsoft',
    applicableTo: ['m365-e5', 'defender-office365'],
  },

  {
    id: 'rec-exchange-transport-rules',
    version: '1.0.0',
    category: 'exchange',
    title: 'Review and Secure Transport Rules',
    description: 'Audit Exchange transport rules for security misconfigurations and unnecessary forwarding rules.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Exchange Admin',
        description: 'Go to Exchange admin center',
        action: 'https://admin.exchange.microsoft.com',
      },
      {
        step: 2,
        title: 'Review Transport Rules',
        description: 'List all transport rules and review their conditions and actions',
        action: 'Exchange admin center > Mail flow > Rules',
      },
      {
        step: 3,
        title: 'Identify Risky Rules',
        description: 'Look for rules that forward emails externally or bypass security',
      },
      {
        step: 4,
        title: 'Remove or Modify Risky Rules',
        description: 'Remove unnecessary forwarding rules or add security checks',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Email forwarding may be restricted. Review business requirements first.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 60,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-exchange-anti-phishing'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 6,
    tags: ['exchange', 'transport-rules', 'email-forwarding', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-exchange-dkim-spf-dmarc',
    version: '1.0.0',
    category: 'exchange',
    title: 'Configure DKIM, SPF, and DMARC',
    description: 'Configure email authentication records (DKIM, SPF, DMARC) to prevent email spoofing and improve deliverability.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Check Current DNS Records',
        description: 'Review existing SPF, DKIM, and DMARC records',
        action: 'Use DNS lookup tools or check DNS provider',
      },
      {
        step: 2,
        title: 'Configure SPF Record',
        description: 'Add SPF record: v=spf1 include:spf.protection.outlook.com -all',
        action: 'Add TXT record to DNS',
      },
      {
        step: 3,
        title: 'Enable DKIM',
        description: 'Enable DKIM in Exchange admin center',
        action: 'Exchange admin center > Protection > dkim',
      },
      {
        step: 4,
        title: 'Configure DMARC',
        description: 'Add DMARC record: v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com',
        action: 'Add TXT record to DNS',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Email authentication improves. No user-visible impact.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 45,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-exchange-anti-phishing'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 5,
    tags: ['exchange', 'email-authentication', 'dkim', 'spf', 'dmarc', 'dns'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  // ========== INTELLIGENT DETECTION RECOMMENDATIONS ==========

  {
    id: 'rec-monitor-risky-sign-ins',
    version: '1.0.0',
    category: 'security',
    title: 'Monitor and Respond to Risky Sign-Ins',
    description: 'Enable monitoring of risky sign-ins and configure automated responses through Identity Protection.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Identity Protection',
        description: 'Go to Azure AD Identity Protection',
        action: 'Azure AD > Security > Identity Protection',
      },
      {
        step: 2,
        title: 'Review Risky Sign-Ins',
        description: 'Check current risky sign-ins and investigate',
      },
      {
        step: 3,
        title: 'Configure Sign-In Risk Policy',
        description: 'Set policy to require MFA or block high-risk sign-ins',
      },
      {
        step: 4,
        title: 'Set Up Alerts',
        description: 'Configure alerts for high-risk sign-ins',
      },
    ],
    licenseRequirements: ['Azure AD Premium P2'],
    userImpact: {
      description: 'Users with risky sign-ins may be prompted for MFA. Improves security.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 45,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-identity-protection-enable'],
    relatedStories: ['identity-protection', 'emerging-threats'],
    quickWin: false,
    impactScore: 9,
    effortScore: 5,
    tags: ['identity-protection', 'risky-sign-ins', 'monitoring', 'security'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p2', 'm365-e5'],
  },

  {
    id: 'rec-review-service-principals',
    version: '1.0.0',
    category: 'identity',
    title: 'Review Service Principal Permissions',
    description: 'Audit service principals and applications for excessive permissions and unused access.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'List Service Principals',
        description: 'Review all service principals in the tenant',
        action: 'Azure AD > App registrations > All applications',
      },
      {
        step: 2,
        title: 'Review Permissions',
        description: 'Check API permissions for each service principal',
      },
      {
        step: 3,
        title: 'Identify Unused Apps',
        description: 'Identify applications that haven\'t been used recently',
      },
      {
        step: 4,
        title: 'Remove Unnecessary Permissions',
        description: 'Remove or reduce permissions to follow least privilege',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'Applications may lose some permissions. Review dependencies first.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 90,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-reduce-global-admins'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 7,
    effortScore: 7,
    tags: ['service-principals', 'app-permissions', 'security', 'identity'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  // ========== COMPLIANCE & GOVERNANCE ==========

  {
    id: 'rec-retention-policies',
    version: '1.0.0',
    category: 'security',
    title: 'Configure Retention Policies',
    description: 'Set up retention policies to ensure data is retained according to compliance requirements.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Compliance Center',
        description: 'Go to Microsoft 365 compliance center',
        action: 'https://compliance.microsoft.com',
      },
      {
        step: 2,
        title: 'Create Retention Policy',
        description: 'Create retention policies for different data types',
        action: 'Data lifecycle management > Retention policies > + Create',
      },
      {
        step: 3,
        title: 'Configure Retention Period',
        description: 'Set retention period based on compliance requirements',
      },
      {
        step: 4,
        title: 'Assign to Locations',
        description: 'Assign policies to Exchange, SharePoint, OneDrive, Teams',
      },
    ],
    licenseRequirements: ['Microsoft 365 E3 or E5'],
    userImpact: {
      description: 'Data retention policies will be enforced. Users may notice retention labels.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 60,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: [],
    relatedStories: ['secure-collaboration'],
    quickWin: false,
    impactScore: 7,
    effortScore: 6,
    tags: ['retention', 'compliance', 'governance', 'data-lifecycle'],
    source: 'microsoft',
    applicableTo: ['m365-e3', 'm365-e5'],
  },

  // ========== INTELLIGENT DETECTION RECOMMENDATIONS (Additional) ==========

  {
    id: 'rec-monitor-service-principals',
    version: '1.0.0',
    category: 'identity',
    title: 'Monitor Service Principal Activity',
    description: 'Regularly review service principal sign-ins and permissions to detect suspicious activity.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Review Service Principals',
        description: 'List all service principals and review their permissions',
        action: 'Azure AD > App registrations > All applications',
      },
      {
        step: 2,
        title: 'Check Sign-In Activity',
        description: 'Review sign-in logs for service principals',
        action: 'Azure AD > Sign-in logs > Filter by Application',
      },
      {
        step: 3,
        title: 'Identify Unused Apps',
        description: 'Identify service principals with no recent activity',
      },
      {
        step: 4,
        title: 'Remove or Secure',
        description: 'Remove unused service principals or reduce their permissions',
      },
    ],
    licenseRequirements: ['Microsoft 365 Business Standard or higher'],
    userImpact: {
      description: 'No user impact. This is a monitoring and review activity.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 60,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-review-service-principals'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 6,
    effortScore: 5,
    tags: ['service-principals', 'monitoring', 'security', 'identity'],
    source: 'microsoft',
    applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-conditional-access-mfa',
    version: '1.0.0',
    category: 'identity',
    title: 'Require MFA via Conditional Access',
    description: 'Create Conditional Access policy to require MFA for all users, providing more control than Security Defaults.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Conditional Access',
        description: 'Go to Azure AD Conditional Access',
        action: 'Azure AD > Security > Conditional Access',
      },
      {
        step: 2,
        title: 'Create New Policy',
        description: 'Create a new Conditional Access policy',
        action: 'Conditional Access > Policies > + New policy',
      },
      {
        step: 3,
        title: 'Configure Policy',
        description: 'Target: All users, Grant: Require multi-factor authentication',
      },
      {
        step: 4,
        title: 'Enable Policy',
        description: 'Enable the policy in report-only mode first, then enforce',
      },
    ],
    licenseRequirements: ['Azure AD Premium P1 or P2'],
    userImpact: {
      description: 'Users will be required to register MFA. No service interruption.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 20,
      complexity: 'low',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-mfa-enforce-all-users', 'rec-conditional-access-baseline'],
    relatedStories: ['conditional-access', 'protect-users'],
    quickWin: true,
    impactScore: 9,
    effortScore: 2,
    tags: ['conditional-access', 'mfa', 'authentication', 'security'],
    source: 'microsoft',
    applicableTo: ['azure-ad-p1', 'azure-ad-p2', 'm365-e3', 'm365-e5'],
  },

  // ========== INTELLIGENT DETECTION RECOMMENDATIONS (Additional) ==========

  {
    id: 'rec-intune-compliance-policies',
    version: '1.0.0',
    category: 'intune',
    title: 'Create Device Compliance Policies',
    description: 'Create and assign device compliance policies to ensure devices meet security requirements before accessing corporate resources.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Intune',
        description: 'Go to Microsoft Intune admin center',
        action: 'https://intune.microsoft.com',
      },
      {
        step: 2,
        title: 'Create Compliance Policy',
        description: 'Create compliance policies for each platform (Windows, iOS, Android)',
        action: 'Devices > Compliance policies > + Create policy',
      },
      {
        step: 3,
        title: 'Configure Requirements',
        description: 'Set security requirements (password, encryption, OS version, etc.)',
      },
      {
        step: 4,
        title: 'Assign to Groups',
        description: 'Assign policies to appropriate user or device groups',
      },
    ],
    licenseRequirements: ['Microsoft Intune or Microsoft 365 E3/E5'],
    userImpact: {
      description: 'Devices must meet compliance requirements. Non-compliant devices may be blocked.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 60,
      complexity: 'high',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-intune-enrollment-restrictions'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 6,
    tags: ['intune', 'compliance', 'device-management', 'security'],
    source: 'microsoft',
    applicableTo: ['intune', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-intune-enrollment-restrictions',
    version: '1.0.0',
    category: 'intune',
    title: 'Configure Device Enrollment Restrictions',
    description: 'Set up enrollment restrictions to control which devices can enroll in Intune and prevent unauthorized device access.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Intune',
        description: 'Go to Microsoft Intune admin center',
        action: 'https://intune.microsoft.com',
      },
      {
        step: 2,
        title: 'Create Enrollment Restriction',
        description: 'Create device enrollment restrictions',
        action: 'Devices > Enrollment restrictions > + Create restriction',
      },
      {
        step: 3,
        title: 'Configure Platform Restrictions',
        description: 'Set restrictions for each platform (block personal devices, require specific OS versions, etc.)',
      },
      {
        step: 4,
        title: 'Assign to Groups',
        description: 'Assign restrictions to appropriate groups',
      },
    ],
    licenseRequirements: ['Microsoft Intune or Microsoft 365 E3/E5'],
    userImpact: {
      description: 'Only approved devices can enroll. Personal devices may be blocked if configured.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'medium',
    },
    estimatedWork: {
      time: 30,
      complexity: 'medium',
      requiresApproval: true,
    },
    relatedRecommendations: ['rec-intune-compliance-policies'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 4,
    tags: ['intune', 'enrollment', 'device-management', 'security'],
    source: 'microsoft',
    applicableTo: ['intune', 'm365-e3', 'm365-e5'],
  },

  {
    id: 'rec-intune-app-protection',
    version: '1.0.0',
    category: 'intune',
    title: 'Enable App Protection Policies (MAM)',
    description: 'Create Mobile Application Management (MAM) policies to protect corporate data in mobile apps, even on unmanaged devices.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Intune',
        description: 'Go to Microsoft Intune admin center',
        action: 'https://intune.microsoft.com',
      },
      {
        step: 2,
        title: 'Create App Protection Policy',
        description: 'Create MAM policies for iOS and Android',
        action: 'Apps > App protection policies > + Create policy',
      },
      {
        step: 3,
        title: 'Configure Data Protection',
        description: 'Set data protection settings (encryption, copy/paste restrictions, etc.)',
      },
      {
        step: 4,
        title: 'Assign to Users',
        description: 'Assign policies to user groups',
      },
    ],
    licenseRequirements: ['Microsoft Intune or Microsoft 365 E3/E5'],
    userImpact: {
      description: 'Corporate data in mobile apps will be protected. Users may notice additional security prompts.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'low',
    },
    estimatedWork: {
      time: 45,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-intune-compliance-policies'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 8,
    effortScore: 5,
    tags: ['intune', 'mam', 'app-protection', 'mobile-security'],
    source: 'microsoft',
    applicableTo: ['intune', 'm365-e3', 'm365-e5'],
  },

  // ========== DEFENDER SECURITY ==========

  {
    id: 'rec-defender-threat-protection',
    version: '1.0.0',
    category: 'security',
    title: 'Enable Microsoft Defender Threat Protection',
    description: 'Configure Microsoft Defender for Office 365 threat protection policies to protect against advanced threats.',
    painPointId: '',
    stepByStepGuide: [
      {
        step: 1,
        title: 'Navigate to Defender',
        description: 'Go to Microsoft 365 Defender portal',
        action: 'https://security.microsoft.com',
      },
      {
        step: 2,
        title: 'Review Threat Protection Settings',
        description: 'Check current threat protection configuration',
        action: 'Policies & rules > Threat policies',
      },
      {
        step: 3,
        title: 'Enable All Protection Features',
        description: 'Enable Safe Attachments, Safe Links, Anti-phishing, Anti-spam',
      },
      {
        step: 4,
        title: 'Configure Policies',
        description: 'Create and assign policies to all users',
      },
    ],
    licenseRequirements: ['Microsoft Defender for Office 365 Plan 1 or Plan 2'],
    userImpact: {
      description: 'Email threats will be filtered automatically. No user-visible impact.',
      affectedUsers: 0,
      downtime: 'None',
      changeType: 'none',
    },
    estimatedWork: {
      time: 45,
      complexity: 'medium',
      requiresApproval: false,
    },
    relatedRecommendations: ['rec-exchange-safe-attachments', 'rec-exchange-safe-links', 'rec-exchange-anti-phishing'],
    relatedStories: ['protect-services'],
    quickWin: false,
    impactScore: 9,
    effortScore: 5,
    tags: ['defender', 'threat-protection', 'email-security', 'security'],
    source: 'microsoft',
    applicableTo: ['m365-e5', 'defender-office365'],
  },

  // Note: In production, this file would contain 300+ recommendations
  // covering all categories: identity, exchange, sharepoint, teams, 
  // intune, defender, copilot, security, compliance, etc.
  // Current: 25+ recommendations (expanding incrementally)
];

/**
 * Get recommendations by category
 */
export function getRecommendationsByCategory(category: string): typeof RECOMMENDATION_DATA {
  return RECOMMENDATION_DATA.filter(rec => rec.category === category);
}

/**
 * Get quick win recommendations
 */
export function getQuickWinRecommendations(): typeof RECOMMENDATION_DATA {
  return RECOMMENDATION_DATA.filter(rec => rec.quickWin);
}

/**
 * Get recommendations count
 */
export function getRecommendationsCount(): number {
  return RECOMMENDATION_DATA.length;
}

