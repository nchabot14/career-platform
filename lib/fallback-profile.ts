import type { PublicProfilePage } from "@/lib/services/public-profile";

// What the homepage shows when the database can't be reached: the profile
// and education, copied from the published content, and nothing that could
// pass for real project data. Update it when the profile or education
// changes in /admin.
const since = new Date("2026-10-26T00:00:00Z");
const published = { publicationState: "published", createdAt: since, updatedAt: since } as const;

export const fallbackProfilePage: PublicProfilePage = {
  profile: {
    id: "fallback-profile",
    name: "Nicholas Chabot",
    headline: "Information Systems & Business Analytics student at Loyola Marymount University",
    summary:
      "Information Systems & Business Analytics student at Loyola Marymount University with strong analytical and teamwork skills. Serving as the Vice President for LMU Men’s Club Volleyball student organization. Seeking an entry level position in business strategy or analysis to expand upon real-world skills in data-focused decision making and problem solving.",
    location: "Los Angeles, CA",
    availability: "Seeking an entry-level position in business strategy or analysis",
    visibility: "public",
    ...published,
  },
  education: [
    {
      id: "fallback-education-lmu",
      institution: "Loyola Marymount University",
      credential: "Bachelor's degree, expected May 2027 · 3.7 GPA",
      fieldOfStudy: "Business Analytics and Information Systems",
      startDate: null,
      endDate: null,
      sortOrder: 0,
      ...published,
    },
    {
      id: "fallback-education-sphs",
      institution: "South Pasadena High School",
      credential: "High school diploma, Class of 2023",
      fieldOfStudy: null,
      startDate: null,
      endDate: null,
      sortOrder: 1,
      ...published,
    },
  ],
  experience: [],
  skills: [],
  socialLinks: [],
  projects: [],
  resume: null,
};
