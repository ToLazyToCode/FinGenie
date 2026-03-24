import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function HowItWorks({ active }) {
  const howRef = useRef(null);

  /* 1️⃣ SET trạng thái ban đầu – KHÔNG cho hiện trước */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".how h2", { opacity: 0, y: 30 });
      gsap.set(".how .subtitle", { opacity: 0, y: 20 });

      gsap.set(".timeline::before", { scaleX: 0 }); // fallback nếu dùng pseudo
      gsap.set(".step", { opacity: 0, y: 40 });
      gsap.set(".step-icon", { scale: 0 });
    }, howRef);

    return () => ctx.revert();
  }, []);

  /* 2️⃣ PLAY animation khi active */
  useEffect(() => {
    if (!active) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.to(".how h2", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out"
      })
        .to(
          ".how .subtitle",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out"
          },
          "-=0.4"
        )
        .fromTo(
          ".timeline::before",
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: "left center",
            duration: 0.8,
            ease: "power2.out"
          },
          "-=0.2"
        )
        .to(
          ".step",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.25,
            ease: "power3.out"
          },
          "-=0.4"
        )
        .to(
          ".step-icon",
          {
            scale: 1,
            duration: 0.4,
            stagger: 0.25,
            ease: "back.out(1.8)"
          },
          "-=0.8"
        );
    }, howRef);

    return () => ctx.revert();
  }, [active]);

  return (
    <div className="how" ref={howRef}>
      <h2>
        How <span className="gradient-text">FinGenie</span> Works
      </h2>

      <p className="subtitle">
        Three simple steps to financial freedom
      </p>

      <div className="timeline">
        <div className="step">
          <div className="step-icon">✨</div>
          <span className="step-tag">Step 01</span>
          <h3>Make a Wish</h3>
          <p>
            Tell FinGenie what you're saving for, be it a dream vacation or your first home.
          </p>
        </div>

        <div className="step">
          <div className="step-icon">🪄</div>
          <span className="step-tag">Step 02</span>
          <h3>Watch the Magic</h3>
          <p>
            Our smart algorithms create a personalized savings plan that fits your lifestyle.
          </p>
        </div>

        <div className="step">
          <div className="step-icon">🏆</div>
          <span className="step-tag">Step 03</span>
          <h3>Celebrate Success</h3>
          <p>
            Reach your goals and watch your wishes come true, one milestone at a time.
          </p>
        </div>
      </div>
    </div>
  );
}
