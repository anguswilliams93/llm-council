"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquarePlus, Brain, FlaskConical, Pencil, HelpCircle, Zap, Pi } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/message-bubble";
import { ChatInput } from "@/components/chat-input";
import { Button } from "@/components/ui/button";
import * as api from "@/lib/api";
import type { Message, CouncilMetadata, Conversation } from "@/lib/types";

// Suggested questions organized by category
const SUGGESTED_QUESTIONS = [
	{
		category: "Complex Reasoning",
		icon: Brain,
		color: "text-purple-600",
		bgColor: "bg-purple-100",
		questions: [
			"What are the most likely unintended consequences of universal basic income, and how might they be mitigated?",
			"Should AI systems be granted legal personhood? Argue both sides.",
			"What's the optimal strategy for a small country to maximize prosperity in the next 50 years?",
		],
	},
	{
		category: "Technical & Scientific",
		icon: FlaskConical,
		color: "text-blue-600",
		bgColor: "bg-blue-100",
		questions: [
			"Explain quantum entanglement to someone who understands classical physics but not quantum mechanics.",
			"What are the strongest arguments for and against nuclear power as a climate solution?",
			"Compare the architectural trade-offs between microservices and monoliths for a startup with 10 engineers.",
		],
	},
	{
		category: "Creative & Subjective",
		icon: Pencil,
		color: "text-green-600",
		bgColor: "bg-green-100",
		questions: [
			"Write a haiku about the feeling of debugging code at 3am.",
			"What makes a great leader? Synthesize historical examples with modern research.",
			"Design an ideal education system for the 21st century.",
		],
	},
  {
    category: "Philosophical & Ethical",
    icon: HelpCircle,
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    questions: [
      "Is it ethical to create sentient AI? What safeguards would be necessary?",
      "How should humanity prioritize existential risks: climate change, AI, pandemics, or nuclear war?",
      "What is consciousness, and could a sufficiently advanced AI possess it?",
    ],
  },
  {
    category: "Practical & Problem Solving",
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    questions: [
      "How can I reduce my monthly grocery bill by 30% without sacrificing nutrition?",
      "Step-by-step guide to clean and optimize my laptop for better performance.",
      "What's the most efficient way to negotiate a salary raise or job offer?",
    ],
  },
  {
    category: "Mathematics",
    icon: Pi,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    questions: [
      "Solve the bat-and-ball puzzle: A bat and ball cost $1.10 total. The bat costs $1 more than the ball. How much does the ball cost?",
      "Explain the Monty Hall problem and why switching doors is the optimal strategy.",
      "Prove there are infinitely many prime numbers using Euclid's elegant argument.",
    ],
  },
];interface ChatPanelProps {
	messages: Message[];
	metadata?: CouncilMetadata;
	onSendMessage: (content: string) => void;
	isLoading?: boolean;
	stage1Loading?: boolean;
	stage2Loading?: boolean;
	stage3Loading?: boolean;
	hasActiveConversation: boolean;
	conversationId?: string;
}

export function ChatPanel({
	messages,
	metadata,
	onSendMessage,
	isLoading,
	stage1Loading,
	stage2Loading,
	stage3Loading,
	hasActiveConversation,
	conversationId,
}: ChatPanelProps) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const bottomRef = React.useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom on new messages
	React.useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, stage1Loading, stage2Loading, stage3Loading]);

	if (!hasActiveConversation) {
		return (
			<div className="flex flex-col h-full">
				<ScrollArea className="flex-1">
					<div className="flex flex-col items-center justify-center min-h-full p-8">
						<motion.div
							className="text-center space-y-4 max-w-md mb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
						>
							<motion.div
								className="flex justify-center"
								animate={{ scale: [1, 1.05, 1] }}
								transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
							>
								<div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
									<MessageSquarePlus className="h-8 w-8 text-primary" />
								</div>
							</motion.div>
							<h2 className="text-2xl font-semibold">Welcome to parLLMent</h2>
							<p className="text-muted-foreground">
								A deliberation system where multiple LLMs collaboratively answer
								your questions through anonymized peer review.
							</p>
							<div className="flex flex-col gap-2 text-sm text-muted-foreground">
								<div className="flex items-center gap-2 justify-center">
									<span className="h-6 w-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
										1
									</span>
									<span>Multiple models respond independently</span>
								</div>
								<div className="flex items-center gap-2 justify-center">
									<span className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-medium">
										2
									</span>
									<span>Each model ranks all responses anonymously</span>
								</div>
								<div className="flex items-center gap-2 justify-center">
									<span className="h-6 w-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-medium">
										3
									</span>
									<span>Final answer is synthesized from the best responses</span>
								</div>
							</div>
						</motion.div>

						{/* Suggested Questions */}
						<motion.div
							className="w-full max-w-4xl space-y-6"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0.2 }}
						>
							<h3 className="text-sm font-medium text-muted-foreground text-center">
								Try one of these questions to see the council in action
							</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{SUGGESTED_QUESTIONS.map((category, categoryIndex) => (
									<motion.div
										key={category.category}
										className="space-y-3"
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.4, delay: 0.3 + categoryIndex * 0.1 }}
									>
										<div className="flex items-center gap-2">
											<div className={`h-6 w-6 rounded-md ${category.bgColor} flex items-center justify-center`}>
												<category.icon className={`h-3.5 w-3.5 ${category.color}`} />
											</div>
											<span className="text-sm font-medium">{category.category}</span>
										</div>
										<div className="space-y-2">
											{category.questions.map((question, questionIndex) => (
												<motion.div
													key={questionIndex}
													initial={{ opacity: 0, x: -10 }}
													animate={{ opacity: 1, x: 0 }}
													transition={{ duration: 0.3, delay: 0.4 + categoryIndex * 0.1 + questionIndex * 0.05 }}
												>
													<Button
														variant="outline"
														className="w-full h-auto p-3 text-left text-sm font-normal whitespace-normal hover:bg-muted/50 transition-colors"
														onClick={() => onSendMessage(question)}
														disabled={isLoading}
													>
														<span className="line-clamp-2">{question}</span>
													</Button>
												</motion.div>
											))}
										</div>
									</motion.div>
								))}
							</div>
						</motion.div>
					</div>
				</ScrollArea>
				<ChatInput
					onSubmit={onSendMessage}
					isLoading={isLoading}
					placeholder="Or type your own question..."
				/>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<ScrollArea className="flex-1 px-4" ref={scrollRef}>
				<div className="py-4 space-y-4 max-w-4xl mx-auto">
					<AnimatePresence mode="popLayout">
						{messages.map((message, index) => {
							const isLastAssistant =
								message.role === "assistant" &&
								index === messages.length - 1;
							return (
								<MessageBubble
									key={`${message.timestamp}-${index}`}
									message={message}
									metadata={metadata}
									stage1Loading={isLastAssistant ? stage1Loading : false}
									stage2Loading={isLastAssistant ? stage2Loading : false}
									stage3Loading={isLastAssistant ? stage3Loading : false}
									conversationId={conversationId}
								/>
							);
						})}
					</AnimatePresence>
					<div ref={bottomRef} />
				</div>
			</ScrollArea>
			<ChatInput onSubmit={onSendMessage} isLoading={isLoading} />
		</div>
	);
}
