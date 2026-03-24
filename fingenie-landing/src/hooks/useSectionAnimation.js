import { useEffect } from "react";
import gsap from "gsap";

export default function useSectionAnimation(ref) {
  useEffect(() => {
    if (!ref.current) return;

    gsap.from(ref.current.children, {
  y: 40,
  opacity: 0,
  duration: 0.8,
  stagger: 0.15,
  clearProps: "opacity"
});

  }, []);
}
