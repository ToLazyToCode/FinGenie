import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Hero({ active = true }) {
  const heroRef = useRef(null);
  const starsRef = useRef(null);

  /* ================= HERO TEXT ANIMATION ================= */
  useEffect(() => {
    if (!heroRef.current) return;

    const items = heroRef.current.querySelectorAll(".hero-animate");

    gsap.set(items, { opacity: 0, y: 40 });

    if (active) {
      gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.15
      });
    }
  }, [active]);

  /* ================= STAR BACKGROUND ================= */
  useEffect(() => {
    if (!starsRef.current) return;

    const stars = starsRef.current.querySelectorAll(".star");

    stars.forEach((star) => {
      // random vị trí
      gsap.set(star, {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        opacity: Math.random(),
        scale: Math.random() * 1.2 + 0.3
      });

      // animation chớp chớp
      gsap.to(star, {
        opacity: Math.random() * 0.8 + 0.2,
        duration: Math.random() * 2 + 1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    });
  }, []);

  return (
    <div className="hero hero-with-stars" ref={heroRef}>
      {/* ⭐ STAR BACKGROUND */}
      <div className="stars" ref={starsRef}>
        {Array.from({ length: 80 }).map((_, i) => (
          <span key={i} className="star" />
        ))}
      </div>

      {/* Badge */}
      <span className="hero-badge hero-animate">
        ✨ Your Financial Genie
      </span>

      {/* Title */}
      <h1 className="hero-title hero-animate">
        <span className="gradient-text">FinGenie</span>
      </h1>

      {/* Subtitle */}
      <p className="hero-subtitle hero-animate">
        Make your savings wishes come true. Set goals, track progress,
        and watch your money grow like magic.
      </p>

      {/* Buttons */}
      <div className="hero-buttons hero-animate">
        <button className="primary">⬇ Download for iOS</button>
        <button className="secondary">Download for Android</button>
      </div>

      {/* Stats */}
      <div className="hero-stats hero-animate">
        <div>
          <strong>100K+</strong>
          <span>Active Users</span>
        </div>
        <div>
          <strong>4.9★</strong>
          <span>App Rating</span>
        </div>
        <div>
          <strong>$50M+</strong>
          <span>Goals Achieved</span>
        </div>
      </div>
    </div>
  );
}
