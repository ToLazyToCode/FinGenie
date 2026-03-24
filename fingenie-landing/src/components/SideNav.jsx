const labels = [
  "Hero",
  "Features",
  "How it Works",
  "Testimonials",
  "Get Started"
];

export default function SideNav({ current, total, goTo }) {
  return (
    <div className="side-nav">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`dot-wrapper ${i === current ? "active" : ""}`}
          onClick={() => goTo(i)}
        >
          <div className="dot" />
          <span className="dot-label">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}
