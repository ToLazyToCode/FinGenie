import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CTA({ active }) {
  const ctaRef = useRef(null);
  const pulseTween = useRef(null);

  /* 1️⃣ SET trạng thái ban đầu */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".cta h2", { opacity: 0, y: 30 });
      gsap.set(".cta .subtitle", { opacity: 0, y: 20 });
      gsap.set(".cta-buttons button", { opacity: 0, y: 20 });
      gsap.set(".cta-note", { opacity: 0 });
    }, ctaRef);

    return () => ctx.revert();
  }, []);

  /* 2️⃣ PLAY animation khi active */
  useEffect(() => {
    if (!active) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.to(".cta h2", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out"
      })
        .to(
          ".cta .subtitle",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out"
          },
          "-=0.4"
        )
        .to(
          ".cta-buttons button",
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.15,
            ease: "power3.out"
          },
          "-=0.2"
        )
        .to(
          ".cta-note",
          {
            opacity: 0.7,
            duration: 0.4,
            ease: "power2.out"
          },
          "-=0.2"
        );

      /* 3️⃣ Pulse nhẹ cho nút chính */
      pulseTween.current = gsap.to(
        ".cta-buttons .primary",
        {
          boxShadow: "0 0 20px rgba(168,85,247,0.6)",
          repeat: -1,
          yoyo: true,
          duration: 1.8,
          ease: "power1.inOut",
          delay: 0.6
        }
      );
    }, ctaRef);

    return () => {
      ctx.revert();
      pulseTween.current?.kill();
    };
  }, [active]);

  return (
    <div className="cta" ref={ctaRef}>
      <h2>
        Start Your <span className="gradient-text">Savings</span> Journey Today
      </h2>

      <p className="subtitle">
        Join over 100,000 users who have already made their financial
        wishes come true with FinGenie.
      </p>

      <div className="cta-buttons">
        <button className="primary">
          ⬇ Get FinGenie Free
        </button>
        <button className="secondary">
          Learn More
        </button>
      </div>

      <p className="cta-note">
        No credit card required • Free to use • Cancel anytime
      </p>
    </div>
  );
}
