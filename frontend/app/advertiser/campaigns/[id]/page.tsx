"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  Users,
  Target,
  DollarSign,
  Hash,
  AtSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  ExternalLink,
  AlertCircle,
  Loader2,
  ImageIcon,
  Play,
  MoreHorizontal,
} from "lucide-react";
import {
  formatCurrency,
  formatNumber,
  formatDate,
  getCampaignStatusLabel,
  getCampaignStatusColor,
} from "@/lib/utils";
import api from "@/lib/api";

// Types based on backend schemas
interface Campaign {
  id: string;
  advertiser_id: string;
  title: string;
  description: string;
  guidelines: string;
  budget: number;
  per_influencer_budget: number;
  escrow_fee: number;
  pg_fee: number;
  pg_fee_payer: string;
  status: string;
  target_follower_min: number;
  target_follower_max: number;
  target_categories: string[];
  target_locations: string[];
  min_engagement_rate: number;
  max_influencers: number;
  selected_influencers: number;
  required_hashtags: string[];
  required_mentions: string[];
  content_type: string;
  settlement_days: number;
  start_date: string;
  end_date: string;
  application_deadline: string;
  created_at: string;
}

interface Participant {
  id: string;
  campaign_id: string;
  influencer_id: string;
  application_message: string;
  applied_at: string;
  is_selected: boolean;
  selected_at: string;
  rejection_reason: string;
  agreed_amount: number;
  payment_status: string;
  // Joined influencer data
  influencer?: {
    id: string;
    username: string;
    full_name: string;
    profile_pic_url: string;
    follower_count: number;
    engagement_rate: number;
    tier: string;
    categories: string[];
  };
}

interface Content {
  id: string;
  campaign_id: string;
  influencer_id: string;
  instagram_media_pk: string;
  post_url: string;
  post_type: string;
  status: string;
  advertiser_approved: string;
  advertiser_feedback: string;
  submitted_at: string;
  reviewed_at: string;
  settlement_due_date: string;
  settled_at: string;
  // Joined influencer data
  influencer?: {
    username: string;
    profile_pic_url: string;
  };
}

interface CampaignStats {
  total_applicants: number;
  selected_influencers: number;
  total_contents: number;
  approved_contents: number;
  pending_contents: number;
  total_reach: number;
  total_likes: number;
  total_comments: number;
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("applicants");

  // Dialog states
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [contentReviewDialogOpen, setContentReviewDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [agreedAmount, setAgreedAmount] = useState<number>(0);
  const [rejectReason, setRejectReason] = useState("");
  const [contentFeedback, setContentFeedback] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch campaign data
  useEffect(() => {
    fetchCampaignData();
  }, [campaignId]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      // Fetch campaign details
      const campaignRes = await fetch(`/api/v1/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!campaignRes.ok) {
        if (campaignRes.status === 404) {
          setError("캠페인을 찾을 수 없습니다.");
          return;
        }
        throw new Error("Failed to fetch campaign");
      }

      const campaignData = await campaignRes.json();
      setCampaign(campaignData);
      setAgreedAmount(campaignData.per_influencer_budget || 0);

      // Fetch participants
      const participantsRes = await fetch(`/api/v1/campaigns/${campaignId}/participants?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        // Fetch influencer details for each participant
        const participantsWithInfluencer = await Promise.all(
          participantsData.participants.map(async (p: Participant) => {
            try {
              const influencerRes = await fetch(`/api/v1/influencers/${p.influencer_id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (influencerRes.ok) {
                const influencer = await influencerRes.json();
                return { ...p, influencer };
              }
            } catch (e) {
              console.error("Failed to fetch influencer:", e);
            }
            return p;
          })
        );
        setParticipants(participantsWithInfluencer);
      }

      // Fetch contents
      const contentsRes = await fetch(`/api/v1/contents/campaign/${campaignId}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (contentsRes.ok) {
        const contentsData = await contentsRes.json();
        setContents(contentsData.contents || []);
      }

      // Fetch stats
      const statsRes = await fetch(`/api/v1/campaigns/${campaignId}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Error fetching campaign data:", err);
      setError("캠페인 정보를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // Select influencer
  const handleSelectInfluencer = async () => {
    if (!selectedParticipant) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/v1/campaigns/${campaignId}/select`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          influencer_id: selectedParticipant.influencer_id,
          agreed_amount: agreedAmount,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to select influencer");
      }

      setSelectDialogOpen(false);
      setSelectedParticipant(null);
      fetchCampaignData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "인플루언서 선정에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject influencer
  const handleRejectInfluencer = async () => {
    if (!selectedParticipant) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/v1/campaigns/${campaignId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          influencer_id: selectedParticipant.influencer_id,
          reason: rejectReason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to reject influencer");
      }

      setRejectDialogOpen(false);
      setSelectedParticipant(null);
      setRejectReason("");
      fetchCampaignData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "인플루언서 거절에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // Approve content
  const handleApproveContent = async () => {
    if (!selectedContent) return;

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/v1/contents/${selectedContent.id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedback: contentFeedback }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to approve content");
      }

      setContentReviewDialogOpen(false);
      setSelectedContent(null);
      setContentFeedback("");
      fetchCampaignData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "콘텐츠 승인에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject content
  const handleRejectContent = async () => {
    if (!selectedContent || !contentFeedback) {
      alert("거절 사유를 입력해주세요.");
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");

      const res = await fetch(`/api/v1/contents/${selectedContent.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: contentFeedback }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to reject content");
      }

      setContentReviewDialogOpen(false);
      setSelectedContent(null);
      setContentFeedback("");
      fetchCampaignData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "콘텐츠 거절에 실패했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter participants
  const applicants = participants.filter((p) => !p.is_selected && !p.rejection_reason);
  const selected = participants.filter((p) => p.is_selected);
  const rejected = participants.filter((p) => p.rejection_reason);

  // Content counts
  const pendingContents = contents.filter((c) => c.advertiser_approved === "pending");
  const approvedContents = contents.filter((c) => c.advertiser_approved === "approved");
  const rejectedContents = contents.filter((c) => c.advertiser_approved === "rejected");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">{error || "캠페인을 찾을 수 없습니다."}</p>
        <Link href="/advertiser/campaigns">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            캠페인 목록으로
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/advertiser/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.title}</h1>
            <Badge className={getCampaignStatusColor(campaign.status)}>
              {getCampaignStatusLabel(campaign.status)}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">{campaign.description}</p>
        </div>
      </div>

      {/* Campaign Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 예산</p>
                <p className="text-lg font-semibold">{formatCurrency(campaign.budget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">인플루언서</p>
                <p className="text-lg font-semibold">
                  {campaign.selected_influencers} / {campaign.max_influencers}명
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">지원자</p>
                <p className="text-lg font-semibold">{applicants.length}명</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">캠페인 기간</p>
                <p className="text-sm font-medium">
                  {campaign.start_date ? formatDate(campaign.start_date) : "미정"} ~{" "}
                  {campaign.end_date ? formatDate(campaign.end_date) : "미정"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">캠페인 요구사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">팔로워 조건</p>
              <p className="font-medium">
                {formatNumber(campaign.target_follower_min)} ~{" "}
                {campaign.target_follower_max ? formatNumber(campaign.target_follower_max) : "무제한"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">최소 참여율</p>
              <p className="font-medium">{campaign.min_engagement_rate || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">인플루언서당 보상</p>
              <p className="font-medium">{formatCurrency(campaign.per_influencer_budget || 0)}</p>
            </div>
          </div>

          {(campaign.required_hashtags?.length > 0 || campaign.required_mentions?.length > 0) && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaign.required_hashtags?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <Hash className="h-4 w-4" /> 필수 해시태그
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.required_hashtags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.required_mentions?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                      <AtSign className="h-4 w-4" /> 필수 멘션
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.required_mentions.map((mention: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {campaign.guidelines && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">가이드라인</p>
              <p className="text-sm whitespace-pre-wrap">{campaign.guidelines}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applicants" className="relative">
            지원자
            {applicants.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {applicants.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="selected">
            선정자
            {selected.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selected.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contents">
            콘텐츠
            {pendingContents.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingContents.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* Applicants Tab */}
        <TabsContent value="applicants" className="mt-6">
          {applicants.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">아직 지원자가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applicants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  onSelect={() => {
                    setSelectedParticipant(participant);
                    setAgreedAmount(campaign.per_influencer_budget || 0);
                    setSelectDialogOpen(true);
                  }}
                  onReject={() => {
                    setSelectedParticipant(participant);
                    setRejectDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Selected Tab */}
        <TabsContent value="selected" className="mt-6">
          {selected.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">선정된 인플루언서가 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selected.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  isSelected
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contents Tab */}
        <TabsContent value="contents" className="mt-6">
          {contents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">제출된 콘텐츠가 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  선정된 인플루언서가 콘텐츠를 업로드하면 자동으로 감지됩니다.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pending Contents */}
              {pendingContents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    검토 대기 ({pendingContents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingContents.map((content) => (
                      <ContentCard
                        key={content.id}
                        content={content}
                        onReview={() => {
                          setSelectedContent(content);
                          setContentFeedback("");
                          setContentReviewDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Contents */}
              {approvedContents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    승인됨 ({approvedContents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvedContents.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>
                </div>
              )}

              {/* Rejected Contents */}
              {rejectedContents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    거절됨 ({rejectedContents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rejectedContents.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">총 지원자</p>
                <p className="text-3xl font-bold">{participants.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">선정 완료</p>
                <p className="text-3xl font-bold text-green-600">{selected.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">제출된 콘텐츠</p>
                <p className="text-3xl font-bold">{contents.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">승인된 콘텐츠</p>
                <p className="text-3xl font-bold text-blue-600">{approvedContents.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>캠페인 진행률</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>인플루언서 선정</span>
                  <span>
                    {selected.length} / {campaign.max_influencers}
                  </span>
                </div>
                <Progress value={(selected.length / campaign.max_influencers) * 100} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>콘텐츠 승인</span>
                  <span>
                    {approvedContents.length} / {selected.length || 1}
                  </span>
                </div>
                <Progress
                  value={(approvedContents.length / (selected.length || 1)) * 100}
                  className="bg-green-100"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Select Influencer Dialog */}
      <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>인플루언서 선정</DialogTitle>
            <DialogDescription>
              {selectedParticipant?.influencer?.username || "이 인플루언서"}를 캠페인에
              선정하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>보상 금액</Label>
              <Input
                type="number"
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(Number(e.target.value))}
                placeholder="보상 금액을 입력하세요"
              />
              <p className="text-sm text-muted-foreground mt-1">
                기본값: {formatCurrency(campaign.per_influencer_budget || 0)}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSelectInfluencer} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              선정하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Influencer Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지원 거절</DialogTitle>
            <DialogDescription>
              {selectedParticipant?.influencer?.username || "이 인플루언서"}의 지원을
              거절하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>거절 사유 (선택)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거절 사유를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRejectInfluencer} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              거절하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Review Dialog */}
      <Dialog open={contentReviewDialogOpen} onOpenChange={setContentReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>콘텐츠 검토</DialogTitle>
            <DialogDescription>콘텐츠를 검토하고 승인 또는 거절해주세요.</DialogDescription>
          </DialogHeader>
          {selectedContent && (
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <a
                  href={selectedContent.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-full flex items-center justify-center hover:bg-muted/80 transition"
                >
                  <div className="text-center">
                    <ExternalLink className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Instagram에서 보기</p>
                  </div>
                </a>
              </div>
              <div>
                <Label>피드백 {selectedContent.advertiser_approved === "pending" && "(거절 시 필수)"}</Label>
                <Textarea
                  value={contentFeedback}
                  onChange={(e) => setContentFeedback(e.target.value)}
                  placeholder="피드백을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setContentReviewDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleRejectContent} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              거절
            </Button>
            <Button onClick={handleApproveContent} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              승인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Participant Card Component
function ParticipantCard({
  participant,
  isSelected,
  onSelect,
  onReject,
}: {
  participant: Participant;
  isSelected?: boolean;
  onSelect?: () => void;
  onReject?: () => void;
}) {
  const influencer = participant.influencer;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={influencer?.profile_pic_url} />
            <AvatarFallback>{influencer?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">@{influencer?.username || "unknown"}</p>
              {influencer?.tier && (
                <Badge variant="outline" className="text-xs">
                  {influencer.tier}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{influencer?.full_name}</p>
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {formatNumber(influencer?.follower_count || 0)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {(influencer?.engagement_rate || 0).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {participant.application_message && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            "{participant.application_message}"
          </p>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {formatDate(participant.applied_at)} 지원
          </p>
          {isSelected ? (
            <Badge className="bg-green-100 text-green-700">선정됨</Badge>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onReject}>
                거절
              </Button>
              <Button size="sm" onClick={onSelect}>
                선정
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Content Card Component
function ContentCard({
  content,
  onReview,
}: {
  content: Content;
  onReview?: () => void;
}) {
  const statusConfig = {
    pending: { label: "검토 대기", color: "bg-yellow-100 text-yellow-700" },
    approved: { label: "승인됨", color: "bg-green-100 text-green-700" },
    rejected: { label: "거절됨", color: "bg-red-100 text-red-700" },
  };

  const status = statusConfig[content.advertiser_approved as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-3 relative">
          <a
            href={content.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full flex items-center justify-center hover:bg-muted/80 transition"
          >
            {content.post_type === "video" || content.post_type === "VIDEO" ? (
              <Play className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
          </a>
          <Badge className={`absolute top-2 right-2 ${status.color}`}>{status.label}</Badge>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {formatDate(content.submitted_at)}
          </p>
          <div className="flex gap-2">
            <a
              href={content.post_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="sm" variant="ghost">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            {content.advertiser_approved === "pending" && onReview && (
              <Button size="sm" onClick={onReview}>
                검토
              </Button>
            )}
          </div>
        </div>

        {content.advertiser_feedback && (
          <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
            "{content.advertiser_feedback}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}
