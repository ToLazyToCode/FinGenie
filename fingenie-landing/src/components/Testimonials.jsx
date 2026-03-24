import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function Testimonials({ active }) {
  const testimonialsRef = useRef(null);

  /* 1️⃣ SET trạng thái ban đầu (KHÔNG hiện trước) */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".testimonials h2", { opacity: 0, y: 30 });
      gsap.set(".testimonials .subtitle", { opacity: 0, y: 20 });

      gsap.set(".testimonial-card", {
        opacity: 0,
        y: 40,
        scale: 0.95
      });
    }, testimonialsRef);

    return () => ctx.revert();
  }, []);

  /* 2️⃣ PLAY animation khi section active */
  useEffect(() => {
    if (!active) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      tl.to(".testimonials h2", {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out"
      })
        .to(
          ".testimonials .subtitle",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out"
          },
          "-=0.4"
        )
        .to(
          ".testimonial-card",
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.25,
            ease: "power3.out"
          },
          "-=0.2"
        );
    }, testimonialsRef);

    return () => ctx.revert();
  }, [active]);

  return (
    <div className="testimonials" ref={testimonialsRef}>
      <h2>
        Loved by <span className="gradient-text">Thousands</span>
      </h2>

      <p className="subtitle">
        See what our users are saying about their FinGenie journey
      </p>

      <div className="testimonial-grid">
        <div className="testimonial-card">
          <div className="stars">★★★★★</div>
          <p className="quote">
            “FinGenie helped me save for my dream startup. The visual
            progress tracking kept me motivated every single day!”
          </p>

          <div className="author">
            <div className="avatar">SM</div>
            <div>
              <strong>Sarah M.</strong>
              <span>Entrepreneur</span>
            </div>
          </div>
        </div>

        <div className="testimonial-card">
          <div className="stars">★★★★★</div>
          <p className="quote">
            “I’ve tried many savings apps, but nothing comes close to the
            magical experience of FinGenie. Saved $10K in 6 months!”
          </p>

          <div className="author">
            <div className="avatar">JK</div>
            <div>
              <strong>James K.</strong>
              <span>Software Developer</span>
            </div>
          </div>
        </div>

        <div className="testimonial-card">
          <div className="stars">★★★★★</div>
          <p className="quote">
            “The auto-save feature is a game changer. I don’t even notice
            the savings happening, but my goals keep getting closer!”
          </p>

          <div className="author">
            <div className="avatar">ER</div>
            <div>
              <strong>Emily R.</strong>
              <span>Teacher</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
