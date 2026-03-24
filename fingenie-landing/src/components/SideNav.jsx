const labels = [
  "Home",
  "Features",
  "How It Works",
  "Testimonials",
  "Get Started",
];

export default function SideNav({ current, total, goTo }) {
  const handleKeyDown = (e, index) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goTo(index);
    }
  };

  return (
    <nav className="side-nav" aria-label="Page sections">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`dot-wrapper ${i === current ? "active" : ""}`}
          onClick={() => goTo(i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          role="button"
          tabIndex={0}
          aria-label={`Go to ${labels[i]} section`}
          aria-current={i === current ? "true" : undefined}
        >
          <div className="dot" aria-hidden="true" />
          <span className="dot-label">{labels[i]}</span>
        </div>
      ))}
    </nav>
  );
}
