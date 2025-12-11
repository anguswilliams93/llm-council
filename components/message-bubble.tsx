"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, User, Check, ChevronDown, ChevronUp, Trophy, Copy, Download } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CouncilSpinner } from "@/components/council-spinner";
import * as api from "@/lib/api";

import type {
  Message,
  Stage1Result,
  Stage2Result,
  Stage3Result,
  CouncilMetadata,
  Conversation,
} from "@/lib/types";

// Typewriter effect component for Stage 3 synthesis
interface TypewriterTextProps {
  text: string;
  speed?: number; // ms per character
  onComplete?: () => void;
}

function TypewriterText({ text, speed = 5, onComplete }: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = React.useState("");
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (!text) return;

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <MarkdownContent>{displayedText}</MarkdownContent>
      {!isComplete && (
        <motion.span
          className="inline-block w-2 h-4 bg-green-500 ml-0.5"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </motion.div>
  );
}

// Markdown component with proper plugins
interface MarkdownContentProps {
  children: string;
}

function MarkdownContent({ children }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        // Style tables properly
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse border border-border text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-border px-3 py-2 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-3 py-2">{children}</td>
        ),
        // Style code blocks
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className={`${className} block bg-muted p-3 rounded-md overflow-x-auto text-sm font-mono`} {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-muted rounded-md overflow-x-auto my-3">
            {children}
          </pre>
        ),
        // Style lists
        ul: ({ children }) => (
          <ul className="list-disc pl-6 my-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal pl-6 my-2 space-y-1">{children}</ol>
        ),
        // Style headings
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>
        ),
        // Style paragraphs
        p: ({ children }) => (
          <p className="my-2 leading-relaxed">{children}</p>
        ),
        // Style blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-primary/30 pl-4 my-3 italic text-muted-foreground">
            {children}
          </blockquote>
        ),
        // Style links
        a: ({ href, children }) => (
          <a href={href} className="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        ),
        // Style strong/bold
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        // Style horizontal rules
        hr: () => <hr className="my-4 border-border" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// Model name to short label mapping
const getModelShortName = (model: string): string => {
  if (model.includes("gpt-5")) return "GPT-5";
  if (model.includes("gpt-4")) return "GPT-4";
  if (model.includes("gpt-3.5")) return "GPT-3.5";
  if (model.includes("claude-opus")) return "Claude Opus";
  if (model.includes("claude-sonnet")) return "Claude Sonnet";
  if (model.includes("claude-3.5")) return "Claude 3.5";
  if (model.includes("claude-3")) return "Claude 3";
  if (model.includes("claude")) return "Claude";
  if (model.includes("gemini-3")) return "Gemini 3";
  if (model.includes("gemini-2")) return "Gemini 2";
  if (model.includes("gemini")) return "Gemini";
  if (model.includes("grok-4")) return "Grok 4";
  if (model.includes("grok-3")) return "Grok 3";
  if (model.includes("grok")) return "Grok";
  if (model.includes("llama")) return "Llama";
  if (model.includes("mistral")) return "Mistral";
  if (model.includes("mixtral")) return "Mixtral";
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
  return "bg-gray-500";
};

interface Stage1PanelProps {
  results: Stage1Result[];
  isLoading?: boolean;
}

function Stage1Panel({ results, isLoading }: Stage1PanelProps) {
  const [activeTab, setActiveTab] = React.useState<string>(
    results[0]?.model || ""
  );

  React.useEffect(() => {
    if (results.length > 0 && !activeTab) {
      setActiveTab(results[0].model);
    }
  }, [results, activeTab]);

  if (isLoading) {
    return (
      <div className="py-2">
        <span className="text-sm text-muted-foreground">
          Collecting responses from council models...
        </span>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
        {results.map((result) => (
          <TabsTrigger
            key={result.model}
            value={result.model}
            className="flex items-center gap-2 text-xs px-3 py-1.5"
          >
            <div
              className={`h-2 w-2 rounded-full ${getModelColor(result.model)}`}
            />
            {getModelShortName(result.model)}
          </TabsTrigger>
        ))}
      </TabsList>
      {results.map((result) => (
        <TabsContent key={result.model} value={result.model} className="mt-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm">
                  <MarkdownContent>{result.response}</MarkdownContent>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

interface Stage2PanelProps {
  results: Stage2Result[];
  metadata?: CouncilMetadata;
  isLoading?: boolean;
}

// Trophy component with shiny effects
function TrophyIcon({ place }: { place: 1 | 2 | 3 }) {
  const colors = {
    1: {
      main: "text-yellow-500",
      glow: "drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]",
      bg: "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-600",
      ring: "ring-yellow-400/50",
    },
    2: {
      main: "text-slate-400",
      glow: "drop-shadow-[0_0_6px_rgba(148,163,184,0.5)]",
      bg: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500",
      ring: "ring-slate-400/50",
    },
    3: {
      main: "text-amber-700",
      glow: "drop-shadow-[0_0_6px_rgba(180,83,9,0.5)]",
      bg: "bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800",
      ring: "ring-amber-600/50",
    },
  };

  const style = colors[place];

  return (
    <motion.div
      className={`relative flex items-center justify-center w-10 h-10 rounded-full ${style.bg} ${style.glow} ring-2 ${style.ring}`}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        delay: (place - 1) * 0.15,
      }}
    >
      <Trophy className={`h-5 w-5 text-white ${style.glow}`} />
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
  );
}

// Scoreboard component
function Scoreboard({
  rankings,
}: {
  rankings: Array<{ model: string; average_rank: number; rankings_count: number; total_points?: number }>;
}) {
  // Calculate points using inverse ranking: if N models, 1st place = N points, 2nd = N-1, etc.
  const totalModels = rankings.length;
  const rankingsWithPoints = rankings.map((ranking) => {
    // Points = (totalModels + 1) - average_rank
    // e.g., with 4 models: rank 1.0 = 4 points, rank 2.0 = 3 points, etc.
    const points = ranking.total_points ??
      Math.round((totalModels + 1 - ranking.average_rank) * ranking.rankings_count * 10) / 10;
    return { ...ranking, points };
  });

  // Sort by points descending (highest points first)
  const sortedRankings = [...rankingsWithPoints].sort((a, b) => b.points - a.points);

  // Calculate max possible points for the progress bar
  const maxPossiblePoints = totalModels * rankings[0]?.rankings_count || 1;

  return (
    <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 via-transparent to-primary/10">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500 drop-shadow-[0_0_4px_rgba(234,179,8,0.5)]" />
          <span className="bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600 bg-clip-text text-transparent font-bold">
            Council Scoreboard
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-3">
          {sortedRankings.map((ranking, index) => {
            const place = index + 1;
            const isTopThree = place <= 3;
            const pointsPercentage = (ranking.points / maxPossiblePoints) * 100;

            return (
              <motion.div
                key={ranking.model}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-center gap-3 p-3 rounded-lg transition-all overflow-hidden ${
                  place === 1
                    ? "bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent border border-yellow-500/30"
                    : place === 2
                    ? "bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent border border-slate-400/30"
                    : place === 3
                    ? "bg-gradient-to-r from-amber-700/10 via-amber-700/5 to-transparent border border-amber-600/30"
                    : "bg-muted/30 border border-transparent"
                }`}
              >
                {/* Points progress bar background */}
                <motion.div
                  className={`absolute inset-y-0 left-0 ${
                    place === 1
                      ? "bg-yellow-500/10"
                      : place === 2
                      ? "bg-slate-400/10"
                      : place === 3
                      ? "bg-amber-600/10"
                      : "bg-primary/5"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pointsPercentage}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                />

                {/* Position / Trophy */}
                <div className="relative flex-shrink-0 w-10 flex justify-center">
                  {isTopThree ? (
                    <TrophyIcon place={place as 1 | 2 | 3} />
                  ) : (
                    <motion.span
                      className="text-lg font-bold text-muted-foreground"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      #{place}
                    </motion.span>
                  )}
                </div>

                {/* Model Info */}
                <div className="relative flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${getModelColor(
                        ranking.model
                      )} ring-2 ring-offset-1 ring-offset-background ${
                        place === 1
                          ? "ring-yellow-400/50"
                          : place === 2
                          ? "ring-slate-400/50"
                          : place === 3
                          ? "ring-amber-600/50"
                          : "ring-transparent"
                      }`}
                    />
                    <span
                      className={`font-semibold truncate ${
                        place === 1
                          ? "text-yellow-700 dark:text-yellow-400"
                          : place === 2
                          ? "text-slate-600 dark:text-slate-300"
                          : place === 3
                          ? "text-amber-700 dark:text-amber-500"
                          : "text-foreground"
                      }`}
                    >
                      {getModelShortName(ranking.model)}
                    </span>
                  </div>
                </div>

                {/* Points Score */}
                <div className="relative flex-shrink-0 text-right">
                  <motion.div
                    className={`text-xl font-bold tabular-nums ${
                      place === 1
                        ? "text-yellow-600 dark:text-yellow-400"
                        : place === 2
                        ? "text-slate-500 dark:text-slate-400"
                        : place === 3
                        ? "text-amber-700 dark:text-amber-500"
                        : "text-muted-foreground"
                    }`}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                  >
                    {ranking.points.toFixed(1)}
                  </motion.div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>

                {/* Rankings count badge */}
                <Badge
                  variant="outline"
                  className="relative flex-shrink-0 text-xs tabular-nums"
                >
                  {ranking.rankings_count} votes
                </Badge>
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Points = ({totalModels} - rank + 1) per vote. Higher points = Better performance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Stage2Panel({ results, metadata, isLoading }: Stage2PanelProps) {
  const [expandedRankings, setExpandedRankings] = React.useState<Set<string>>(
    new Set()
  );

  const toggleRanking = (model: string) => {
    setExpandedRankings((prev) => {
      const next = new Set(prev);
      if (next.has(model)) {
        next.delete(model);
      } else {
        next.add(model);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <span className="text-sm font-medium text-muted-foreground">Waiting for ranking results...</span>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      {metadata?.aggregate_rankings && metadata.aggregate_rankings.length > 0 && (
        <Scoreboard rankings={metadata.aggregate_rankings} />
      )}

      {/* Individual Rankings */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          Individual Evaluations
        </h4>
        {results.map((result) => (
          <Collapsible
            key={result.model}
            open={expandedRankings.has(result.model)}
            onOpenChange={() => toggleRanking(result.model)}
          >
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 rounded-full ${getModelColor(
                          result.model
                        )}`}
                      />
                      <CardTitle className="text-sm">
                        {getModelShortName(result.model)}&apos;s Evaluation
                      </CardTitle>
                    </div>
                    {expandedRankings.has(result.model) ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  {result.parsed_ranking && result.parsed_ranking.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {result.parsed_ranking.map((label, idx) => {
                        const modelName = metadata?.label_to_model?.[label];
                        return (
                          <Badge
                            key={label}
                            variant="outline"
                            className="text-xs"
                          >
                            {idx + 1}.{" "}
                            {modelName
                              ? getModelShortName(modelName)
                              : label}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Separator className="mb-3" />
                  <div className="text-sm">
                    <MarkdownContent>{result.ranking}</MarkdownContent>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}

interface Stage3PanelProps {
  result?: Stage3Result;
  isLoading?: boolean;
  isNewResponse?: boolean; // Whether this is a newly streamed response (show typewriter)
}

function Stage3Panel({ result, isLoading, isNewResponse = false }: Stage3PanelProps) {
  const [hasPlayedTypewriter, setHasPlayedTypewriter] = React.useState(!isNewResponse);
  const [copied, setCopied] = React.useState(false);

  // Reset typewriter state when result changes and it's a new response
  React.useEffect(() => {
    if (isNewResponse && result) {
      setHasPlayedTypewriter(false);
    }
  }, [result?.response, isNewResponse]);

  const handleCopy = async () => {
    if (!result?.response) return;
    try {
      await navigator.clipboard.writeText(result.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!result?.response) return;
    const blob = new Blob([result.response], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "synthesis.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <span className="text-sm font-medium text-muted-foreground">Waiting for synthesis...</span>
      </div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <CardTitle className="text-sm">
                Final Synthesis
              </CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleDownload}
                title="Download as Markdown"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            {!hasPlayedTypewriter && isNewResponse ? (
              <TypewriterText
                text={result.response}
                speed={10}
                onComplete={() => setHasPlayedTypewriter(true)}
              />
            ) : (
              <MarkdownContent>{result.response}</MarkdownContent>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface MessageBubbleProps {
  message: Message;
  metadata?: CouncilMetadata;
  stage1Loading?: boolean;
  stage2Loading?: boolean;
  stage3Loading?: boolean;
  conversationId?: string;
}

export function MessageBubble({
  message,
  metadata,
  stage1Loading,
  stage2Loading,
  stage3Loading,
  conversationId,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  // Determine which stages are available
  const hasStage1 = "stage1" in message && message.stage1 && message.stage1.length > 0;
  const hasStage2 = "stage2" in message && message.stage2 && message.stage2.length > 0;
  const hasStage3 = "stage3" in message && message.stage3;

  // Determine if any stage is actively loading (streaming in progress)
  const isStreaming = stage1Loading || stage2Loading || stage3Loading;

  // Track if we were previously streaming (to detect when streaming completes)
  const wasStreamingRef = React.useRef(isStreaming);

  // Track if this is a newly streamed response (for typewriter effect)
  const [isNewResponse, setIsNewResponse] = React.useState(isStreaming);

  // Start on stage1 when loading, otherwise show the most advanced completed stage
  const getInitialStage = () => {
    if (isStreaming) return "stage1";
    if (hasStage3) return "stage3";
    if (hasStage2) return "stage2";
    return "stage1";
  };

  const [activeStage, setActiveStage] = React.useState(getInitialStage);

  // Smooth progress animation
  const [smoothProgress, setSmoothProgress] = React.useState(0);
  const [statusMessageIndex, setStatusMessageIndex] = React.useState(0);

  // Target progress values for each stage
  const targetProgress = isStreaming
    ? (stage3Loading ? 95 : stage2Loading ? 60 : stage1Loading ? 25 : 0)
    : (hasStage3 ? 100 : hasStage2 ? 65 : hasStage1 ? 30 : 0);

  // Smooth progress animation effect
  React.useEffect(() => {
    if (!isStreaming) {
      setSmoothProgress(targetProgress);
      return;
    }

    const interval = setInterval(() => {
      setSmoothProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        // Ease towards target with small random variation for organic feel
        const step = diff * 0.08 + (Math.random() * 0.5);
        return Math.min(prev + step, targetProgress);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [targetProgress, isStreaming]);

  // Rotating status messages for each stage
  const stage1Messages = [
    "Collecting independent responses from council models...",
    "Reducing hallucinations through diverse perspectives...",
    "Analyzing token efficiency across models...",
    "Gathering expert opinions from the council...",
    "Processing parallel model queries...",
  ];

  const stage2Messages = [
    "Council models anonymously ranking each other's responses...",
    "Evaluating response quality and accuracy...",
    "Cross-validating factual consistency...",
    "Identifying strongest arguments and evidence...",
    "Computing aggregate consensus rankings...",
  ];

  const stage3Messages = [
    "Synthesizing final answer from top-ranked responses...",
    "Merging best insights into cohesive response...",
    "Ensuring factual accuracy in synthesis...",
    "Formatting final output with proper structure...",
    "Finalizing council deliberation...",
  ];

  // Rotate status messages during streaming
  React.useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      setStatusMessageIndex((prev) => prev + 1);
    }, 3000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const getStatusText = () => {
    if (stage3Loading) return stage3Messages[statusMessageIndex % stage3Messages.length];
    if (stage2Loading) return stage2Messages[statusMessageIndex % stage2Messages.length];
    if (stage1Loading) return stage1Messages[statusMessageIndex % stage1Messages.length];
    if (hasStage3) return "Council deliberation complete";
    if (hasStage2) return "Rankings complete, final synthesis in progress";
    if (hasStage1) return "Individual responses collected, rankings in progress";
    return "Starting council deliberation...";
  };

  const [showFullResponse, setShowFullResponse] = React.useState(false);

  // Auto-advance to the next stage as content becomes available during streaming
  React.useEffect(() => {
    const wasStreaming = wasStreamingRef.current;
    wasStreamingRef.current = isStreaming;

    // When streaming just completed (was streaming, now not), advance to final stage
    if (wasStreaming && !isStreaming && hasStage3) {
      setActiveStage("stage3");
      return;
    }

    // Only auto-advance during active streaming
    if (!isStreaming) {
      return;
    }

    // During streaming, advance as stages complete
    if (stage2Loading && hasStage1 && activeStage === "stage1") {
      // Stage 1 just completed, move to stage 2
      setActiveStage("stage2");
    } else if (stage3Loading && hasStage2 && activeStage === "stage2") {
      // Stage 2 just completed, move to stage 3
      setActiveStage("stage3");
    }
  }, [hasStage1, hasStage2, hasStage3, stage1Loading, stage2Loading, stage3Loading, isStreaming, activeStage]);

  if (isUser) {
    return (
      <motion.div
        className="flex justify-end mb-4"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start gap-3 max-w-[80%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2">
            <p className="text-sm whitespace-pre-wrap">
              {"content" in message ? message.content : ""}
            </p>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </motion.div>
    );
  }

  // Assistant message with stages
  return (
    <motion.div
      className="flex mb-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start gap-3 w-full max-w-[95%]">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {/* Copy/Download buttons for final synthesis */}
          {!isUser && hasStage3 && conversationId && (
            <div className="flex gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  if (message.stage3?.response) {
                    await navigator.clipboard.writeText(message.stage3.response);
                    // Optional: show toast
                  }
                }}
                className="flex items-center gap-2 h-9"
              >
                <Copy className="h-4 w-4" />
                Copy Final
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const conv: Conversation = await api.getConversation(conversationId);
                    const blob = new Blob([JSON.stringify(conv, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${conv.title || 'conversation'}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Download failed', err);
                  }
                }}
                className="flex items-center gap-2 h-9"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
            </div>
          )}

          {/* Progress Bar and Status Text */}
          {!isUser && isStreaming && (
            <div className="mb-6 space-y-3">
              {/* Council Spinner and Progress */}
              <div className="flex items-center gap-4">
                <CouncilSpinner size={48} />
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-2 rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${smoothProgress}%` }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(smoothProgress)}%</span>
                    <motion.span
                      key={getStatusText()}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                    >
                      {getStatusText()}
                    </motion.span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage Progress Indicator */}
          <div className="flex items-center gap-2 mb-3">
            <StageIndicator
              stage={1}
              label="Responses"
              isComplete={hasStage1 && !stage1Loading}
              isLoading={stage1Loading}
              isActive={activeStage === "stage1"}
              onClick={() => setActiveStage("stage1")}
            />
            <div className="h-px w-4 bg-border" />
            <StageIndicator
              stage={2}
              label="Rankings"
              isComplete={hasStage2 && !stage2Loading}
              isLoading={stage2Loading}
              isActive={activeStage === "stage2"}
              isDisabled={!hasStage2 && !stage2Loading}
              onClick={() => setActiveStage("stage2")}
            />
            <div className="h-px w-4 bg-border" />
            <StageIndicator
              stage={3}
              label="Final"
              isComplete={hasStage3 && !stage3Loading}
              isLoading={stage3Loading}
              isActive={activeStage === "stage3"}
              isDisabled={!hasStage3 && !stage3Loading}
              onClick={() => setActiveStage("stage3")}
            />
          </div>

          {/* Stage Content */}
          <AnimatePresence mode="wait">
            {activeStage === "stage1" && (
              <motion.div
                key="stage1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Stage1Panel
                  results={"stage1" in message ? message.stage1 || [] : []}
                  isLoading={stage1Loading}
                />
              </motion.div>
            )}
            {activeStage === "stage2" && (
              <motion.div
                key="stage2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Stage2Panel
                  results={"stage2" in message ? message.stage2 || [] : []}
                  metadata={metadata}
                  isLoading={stage2Loading}
                />
              </motion.div>
            )}
            {activeStage === "stage3" && (
              <motion.div
                key="stage3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Stage3Panel
                  result={"stage3" in message ? message.stage3 : undefined}
                  isLoading={stage3Loading}
                  isNewResponse={isNewResponse}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

interface StageIndicatorProps {
  stage: number;
  label: string;
  isComplete?: boolean;
  isLoading?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
}

function StageIndicator({
  stage,
  label,
  isComplete,
  isLoading,
  isActive,
  isDisabled,
  onClick,
}: StageIndicatorProps) {
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
        isDisabled
          ? "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
          : isActive
          ? "bg-primary text-primary-foreground"
          : isComplete
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full ${
          isActive
            ? "bg-primary-foreground/20"
            : isComplete
            ? "bg-primary/20"
            : "bg-muted-foreground/20"
        }`}
      >
        {isLoading ? (
          <motion.div
            className="h-2 w-2 rounded-full bg-current"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        ) : isComplete ? (
          <Check className="h-3 w-3" />
        ) : (
          <span className="text-xs">{stage}</span>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
