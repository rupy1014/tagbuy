// Platform Types
export type Platform = "instagram" | "tiktok" | "youtube" | "naver_blog";

// User Types
export type UserType = "advertiser" | "influencer" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  type: UserType;
  createdAt: string;
  updatedAt: string;
}

export interface Advertiser extends User {
  type: "advertiser";
  companyName: string;
  businessNumber: string;
  contactName: string;
  contactPhone: string;
}

export interface InfluencerUser extends User {
  type: "influencer";
  instagramUsername: string;
  instagramPk: string;
  followerCount: number;
  engagementRate: number;
  tier: InfluencerTier;
  categories: string[];
  bankName?: string;
  bankAccount?: string;
}

// Influencer Types
export type InfluencerTier = "nano" | "micro" | "macro" | "mega";

export interface Influencer {
  id: string;
  platform: Platform;
  platformUid: string;
  username: string;
  fullName: string;
  biography: string;
  profilePicUrl: string;
  landingUrl?: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  isVerified: boolean;
  isBusiness: boolean;
  categories: string[];
  tier: InfluencerTier;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  avgReach?: number;
  influenceScore?: number;
  trustScore?: number;
  fakeFollowerRatio?: number;
  adRate?: number;
  publicEmail?: string;
  publicPhone?: string;
  gender?: "M" | "F";
  birthYear?: number;
  source?: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InfluencerSearchParams {
  platform?: Platform;
  category?: string;
  tier?: InfluencerTier;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  maxEngagementRate?: number;
  minTrustScore?: number;
  maxAdRate?: number;
  isVerified?: boolean;
  isBusiness?: boolean;
  gender?: "M" | "F";
  query?: string;
  sortBy?: "follower_count" | "engagement_rate" | "trust_score" | "influence_score" | "created_at";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Campaign Types
export type CampaignStatus = "draft" | "active" | "pending" | "completed" | "cancelled";
export type CampaignGoal = "brand_awareness" | "sales_conversion" | "engagement";
export type SettlementRule = "standard" | "short" | "long" | "immediate";

export interface Campaign {
  id: string;
  advertiserId: string;
  title: string;
  description: string;
  goal: CampaignGoal;
  category: string;
  status: CampaignStatus;
  budget: number;
  rewardPerInfluencer: number;
  targetInfluencerCount: number;
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  settlementRule: SettlementRule;
  guidelines: CampaignGuidelines;
  pgFeePayerIsAdvertiser: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  applicationsCount?: number;
  approvedCount?: number;
  submittedContentsCount?: number;
}

export interface CampaignGuidelines {
  productDescription: string;
  requiredMentions: string[];
  prohibitedItems: string[];
  referenceImages: string[];
  hashtags: string[];
}

export interface CampaignCreateInput {
  title: string;
  description: string;
  goal: CampaignGoal;
  category: string;
  budget: number;
  rewardPerInfluencer: number;
  targetInfluencerCount: number;
  minFollowers: number;
  maxFollowers: number;
  minEngagementRate: number;
  settlementRule: SettlementRule;
  guidelines: CampaignGuidelines;
  pgFeePayerIsAdvertiser: boolean;
  startDate: string;
  endDate: string;
}

// Application Types
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface CampaignApplication {
  id: string;
  campaignId: string;
  influencerId: string;
  influencer: Influencer;
  status: ApplicationStatus;
  message: string;
  portfolioUrls: string[];
  appliedAt: string;
  reviewedAt?: string;
}

// Content Types
export type ContentStatus = "pending" | "approved" | "revision_requested" | "rejected";

export interface CampaignContent {
  id: string;
  campaignId: string;
  influencerId: string;
  influencer: Influencer;
  contentUrl: string;
  screenshotUrl?: string;
  status: ContentStatus;
  aiReport?: AIVerificationReport;
  advertiserFeedback?: string;
  submittedAt: string;
  reviewedAt?: string;
  settlementScheduledAt?: string;
}

export interface AIVerificationReport {
  guidelineComplianceScore: number;
  checklist: {
    hasRequiredHashtags: boolean;
    hasBrandMention: boolean;
    hasProductImage: boolean;
    hasRequiredText: boolean;
  };
  estimatedReach: number;
  estimatedEngagement: number;
  prohibitedWordsFound: string[];
  overallScore: number;
  recommendation: "approve" | "review" | "reject";
}

// Content Metrics
export interface ContentMetrics {
  id: string;
  contentId: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  reachCount: number;
  impressionCount: number;
  engagementRate: number;
  collectedAt: string;
}

// Earnings Types
export interface EarningsSummary {
  thisMonthEarnings: number;
  pendingSettlement: number;
  withdrawableBalance: number;
  totalEarnings: number;
}

export interface EarningsHistory {
  id: string;
  campaignId: string;
  campaignTitle: string;
  amount: number;
  status: "pending" | "settled" | "withdrawn";
  settledAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  bankName: string;
  bankAccount: string;
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
}

// Discovery Types
export interface DiscoveryStats {
  totalInfluencers: number;
  byTier: Record<InfluencerTier, number>;
  byCategory: Record<string, number>;
  recentlySynced24h: number;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Payment Types
export interface PaymentPrepareResponse {
  orderId: string;
  orderName: string;
  price: number;
  campaignBudget: number;
  escrowFee: number;
  pgFeeEstimate: number;
  pgFeePayer: "advertiser" | "influencer";
}

export interface PaymentVerifyResponse {
  success: boolean;
  paymentId: string;
  escrowId: string;
  message: string;
}

export interface PaymentRecord {
  id: string;
  receiptId: string;
  orderId: string;
  method: string;
  methodName: string;
  price: number;
  status: string;
  statusLocale: string;
  campaignId: string;
  purchasedAt: string;
  createdAt: string;
}

export interface EscrowInfo {
  id: string;
  campaignId: string;
  totalAmount: number;
  escrowFee: number;
  pgFee: number;
  netAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  status: "pending" | "deposited" | "partially_released" | "released" | "refunded" | "cancelled";
  depositedAt: string;
  createdAt: string;
}

export interface InfluencerBalance {
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
}

// Influencer Post Types
export interface InfluencerPost {
  id: string;
  influencerId: string;
  platform: Platform;
  mediaPk: string;
  shortcode?: string;
  mediaType: number; // 1=photo, 2=video, 8=carousel
  thumbnailUrl?: string;
  postUrl?: string;
  caption?: string;
  likeCount: number;
  commentCount: number;
  playCount?: number;
  postedAt?: string;
  crawledAt?: string;
}

export interface InfluencerPostsResponse {
  posts: InfluencerPost[];
  total: number;
  crawledAt?: string;
}
