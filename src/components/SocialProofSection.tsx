import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 43, suffix: "%", label: "of job postings are ghost jobs", source: "Resume Builder 2024" },
  { value: 10, suffix: "+", label: "hours saved per week", source: "Average user report" },
  { value: 15000, suffix: "+", label: "fake listings detected", source: "GhostJob data" },
];

const AnimatedNumber = ({ target, suffix }: { target: number; suffix: string }) => {
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
    <div ref={ref} className="text-5xl md:text-6xl font-extrabold text-foreground">
      {count.toLocaleString()}{suffix}
    </div>
  );
};

const SocialProofSection = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-10 max-w-4xl mx-auto text-center">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-2">
              <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              <p className="text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-xs text-muted-foreground/60">{stat.source}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
