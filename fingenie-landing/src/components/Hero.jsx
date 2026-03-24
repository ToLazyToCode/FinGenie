import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Hero({ active = true }) {
  const heroRef = useRef(null);
  const starsRef = useRef(null);

  /* Text entrance animation */
  useEffect(() => {
    if (!heroRef.current) return;
    const items = heroRef.current.querySelectorAll(".hero-animate");
    gsap.set(items, { opacity: 0, y: 30 });

    if (active) {
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
      });
    }
  }, [active]);

  /* Star particles */
  useEffect(() => {
    if (!starsRef.current) return;

    const ctx = gsap.context(() => {
      const stars = starsRef.current.querySelectorAll(".star");
      stars.forEach((star) => {
        gsap.set(star, {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          opacity: Math.random() * 0.5 + 0.1,
          scale: Math.random() * 1.5 + 0.3,
        });
        gsap.to(star, {
          opacity: Math.random() * 0.6 + 0.1,
          duration: Math.random() * 3 + 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    }, starsRef);

    return () => ctx.revert();
  }, []);

  /* Floating orbs animation */
  useEffect(() => {
    if (!heroRef.current) return;
    const orbs = heroRef.current.querySelectorAll(".hero-orb");

    const ctx = gsap.context(() => {
      orbs.forEach((orb, i) => {
        gsap.to(orb, {
          y: `${(i % 2 === 0 ? -1 : 1) * (20 + i * 5)}`,
          x: `${(i % 2 === 0 ? 1 : -1) * 10}`,
          duration: 4 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <div className="hero" ref={heroRef}>
      {/* Background orbs */}
      <div className="hero-bg">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
      </div>

      {/* Star particles */}
      <div className="hero-stars" ref={starsRef}>
        {Array.from({ length: 60 }).map((_, i) => (
          <span key={i} className="star" />
        ))}
      </div>

      {/* Content */}
      <div className="hero-content">
        <span className="hero-badge hero-animate">
          ✨ AI-Powered Finance
        </span>

        <h1 className="hero-title hero-animate">
          Your Money,{" "}
          <span className="gradient-text">Your Genie</span>
        </h1>

        <p className="hero-subtitle hero-animate">
          Track spending, set savings goals, and grow your wealth with
          AI-powered insights and gamification that makes finance fun.
        </p>

        <div className="hero-buttons hero-animate">
          <button className="btn btn-primary">
            Get Started Free
          </button>
          <button className="btn btn-secondary">
            See How It Works →
          </button>
        </div>

        <div className="hero-stats hero-animate">
          <div className="hero-stat">
            <span className="hero-stat-value">100K+</span>
            <span className="hero-stat-label">Active Users</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">4.9★</span>
            <span className="hero-stat-label">App Rating</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-value">$50M+</span>
            <span className="hero-stat-label">Goals Achieved</span>
          </div>
        </div>
      </div>
    </div>
  );
}
