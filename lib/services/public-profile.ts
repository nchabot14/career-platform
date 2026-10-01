import {
  getCurrentPublishedResume,
  getPublishedProfile,
  listPublishedEducation,
  listPublishedExperience,
  listPublishedProjects,
  listPublishedSkills,
  listPublishedSocialLinks,
} from "@/lib/db/repositories/public-content";
import type {
  Education,
  Experience,
  Profile,
  Project,
  Skill,
  SocialLink,
} from "@/lib/db/schema";

export type PublicProfilePage = {
  profile: Profile | null;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  socialLinks: SocialLink[];
  projects: Project[];
  resume: { filename: string } | null;
};

export function resumeDownloadFilename(name?: string | null) {
  const slug = (name ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `${slug}-resume.pdf` : "resume.pdf";
}

export async function getPublicProfilePage(): Promise<PublicProfilePage> {
  const [profile, experience, education, skills, socialLinks, projects, resume] =
    await Promise.all([
      getPublishedProfile(),
      listPublishedExperience(),
      listPublishedEducation(),
      listPublishedSkills(),
      listPublishedSocialLinks(),
      listPublishedProjects(),
      getCurrentPublishedResume(),
    ]);

  return {
    profile: profile ?? null,
    experience,
    education,
    skills,
    socialLinks,
    projects,
    resume: resume ? { filename: resumeDownloadFilename(profile?.name) } : null,
  };
}
