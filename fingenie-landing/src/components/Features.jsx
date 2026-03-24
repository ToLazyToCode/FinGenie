import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Features({ active }) {
  const featuresRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1️⃣ SET trạng thái ban đầu (ẨN HOÀN TOÀN)
      gsap.set(".features h2", { opacity: 0, y: 30 });
      gsap.set(".features .subtitle", { opacity: 0, y: 20 });
      gsap.set(".feature-grid .card", { opacity: 0, y: 40 });
      gsap.set(".feature-grid .icon-circle", { scale: 0 });
    }, featuresRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!active) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // 2️⃣ PLAY animation theo thứ tự
      tl.to(".features h2", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out"
      })
        .to(
          ".features .subtitle",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out"
          },
          "-=0.4"
        )
        .to(
          ".feature-grid .card",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: "power3.out"
          },
          "-=0.2"
        )
        .to(
          ".feature-grid .icon-circle",
          {
            scale: 1,
            duration: 0.4,
            stagger: 0.15,
            ease: "back.out(1.7)"
          },
          "-=0.6"
        );
    }, featuresRef);

    return () => ctx.revert();
  }, [active]);

  return (
    <div className="features" ref={featuresRef}>
      <h2>
        <span className="gradient-text">Savings Goals</span> Made Simple
      </h2>

      <p className="subtitle">
        Everything you need to turn your financial dreams into reality,
        all in one magical app.
      </p>

      <div className="feature-grid">
        <div className="card">
          <div className="icon-circle">🎯</div>
          <h3>Set Custom Goals</h3>
          <p>
            Create personalized savings goals for anything—vacation,
            emergency fund, new car, or dream home.
          </p>
        </div>

        <div className="card">
          <div className="icon-circle">📈</div>
          <h3>Track Your Progress</h3>
          <p>
            Beautiful visualizations show exactly how close you are
            to reaching each goal.
          </p>
        </div>

        <div className="card">
          <div className="icon-circle">🤖</div>
          <h3>Smart Auto-Save</h3>
          <p>
            Set up automatic contributions that work around your
            spending habits.
          </p>
        </div>

        <div className="card">
          <div className="icon-circle">🎉</div>
          <h3>Milestone Celebrations</h3>
          <p>
            Get notified when you hit milestones and stay motivated
            on your journey.
          </p>
        </div>
      </div>
    </div>
  );
}
