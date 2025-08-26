import { UserRole, UserStatus } from '../../common/enums/user-role.enum';


export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  roles: UserRole[];
  status: UserStatus;
  referrerSubscriptionStatus: string;
  candidateSubscriptionStatus: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  referredBy?: string;
  stripeAccountId?: string;
  stripeOnboardingStatus?: string;
  stripeCustomerId?: string;
  currentPlanCode?: string;
  stripeSubscriptionId?: string;
  subscriptionPurchased?: boolean;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  nextBillingDate?: Date;
  subscriptionInterval?: string;
  candidateCap?: number;
  purchasedCandidates?: number;
  balance: number;
  password?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  hasRole: (role: UserRole) => boolean;
  isReferrer: () => boolean;
  isCandidate: () => boolean;
  isActive: () => boolean;
  isPending: () => boolean;
}
