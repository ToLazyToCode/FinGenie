export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="gradient-text">Fin</span>Genie
            </div>
            <p>
              Your AI-powered financial companion. Track, save, and grow
              with gamification that makes finance fun.
            </p>
          </div>

          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#security">Security</a></li>
              <li><a href="#download">Download</a></li>
            </ul>
          </div>

          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="#about">About</a></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          <div>
            <h5>Legal</h5>
            <ul>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#cookies">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copyright">
            &copy; 2025 FinGenie. All rights reserved.
          </span>
          <div className="footer-social">
            <a href="#twitter" aria-label="Twitter">𝕏</a>
            <a href="#github" aria-label="GitHub">⌘</a>
            <a href="#discord" aria-label="Discord">◆</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
