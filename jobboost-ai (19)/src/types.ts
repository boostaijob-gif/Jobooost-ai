export interface MatchAnalysis {
  skillsScore: number;
  experienceScore: number;
  seniorityScore: number;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  seniority: string;
  industry: string;
  jobType: string;
  datePosted: string;
  sourceSite: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
  };
  technologies: string[];
  matchScore: number;
  matchDetails: string[];
  missingSkills: string[];
  matchAnalysis: MatchAnalysis;
}

export interface InterviewQuestion {
  question: string;
  reason: string;
}

export interface UserFeedback {
  id?: string;
  userId: string | null;
  email: string | null;
  message: string;
  type: 'suggestion' | 'issue' | 'other';
  createdAt: any;
}

export interface GrowthStep {
  phase: string;
  actions: string[];
  expectedImpact: string;
}

export interface AlignmentData {
  roleTitle: string;
  refinedResume: string;
  differentiators: string[];
  marketOpportunities: JobOpportunity[];
  guidelines: string[];
  questions: InterviewQuestion[];
  extractedSkills: string[];
  growthRoadmap?: GrowthStep[];
  isFallback?: boolean;
  fallbackReason?: "quota" | "general";
}
