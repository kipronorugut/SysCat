# 🚀 SysCat Implementation Roadmap

## Current State Analysis

### ✅ **What Works Today**
- Basic tenant discovery (users, licenses, sign-in data)
- License waste detection & reclamation
- Inactive account identification & processing
- MFA gap detection (basic)
- Safe fix automation with Graph API
- Activity logging & audit trail
- Real-time dashboard UI

### 📊 **Current API Coverage**
```
Graph API Endpoints Used:
├── GET /users (paginated)
├── GET /users/{id}/authentication/signInPreferences
├── GET /subscribedSkus
├── PATCH /users/{id} (license removal, account updates)

Scopes Granted:
├── User.Read
├── Directory.Read.All
├── User.Read.All
├── Organization.Read.All
├── Directory.ReadWrite.All ✅ (NEW - enables automation)
└── User.ReadWrite.All ✅ (NEW - enables automation)
```

---

## 🎯 **Phase 1: Identity Hardening (Next 30 Days)**

### Week 1-2: MFA & Authentication Automation

#### **New Graph API Methods Needed**

```typescript
// src/main/services/graph-api.service.ts

// 1. Check MFA registration status
async getMFAStatus(userId: string): Promise<{
  mfaRegistered: boolean;
  methods: string[];
  enforced: boolean;
}> {
  const authMethods = await this.get(`/users/${userId}/authentication/methods`);
  const mfaMethods = authMethods.value?.filter(m => 
    ['microsoftAuthenticator', 'phone', 'fido2'].includes(m['@odata.type'])
  ) || [];
  
  return {
    mfaRegistered: mfaMethods.length > 0,
    methods: mfaMethods.map(m => m['@odata.type']),
    enforced: false // Need conditional access API for this
  };
}

// 2. Enable MFA for user
async enforceMFA(userId: string): Promise<void> {
  // This requires Conditional Access policies or
  // Per-user MFA via legacy API
  // For MVP: Use security defaults or CA policy
  log.warn('[GraphApiService] MFA enforcement via Graph API limited');
  // Would need: POST /identity/conditionalAccess/policies
}

// 3. Detect legacy authentication
async checkLegacyAuth(userId: string): Promise<{
  hasLegacyAuth: boolean;
  protocols: string[];
}> {
  // Use sign-in logs: GET /auditLogs/signIns
  // Filter for clientApp: 'exchangeActiveSync', 'imap', 'pop3', etc.
  const signIns = await this.get<{value: any[]}>(
    `/auditLogs/signIns?$filter=userId eq '${userId}'&$top=100`
  );
  
  const legacyProtocols = ['exchangeActiveSync', 'imap', 'pop3', 'authenticatorApp'];
  const foundProtocols = signIns.value
    .filter(s => legacyProtocols.includes(s.clientApp))
    .map(s => s.clientApp);
    
  return {
    hasLegacyAuth: foundProtocols.length > 0,
    protocols: [...new Set(foundProtocols)]
  };
}

// 4. Block legacy auth for user
async blockLegacyAuth(userId: string): Promise<void> {
  // Set user property: blockCredential = true
  await this.patch(`/users/${userId}`, {
    blockCredential: true
  });
}
```

#### **New Automation Service Methods**

```typescript
// src/main/services/automation.service.ts

async enforceMFAForRiskyUsers(threshold: 'low' | 'medium' | 'high' = 'high'): Promise<{
  usersProcessed: number;
  mfaEnabled: number;
  errors: string[];
}> {
  const users = await graphApiService.getUsers();
  const riskyUsers = await this.identifyRiskyUsers(users, threshold);
  
  const result = { usersProcessed: 0, mfaEnabled: 0, errors: [] };
  
  for (const user of riskyUsers) {
    try {
      const mfaStatus = await graphApiService.getMFAStatus(user.id);
      if (!mfaStatus.enforced) {
        await graphApiService.enforceMFA(user.id);
        result.mfaEnabled++;
        
        // Log to database
        await this.logAction('mfa_enforcement', user.id, {
          method: 'automated',
          threshold
        });
      }
      result.usersProcessed++;
    } catch (error: any) {
      result.errors.push(`${user.userPrincipalName}: ${error.message}`);
    }
  }
  
  return result;
}

async detectAndBlockLegacyAuth(): Promise<{
  usersWithLegacyAuth: Array<{userId: string; userName: string; protocols: string[]}>;
  blocked: number;
}> {
  const users = await graphApiService.getUsers();
  const usersWithLegacy = [];
  let blocked = 0;
  
  for (const user of users.slice(0, 100)) { // Sample for MVP
    const legacyCheck = await graphApiService.checkLegacyAuth(user.id);
    if (legacyCheck.hasLegacyAuth) {
      usersWithLegacy.push({
        userId: user.id,
        userName: user.userPrincipalName,
        protocols: legacyCheck.protocols
      });
      
      // Auto-block for MVP (make configurable)
      try {
        await graphApiService.blockLegacyAuth(user.id);
        blocked++;
      } catch (error) {
        log.error('[AutomationService] Failed to block legacy auth', error);
      }
    }
  }
  
  return { usersWithLegacyAuth: usersWithLegacy, blocked };
}
```

#### **New UI Components**

```typescript
// src/renderer/components/dashboard/MFAPanel.tsx
// Shows MFA status, allows bulk enforcement

// src/renderer/components/dashboard/LegacyAuthPanel.tsx
// Shows legacy auth usage, allows blocking
```

---

### Week 3-4: Privileged Access Management

#### **New Graph API Methods**

```typescript
// 1. Get directory roles
async getDirectoryRoles(): Promise<Array<{
  id: string;
  displayName: string;
  description: string;
}>> {
  const roles = await this.get<{value: any[]}>('/directoryRoles');
  return roles.value.map(r => ({
    id: r.id,
    displayName: r.displayName,
    description: r.description
  }));
}

// 2. Get role members
async getRoleMembers(roleId: string): Promise<Array<{
  id: string;
  userPrincipalName: string;
  displayName: string;
}>> {
  const members = await this.get<{value: any[]}>(`/directoryRoles/${roleId}/members`);
  return members.value
    .filter(m => m['@odata.type'] === '#microsoft.graph.user')
    .map(m => ({
      id: m.id,
      userPrincipalName: m.userPrincipalName,
      displayName: m.displayName
    }));
}

// 3. Get PIM assignments (requires beta endpoint)
async getPIMAssignments(): Promise<Array<{
  principalId: string;
  roleDefinitionId: string;
  directoryScopeId: string;
  isActive: boolean;
  isEligible: boolean;
}>> {
  // POST /roleManagement/directory/roleEligibilitySchedules
  // Requires: RoleManagement.ReadWrite.Directory
  const assignments = await this.get<{value: any[]}>(
    '/beta/roleManagement/directory/roleEligibilitySchedules',
    { $filter: "principalId ne null" }
  );
  return assignments.value.map(a => ({
    principalId: a.principalId,
    roleDefinitionId: a.roleDefinitionId,
    directoryScopeId: a.directoryScopeId,
    isActive: a.isActive,
    isEligible: a.isEligible
  }));
}

// 4. Remove role assignment
async removeRoleAssignment(roleId: string, userId: string): Promise<void> {
  await this.delete(`/directoryRoles/${roleId}/members/${userId}/$ref`);
}
```

#### **New Automation Methods**

```typescript
async auditPrivilegedRoles(): Promise<{
  globalAdmins: Array<{id: string; userName: string}>;
  excessiveRoles: Array<{userId: string; userName: string; roleCount: number}>;
  shadowAdmins: Array<{userId: string; userName: string; reason: string}>;
}> {
  const roles = await graphApiService.getDirectoryRoles();
  const globalAdminRole = roles.find(r => r.displayName === 'Global Administrator');
  
  if (!globalAdminRole) {
    throw new Error('Global Administrator role not found');
  }
  
  const globalAdmins = await graphApiService.getRoleMembers(globalAdminRole.id);
  
  // Check for excessive roles
  const userRoleCounts: Record<string, {userName: string; count: number}> = {};
  
  for (const role of roles) {
    const members = await graphApiService.getRoleMembers(role.id);
    for (const member of members) {
      if (!userRoleCounts[member.id]) {
        userRoleCounts[member.id] = {
          userName: member.userPrincipalName,
          count: 0
        };
      }
      userRoleCounts[member.id].count++;
    }
  }
  
  const excessiveRoles = Object.entries(userRoleCounts)
    .filter(([_, data]) => data.count > 3)
    .map(([userId, data]) => ({
      userId,
      userName: data.userName,
      roleCount: data.count
    }));
  
  // Shadow admins: users with admin rights via groups/apps
  // This requires deeper analysis of nested group membership
  const shadowAdmins: Array<{userId: string; userName: string; reason: string}> = [];
  
  return { globalAdmins, excessiveRoles, shadowAdmins };
}
```

---

## 📧 **Phase 2: Email Security (Weeks 5-8)**

### New Graph API Methods Needed

```typescript
// Exchange Online requires different permissions:
// Mail.Read, MailboxSettings.ReadWrite, Mail.Send

// 1. Get mailbox rules
async getMailboxRules(userId: string): Promise<Array<{
  id: string;
  displayName: string;
  isEnabled: boolean;
  forwardTo?: string[];
  redirectTo?: string[];
}>> {
  // GET /users/{id}/mailFolders/inbox/messageRules
  const rules = await this.get<{value: any[]}>(
    `/users/${userId}/mailFolders/inbox/messageRules`
  );
  return rules.value.map(r => ({
    id: r.id,
    displayName: r.displayName,
    isEnabled: r.isEnabled,
    forwardTo: r.actions?.forwardTo?.map((f: any) => f.emailAddress?.address),
    redirectTo: r.actions?.redirectTo?.map((r: any) => r.emailAddress?.address)
  }));
}

// 2. Detect external forwarding
async detectExternalForwarding(userId: string): Promise<{
  hasExternalForward: boolean;
  forwardingAddresses: string[];
}> {
  const rules = await this.getMailboxRules(userId);
  const externalForwards = rules
    .flatMap(r => [...(r.forwardTo || []), ...(r.redirectTo || [])])
    .filter(addr => {
      if (!addr) return false;
      // Check if external (simplified)
      const domain = addr.split('@')[1];
      // Would need to check against tenant domains
      return true; // Placeholder
    });
    
  return {
    hasExternalForward: externalForwards.length > 0,
    forwardingAddresses: externalForwards
  };
}

// 3. Get DMARC/SPF/DKIM status
async getDomainAuthenticationStatus(domain: string): Promise<{
  dkim: boolean;
  spf: boolean;
  dmarc: boolean;
  dmarcPolicy: string;
}> {
  // This requires DNS queries or Exchange Admin Center API
  // For MVP: Use message trace data or manual configuration
  // Would need: GET /admin/service/messageTrace
  return {
    dkim: false,
    spf: false,
    dmarc: false,
    dmarcPolicy: 'none'
  };
}
```

---

## 🏗️ **Architecture Pattern for New Capabilities**

### 1. **Detection Service Pattern**

```typescript
// src/main/services/detection/identity-detector.service.ts
export class IdentityDetector {
  async detectMFAgaps(): Promise<DetectionResult[]> {
    // Detection logic
  }
  
  async detectLegacyAuth(): Promise<DetectionResult[]> {
    // Detection logic
  }
}

// src/main/services/detection/exchange-detector.service.ts
export class ExchangeDetector {
  async detectAutoForwarding(): Promise<DetectionResult[]> {
    // Detection logic
  }
}
```

### 2. **Remediation Service Pattern**

```typescript
// src/main/services/remediation/identity-remediator.service.ts
export class IdentityRemediator {
  async enforceMFA(users: string[]): Promise<RemediationResult> {
    // Remediation logic
  }
}
```

### 3. **Unified Automation Orchestrator**

```typescript
// src/main/services/automation-orchestrator.service.ts
export class AutomationOrchestrator {
  constructor(
    private detectors: Detector[],
    private remediators: Remediator[]
  ) {}
  
  async runFullSecurityScan(): Promise<SecurityPosture> {
    // Run all detectors
    // Generate recommendations
    // Allow batch remediation
  }
}
```

---

## 📋 **Quick Wins (Can Implement This Week)**

1. **Enhanced MFA Detection**
   - Use `/users/{id}/authentication/methods` endpoint
   - Show actual MFA methods per user
   - Identify SMS-only (risky) vs Authenticator app

2. **Legacy Auth Detection**
   - Query `/auditLogs/signIns` for legacy protocols
   - Show dashboard of legacy auth usage
   - Add to recommendations panel

3. **Role Audit**
   - Query `/directoryRoles` and `/directoryRoles/{id}/members`
   - Count Global Admins
   - Show role assignments per user

4. **Guest User Analysis**
   - Already have user data
   - Filter for `userType === 'Guest'`
   - Show guest access patterns

---

## 🔐 **Required Permissions for Full Implementation**

### Current Scopes (✅ Granted)
- User.Read
- Directory.Read.All
- User.Read.All
- Organization.Read.All
- Directory.ReadWrite.All
- User.ReadWrite.All

### Additional Scopes Needed

```typescript
// For Phase 1 (Identity)
'RoleManagement.ReadWrite.Directory', // PIM management
'Policy.ReadWrite.ConditionalAccess', // CA policies

// For Phase 2 (Exchange)
'Mail.Read', // Read mailboxes
'MailboxSettings.ReadWrite', // Modify mailbox settings
'Mail.Send', // Send as remediation

// For Phase 3 (SharePoint)
'Sites.ReadWrite.All', // SharePoint management
'Files.ReadWrite.All', // OneDrive management

// For Phase 4 (Teams)
'Team.ReadWrite.All', // Teams management
'Channel.ReadWrite.All', // Channel management

// For Phase 5 (Purview)
'InformationProtectionPolicy.Read', // DLP policies
'DataLossPrevention.Read.All', // DLP rules
```

---

## 🎯 **30-Day Sprint Backlog**

### Sprint 1 (Week 1-2): Identity Hardening
- [ ] MFA status detection (enhanced)
- [ ] Legacy auth detection & blocking
- [ ] Admin role audit UI
- [ ] PIM assignment detection

### Sprint 2 (Week 3-4): Privileged Access
- [ ] Role assignment visualization
- [ ] Shadow admin detection
- [ ] Excessive privilege alerts
- [ ] Auto-remediation for safe cases

### Sprint 3 (Week 5-6): Email Security Start
- [ ] Mailbox rule analysis
- [ ] External forwarding detection
- [ ] DMARC/SPF/DKIM validation (basic)

### Sprint 4 (Week 7-8): Exchange Automation
- [ ] Auto-forward blocking
- [ ] Safe Links/Attachments enforcement
- [ ] SMTP AUTH remediation

---

## 📊 **Success Metrics Dashboard**

```typescript
// New service to track improvements
export class SecurityPostureService {
  async calculateSecurityScore(): Promise<{
    overall: number; // 0-100
    identity: number;
    email: number;
    collaboration: number;
    compliance: number;
    trends: {
      date: string;
      score: number;
    }[];
  }> {
    // Aggregate all detection results
    // Calculate score based on findings
    // Track over time
  }
}
```

---

## 🔄 **Next Steps**

1. **This Week**: Implement MFA detection enhancement
2. **Next Week**: Add legacy auth detection
3. **Week 3**: Build role audit functionality
4. **Week 4**: Create security score calculator

**Each feature should:**
- ✅ Have detection logic
- ✅ Show in UI with recommendations
- ✅ Allow manual remediation
- ✅ Support batch automation (where safe)
- ✅ Log all actions to activity feed

---

**Ready to start implementing? Pick a capability from Phase 1 and I'll help build it!** 🚀

