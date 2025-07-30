import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, MessageSquare, Target, DollarSign, Users } from 'lucide-react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useContacts } from '@/hooks/useContacts';
import { useUserCredits } from '@/hooks/useUserCredits';

export function MetricsGrid() {
  const { campaigns } = useCampaigns();
  const { contacts } = useContacts();
  const { data: credits } = useUserCredits();

  // Calculate real metrics from data
  const totalCampaigns = campaigns?.length || 0;
  const totalContacts = contacts?.length || 0;
  const totalSent = campaigns?.reduce((sum, c) => sum + (c.sent_count || 0), 0) || 0;
  const totalDelivered = campaigns?.reduce((sum, c) => sum + (c.delivered_count || 0), 0) || 0;
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0';
  const remainingCredits = credits?.credits_remaining || 0;

  const metrics = [
    {
      title: "Total Campaigns",
      value: totalCampaigns.toString(),
      icon: MessageSquare,
      description: "All time",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Delivery Rate",
      value: `${deliveryRate}%`,
      icon: Target,
      description: "Success rate",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "SMS Credits",
      value: `${remainingCredits.toFixed(0)} SMS`,
      icon: MessageSquare,
      description: "Available balance",
      gradient: "from-purple-500 to-violet-500"
    },
    {
      title: "Total Contacts",
      value: totalContacts.toString(),
      icon: Users,
      description: "In your database",
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8 px-1 sm:px-0">
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm min-w-0">
          <div className={`absolute inset-0 bg-gradient-to-br ${metric.gradient} opacity-5`} />
          <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${metric.gradient}`} />
          <CardHeader className="relative pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs sm:text-sm font-medium text-gray-600">
                {metric.title}
              </CardDescription>
              <metric.icon className="w-4 h-4 text-gray-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
              {metric.value}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative pt-0">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {metric.description}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
