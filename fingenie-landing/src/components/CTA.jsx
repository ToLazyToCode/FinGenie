import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CTA({ active }) {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".cta", { opacity: 0, scale: 0.96 });
    }, ref);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active) return;
    const ctx = gsap.context(() => {
      gsap.to(".cta", {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: "power3.out",
      });
    }, ref);
    return () => ctx.revert();
  }, [active]);

  return (
    <div className="cta-wrapper" ref={ref}>
      <div className="cta">
        <h2 className="cta-title">
          Ready to Transform{" "}
          <span className="gradient-text">Your Finances</span>?
        </h2>
        <p className="cta-subtitle">
          Join over 100,000 users who turned their financial wishes into
          reality. Start your journey today — it's free.
        </p>
        <div className="cta-buttons">
          <button className="btn btn-gold">
            ⬇ Download Free
          </button>
          <button className="btn btn-secondary">
            Learn More
          </button>
        </div>
        <p className="cta-note">
          No credit card required · Free to use · Cancel anytime
        </p>
      </div>
    </div>
  );
}
