import { useEffect, useRef, useState } from "react";

const stats = [
  {
    value: 43,
    suffix: "%",
    label: "of job postings are ghost jobs",
    source: "Resume Builder Survey, 2024",
    sourceUrl: "https://www.resumebuilder.com/3-in-10-companies-currently-have-fake-job-listings/",
  },
  {
    value: 737,
    prefix: "$",
    suffix: " million+",
    label: "lost to fake job offers in the US since 2019",
    source: "FTC & BBB Reports",
    sourceUrl: "https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2024/03/job-employment-agency-scams",
  },
  {
    value: 11,
    suffix: " hrs/wk",
    label: "wasted on fake listings per job seeker",
    source: "Industry Research, 2025",
    sourceUrl: "https://www.aihr.com/hr-glossary/ghost-jobs/",
  },
  {
    value: 40,
    suffix: "%",
    label: "of reposted roles never result in a hire",
    source: "Built In / Freshteam Data",
    sourceUrl: "https://builtin.com/articles/ghost-jobs",
  },
];

const AnimatedNumber = ({ target, suffix, prefix = "" }: { target: number; suffix: string; prefix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const steps = 60;
          const stepTime = duration / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += Math.ceil(target / steps);
            if (current >= target) {
              setCount(target);
              clearInterval(interval);
            } else {
              setCount(current);
            }
          }, stepTime);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, hasAnimated]);

  return (
    <div ref={ref} className="text-3xl md:text-6xl font-extrabold text-foreground">
      {prefix}{count.toLocaleString()}{suffix}
    </div>
  );
};

const SocialProofSection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            The Ghost Job Problem Is Real
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Companies post ghost jobs to build talent pipelines, appease investors, and hit recruiter KPIs — while job seekers waste time on positions that were never meant to be filled.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-10 max-w-5xl mx-auto text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <AnimatedNumber target={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              <p className="text-muted-foreground font-medium text-sm">{stat.label}</p>
              <p className="text-xs text-muted-foreground/60">
                <a
                  href={stat.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline transition-colors"
                >
                  Source: {stat.source}
                </a>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;