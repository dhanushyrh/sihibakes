import { InsightsPanel } from "@/components/admin/analytics/InsightsPanel";

interface MarketingRecommendationsProps {
  recommendations: string[];
}

export function MarketingRecommendations({
  recommendations,
}: MarketingRecommendationsProps) {
  return <InsightsPanel insights={recommendations} />;
}
