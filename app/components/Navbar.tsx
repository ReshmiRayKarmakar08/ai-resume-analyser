import { Link } from "react-router";

const PUTER_LIVE_URL = "https://puter.com/app/ai-resume-analyser-24";

const Navbar = () => {
  return (
    <header className="w-full px-3 sm:px-6 md:px-8 sticky top-3 z-30">
      <nav className="navbar">
        <Link to="/" className="shrink-0">
          <p className="text-xl sm:text-2xl font-bold text-gradient tracking-tight">RESUMIND</p>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Puter Live App Link without emojis */}
          <a
            href={PUTER_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold border transition hover:bg-purple-50 bg-white border-purple-300 text-purple-700 shadow-sm shrink-0"
            title="Open the same interface powered by Puter's in-built AI"
          >
            <span className="hidden sm:inline">Use In-Built Puter AI</span>
            <span className="sm:hidden">Puter AI</span>
          </a>

          <Link to="/upload" className="primary-button text-xs sm:text-sm !w-auto shrink-0 whitespace-nowrap">
            <span className="hidden sm:inline">Upload Resume</span>
            <span className="sm:hidden">Upload</span>
          </Link>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;