import { useEffect, useRef } from "react";
import gsap from "gsap";

const steps = [
  {
    num: "01",
    title: "Download & Sign Up",
    desc: "Get FinGenie from the App Store or Google Play. Create your account in under 60 seconds.",
  },
  {
    num: "02",
    title: "Set Your Goals",
    desc: "Tell your genie what you're saving for. Vacation, emergency fund, new car — anything goes.",
  },
  {
    num: "03",
    title: "Watch the Magic",
    desc: "AI analyzes your habits, suggests optimizations, and gamifies your journey to keep you on track.",
  },
];

export default function HowItWorks({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".how .section-label", { opacity: 0, y: 20 });
      gsap.set(".how .section-title", { opacity: 0, y: 30 });
      gsap.set(".how .section-subtitle", { opacity: 0, y: 20 });
      gsap.set(".step", { opacity: 0, y: 40 });
      gsap.set(".step-number", { scale: 0 });
    }, ref);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.to(".how .section-label", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" })
        .to(".how .section-title", { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, "-=0.3")
        .to(".how .section-subtitle", { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "-=0.3")
        .to(".step-number", { scale: 1, duration: 0.5, stagger: 0.2, ease: "back.out(1.7)" }, "-=0.1")
        .to(".step", { opacity: 1, y: 0, duration: 0.5, stagger: 0.2, ease: "power3.out" }, "-=0.6");
    }, ref);
    return () => ctx.revert();
  }, [active]);

  return (
    <div className="how" ref={ref}>
      <span className="section-label">How It Works</span>
      <h2 className="section-title">
        Get Started in{" "}
        <span className="gradient-text-gold">Three Steps</span>
      </h2>
      <p className="section-subtitle">
        From download to your first savings goal in under 5 minutes.
        No complexity, just magic.
      </p>

      <div className="steps">
        {steps.map((s, i) => (
          <div key={i} className="step">
            <div className="step-number">
              <div className="step-number-inner">
                <span>{s.num}</span>
              </div>
            </div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
