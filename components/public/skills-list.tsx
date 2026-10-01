import type { Skill } from "@/lib/db/schema";

type SkillsListProps = Readonly<{ items: Skill[] }>;

export function SkillsList({ items }: SkillsListProps) {
  const categories = new Map<string, Skill[]>();

  for (const skill of items) {
    categories.set(skill.category, [...(categories.get(skill.category) ?? []), skill]);
  }

  return (
    <dl className="grid gap-5 sm:grid-cols-2">
      {[...categories].map(([category, skills]) => (
        <div key={category}>
          <dt className="font-semibold text-slate-950">{category}</dt>
          {skills.map((skill) => (
            <dd key={skill.id} className="text-slate-700">
              {skill.name}
              {skill.proficiencyOrContext ? (
                <span className="text-slate-500"> ({skill.proficiencyOrContext})</span>
              ) : null}
              {skill.certificationDetails ? (
                <span className="block text-sm text-slate-500">{skill.certificationDetails}</span>
              ) : null}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}
