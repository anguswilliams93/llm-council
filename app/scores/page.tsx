"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Trophy, Medal, ArrowLeft, BarChart3, Hash, Target, Award } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import * as api from "@/lib/api";
import type { ModelScore, OverallScores } from "@/lib/api";

// Model name to short label mapping
const getModelShortName = (model: string): string => {
  if (model.includes("gpt-5")) return "GPT-5";
  if (model.includes("gpt-4")) return "GPT-4";
  if (model.includes("gpt-3.5")) return "GPT-3.5";
  if (model.includes("claude-opus")) return "Claude Opus";
  if (model.includes("claude-sonnet")) return "Claude Sonnet";
  if (model.includes("gemini-3")) return "Gemini 3";
  if (model.includes("gemini-2")) return "Gemini 2";
  if (model.includes("gemini")) return "Gemini";
  if (model.includes("grok-4")) return "Grok 4";
  if (model.includes("grok-3")) return "Grok 3";
  if (model.includes("grok")) return "Grok";
  if (model.includes("llama")) return "Llama";
  if (model.includes("mistral")) return "Mistral";
  if (model.includes("mixtral")) return "Mixtral";
  // Handle anonymous labels like "Response A", "Response B"
  if (model.startsWith("Response ")) return model;
  return model.split("/").pop() || model;
};

// Model colors for visual distinction
const getModelColor = (model: string): string => {
  if (model.includes("gpt")) return "bg-emerald-500";
  if (model.includes("claude")) return "bg-orange-500";
  if (model.includes("gemini")) return "bg-blue-500";
  if (model.includes("grok")) return "bg-slate-700";
  if (model.includes("llama")) return "bg-purple-500";
  if (model.includes("mistral") || model.includes("mixtral")) return "bg-cyan-500";
  // Colors for anonymous labels
  if (model === "Response A") return "bg-blue-500";
  if (model === "Response B") return "bg-green-500";
  if (model === "Response C") return "bg-purple-500";
  if (model === "Response D") return "bg-orange-500";
  return "bg-gray-500";
};

// Trophy styles for top 3
const getTrophyStyle = (place: number) => {
  switch (place) {
    case 1:
      return {
        bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600",
        glow: "drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]",
        ring: "ring-yellow-400/50",
        text: "text-yellow-600 dark:text-yellow-400",
      };
    case 2:
      return {
        bg: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500",
        glow: "drop-shadow-[0_0_8px_rgba(148,163,184,0.5)]",
        ring: "ring-slate-400/50",
        text: "text-slate-600 dark:text-slate-300",
      };
    case 3:
      return {
        bg: "bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800",
        glow: "drop-shadow-[0_0_8px_rgba(180,83,9,0.5)]",
        ring: "ring-amber-600/50",
        text: "text-amber-700 dark:text-amber-500",
      };
    default:
      return {
        bg: "bg-muted",
        glow: "",
        ring: "",
        text: "text-muted-foreground",
      };
  }
};

function LeaderboardSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

function LeaderboardRow({
  score,
  position,
}: {
  score: ModelScore;
  position: number;
}) {
  const isTopThree = position <= 3;
  const style = getTrophyStyle(position);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`relative flex items-center gap-4 p-4 rounded-xl transition-all overflow-hidden ${
        position === 1
          ? "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border-2 border-yellow-500/30"
          : position === 2
          ? "bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent border-2 border-slate-400/30"
          : position === 3
          ? "bg-gradient-to-r from-amber-700/10 via-amber-700/5 to-transparent border-2 border-amber-600/30"
          : "bg-card border border-border hover:bg-muted/50"
      }`}
    >
      {/* Position / Trophy */}
      <div className="flex-shrink-0 w-14 flex justify-center">
        {isTopThree ? (
          <motion.div
            className={`relative flex items-center justify-center w-12 h-12 rounded-full ${style.bg} ${style.glow} ring-2 ${style.ring}`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: position * 0.15,
            }}
          >
            <Trophy className="h-6 w-6 text-white" />
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1, 1.05, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        ) : (
          <span className="text-2xl font-bold text-muted-foreground">
            #{position}
          </span>
        )}
      </div>

      {/* Model Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div
            className={`h-4 w-4 rounded-full ${getModelColor(score.model)} ${
              isTopThree ? `ring-2 ring-offset-2 ring-offset-background ${style.ring}` : ""
            }`}
          />
          <span className={`font-bold text-lg ${isTopThree ? style.text : ""}`}>
            {getModelShortName(score.model)}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {score.model}
          </span>
        </div>
        {score.description && (
          <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
            {score.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {score.rankings_received} rankings
          </span>
          <span>•</span>
          <span>Avg position: {score.average_position.toFixed(2)}</span>
        </div>
      </div>

      {/* Medals */}
      <div className="flex items-center gap-2">
        {score.first_places > 0 && (
          <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-600">
            🥇 {score.first_places}
          </Badge>
        )}
        {score.second_places > 0 && (
          <Badge variant="outline" className="bg-slate-400/10 border-slate-400/30 text-slate-600">
            🥈 {score.second_places}
          </Badge>
        )}
        {score.third_places > 0 && (
          <Badge variant="outline" className="bg-amber-600/10 border-amber-600/30 text-amber-700">
            🥉 {score.third_places}
          </Badge>
        )}
      </div>

      {/* Points */}
      <div className="flex-shrink-0 text-right min-w-[80px]">
        <motion.div
          className={`text-2xl font-bold tabular-nums ${isTopThree ? style.text : ""}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: position * 0.1 + 0.2, type: "spring" }}
        >
          {score.total_points}
        </motion.div>
        <div className="text-xs text-muted-foreground">points</div>
      </div>
    </motion.div>
  );
}

export default function ScoresPage() {
  const [scores, setScores] = React.useState<OverallScores | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadScores = async () => {
      try {
        setIsLoading(true);
        const data = await api.getOverallScores();
        setScores(data);
        setError(null);
      } catch (err) {
        setError("Failed to load scores");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadScores();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <motion.div
          className="flex items-center gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Overall Scores
            </h1>
            <p className="text-muted-foreground">
              Aggregated rankings across all council deliberations
            </p>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {scores && (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <StatCard
              title="Deliberations Analyzed"
              value={scores.total_conversations_analyzed}
              icon={BarChart3}
              description="Total council sessions"
            />
            <StatCard
              title="Rankings Processed"
              value={scores.total_rankings_processed}
              icon={Target}
              description="Individual model evaluations"
            />
            <StatCard
              title="Models Ranked"
              value={scores.leaderboard.length}
              icon={Award}
              description="Unique response labels"
            />
          </motion.div>
        )}

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="overflow-hidden border-2 border-primary/20">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-transparent to-primary/10">
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                Global Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <LeaderboardSkeleton />
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  {error}
                </div>
              ) : scores && scores.leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {scores.leaderboard.map((score, index) => (
                    <LeaderboardRow
                      key={score.model}
                      score={score}
                      position={index + 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">No scores yet</p>
                  <p className="text-sm">
                    Start a conversation to see the council in action!
                  </p>
                  <Link href="/">
                    <Button variant="outline" className="mt-4">
                      Go to Council
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Methodology Note */}
        <motion.div
          className="mt-8 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>
            Points are awarded based on inverse ranking position. With N models,
            1st place receives N points, 2nd receives N-1 points, and so on.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
