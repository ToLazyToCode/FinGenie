import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import SideNav from "./components/SideNav";

const sectionClasses = ["dark", "mid", "light", "mid", "dark"];

let lastScrollTime = 0;

export default function App() {
  const containerRef = useRef(null);
  const isAnimating = useRef(false);
  const [current, setCurrent] = useState(0);

  const sections = [
    <Hero active={current === 0} />,
    <Features active={current === 1} />,
    <HowItWorks active={current === 2} />,
    <Testimonials active={current === 3} />,
    <>
      <CTA active={current === 4} />
      <Footer />
    </>
  ];

  useEffect(() => {
    const onWheel = (e) => {
      const now = Date.now();
      if (now - lastScrollTime < 900) return;
      lastScrollTime = now;

      e.preventDefault();
      if (isAnimating.current) return;

      if (e.deltaY > 0 && current < sections.length - 1) {
        goTo(current + 1);
      } else if (e.deltaY < 0 && current > 0) {
        goTo(current - 1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [current]);

  const goTo = (index) => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    gsap.to(containerRef.current, {
      y: `-${index * 100}vh`,
      duration: 1,
      ease: "power3.inOut",
      onComplete: () => {
        setCurrent(index);
        isAnimating.current = false;
      }
    });
  };

  return (
    <>
      <div className="container" ref={containerRef}>
        {sections.map((Section, i) => (
          <section
            key={i}
            className={`section ${sectionClasses[i]} ${
              i === sections.length - 1 ? "section-last" : ""
            }`}
          >
            {Section}
          </section>
        ))}
      </div>

      <div style={{ height: `${sections.length * 100}vh` }} />

      <SideNav
        current={current}
        total={sections.length}
        goTo={goTo}
      />
    </>
  );
}
