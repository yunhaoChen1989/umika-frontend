export type RewardSummaryResponse = {
  pointsBalance?: number | null;
  balance?: number | null;
  lifetimePointsEarned?: number | null;
  lifetimeEarned?: number | null;
  lifetimePointsRedeemed?: number | null;
  lifetimeRedeemed?: number | null;
  pointsValueCents?: number | null;
  pointValueCents?: number | null;
  pointsPerDollar?: number | null;
  maxRedemptionPercent?: number | null;
  minRedeemPoints?: number | null;
  minimumRedeemPoints?: number | null;
  nextRewardPoints?: number | null;
  nextRewardAmount?: number | null;
  birthdayBonusPoints?: number | null;
  referralRegisterPoints?: number | null;
  referralFirstOrderPoints?: number | null;
  referralFirstOrderMinimum?: number | null;
  referralCode?: string | null;
  referralInviteUrl?: string | null;
  inviteUrl?: string | null;
  [key: string]: unknown;
};

export type RewardRedemptionStatusResponse = {
  pointsBalance?: number | null;
  redeemablePoints?: number | null;
  redeemableAmount?: number | null;
  minimumRedeemPoints?: number | null;
  minRedeemPoints?: number | null;
  pointValueCents?: number | null;
  pointsValueCents?: number | null;
  [key: string]: unknown;
};

export type RewardTransactionResponse = {
  id?: string | null;
  type?: string | null;
  points?: number | null;
  description?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type SpringPage<T> = {
  content?: T[];
  totalElements?: number;
  totalPages?: number;
  number?: number;
  size?: number;
};
