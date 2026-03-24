import { useEffect, useRef } from "react";
import gsap from "gsap";

const features = [
  {
    icon: "🤖",
    color: "purple",
    title: "AI Financial Advisor",
    desc: "Get personalized money advice powered by AI. Ask anything about your spending, savings, and investment habits.",
  },
  {
    icon: "🎮",
    color: "gold",
    title: "Gamified Savings",
    desc: "Earn XP, level up, unlock achievements, and care for your virtual pet as you build better financial habits.",
  },
  {
    icon: "📊",
    color: "emerald",
    title: "Smart Analytics",
    desc: "Beautiful dashboards that break down your spending by category, track trends, and reveal insights.",
  },
  {
    icon: "🎯",
    color: "pink",
    title: "Goal Tracking",
    desc: "Set savings goals for anything — vacation, emergency fund, or dream purchase — and track every step.",
  },
  {
    icon: "💳",
    color: "cyan",
    title: "Multi-Wallet",
    desc: "Manage multiple wallets and accounts in one place. See your complete financial picture at a glance.",
  },
  {
    icon: "🔒",
    color: "purple",
    title: "Bank-Grade Security",
    desc: "Your data is encrypted with hardware-backed security on mobile and industry-standard protocols.",
  },
];

export default function Features({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".section-label", { opacity: 0, y: 20 });
      gsap.set(".section-title", { opacity: 0, y: 30 });
      gsap.set(".section-subtitle", { opacity: 0, y: 20 });
      gsap.set(".feature-card", { opacity: 0, y: 40 });
    }, ref);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to(".section-label", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" })
        .to(".section-title", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(".section-subtitle", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.3")
        .to(".feature-card", {
          opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out",
        }, "-=0.2");
    }, ref);
    return () => ctx.revert();
  }, [active]);

  return (
    <div className="features" ref={ref}>
      <span className="section-label">Features</span>
      <h2 className="section-title">
        Everything You Need to{" "}
        <span className="gradient-text">Master Your Money</span>
      </h2>
      <p className="section-subtitle">
        Powerful tools wrapped in a delightful experience. Finance
        management that actually feels good.
      </p>

      <div className="feature-grid">
        {features.map((f, i) => (
          <div key={i} className="glass-card feature-card">
            <div className={`feature-icon ${f.color}`}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
