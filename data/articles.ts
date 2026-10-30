// data/articles.ts

export type ContentBlock = 
  | { type: "paragraph"; text: string }
  | { type: "do-this"; text: string }
  | { type: "bp-reading"; systolic: number; diastolic: number };

export interface Article {
  slug: string;
  title: string;
  answerBox: string; // The first two sentences
  redFlagBox: string;
  author: string;
  reviewerName: string;
  reviewerLicense: string;
  publishedAt: string;
  lastReviewedAt: string;
  region: string;
  content: ContentBlock[];
}

export const articles: Article[] = [
  {
    slug: "how-to-measure-blood-pressure",
    title: "How to measure your blood pressure at home (and actually get it right)",
    answerBox: "A single clinic reading is a snapshot. A home monitor is the movie. Here is the exact protocol to get a reliable baseline.",
    redFlagBox: "If your blood pressure is above 180/120, rest for 5 minutes and test again. If it is still that high, seek immediate medical attention.",
    author: "Tunmise Bajo",
    reviewerName: "Dr. A. O. Adeyemi",
    reviewerLicense: "MDCN/R/12345",
    publishedAt: "2026-10-20",
    lastReviewedAt: "2026-10-25",
    region: "Global",
    content: [
      {
        type: "paragraph",
        text: "Healthcare often happens in isolated moments—a consultation, a test result, a follow-up. But your health is happening every single day. Between appointments, you are left to make sense of new symptoms, confusing readings, and daily habits."
      },
      {
        type: "do-this",
        text: "Before you measure, sit quietly for 5 minutes. Do not talk. Keep your back supported and your feet flat on the floor."
      },
      {
        type: "paragraph",
        text: "Place the cuff on your bare upper arm, not over a sleeve. The middle of the cuff should be at the level of your heart."
      },
      {
        type: "bp-reading",
        systolic: 120,
        diastolic: 80
      },
      {
        type: "paragraph",
        text: "Take two readings, one minute apart, and record the average. This helps eliminate the noise of a single, anxious reading."
      }
    ]
  }
];