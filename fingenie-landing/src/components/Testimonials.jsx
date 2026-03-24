import { useEffect, useRef } from "react";
import gsap from "gsap";

const testimonials = [
  {
    quote: "FinGenie's AI advisor helped me find $400/month in unnecessary spending I didn't even know about. Game changer.",
    name: "Sarah M.",
    role: "Entrepreneur",
    initials: "SM",
    color: "purple",
  },
  {
    quote: "The gamification makes saving actually fun. My kids and I compete on streaks and achievements. Saved $10K in 6 months!",
    name: "James K.",
    role: "Software Developer",
    initials: "JK",
    color: "gold",
  },
  {
    quote: "I've tried every finance app out there. FinGenie is the only one I stuck with — the pet system is surprisingly motivating.",
    name: "Emily R.",
    role: "Teacher",
    initials: "ER",
    color: "emerald",
  },
];

export default function Testimonials({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".testimonials .section-label", { opacity: 0, y: 20 });
      gsap.set(".testimonials .section-title", { opacity: 0, y: 30 });
      gsap.set(".testimonials .section-subtitle", { opacity: 0, y: 20 });
      gsap.set(".testimonial-card", { opacity: 0, y: 40, scale: 0.96 });
    }, ref);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to(".testimonials .section-label", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" })
        .to(".testimonials .section-title", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(".testimonials .section-subtitle", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.3")
        .to(".testimonial-card", {
          opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.15, ease: "power3.out",
        }, "-=0.2");
    }, ref);
    return () => ctx.revert();
  }, [active]);

  return (
    <div className="testimonials" ref={ref}>
      <span className="section-label">Testimonials</span>
      <h2 className="section-title">
        Loved by{" "}
        <span className="gradient-text-emerald">Thousands</span>
      </h2>
      <p className="section-subtitle">
        See what our users say about their journey with FinGenie.
      </p>

      <div className="testimonial-grid">
        {testimonials.map((t, i) => (
          <div key={i} className="glass-card testimonial-card">
            <div className="testimonial-stars">
              {Array.from({ length: 5 }).map((_, j) => (
                <span key={j} className="testimonial-star">★</span>
              ))}
            </div>
            <p className="testimonial-quote">"{t.quote}"</p>
            <div className="testimonial-author">
              <div className={`testimonial-avatar ${t.color}`}>
                {t.initials}
              </div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
