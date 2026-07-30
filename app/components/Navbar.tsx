import { Link } from "react-router";

const PUTER_LIVE_URL = "https://puter.com/app/ai-resume-analyser-24";

const Navbar = () => {
  return (
    <nav className="navbar flex items-center justify-between px-6 py-4">
      <Link to="/">
        <p className="text-2xl font-bold text-gradient">RESUMIND</p>
      </Link>

      <div className="flex items-center gap-3">
        {/* Puter Live App Link */}
        <a
          href={PUTER_LIVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition hover:bg-purple-50 bg-white border-purple-300 text-purple-700 shadow-sm"
          title="Open original deployment on Puter.com"
        >
          <span>⚡ Live Puter App</span>
          <span className="text-[10px]">↗</span>
        </a>

        <Link to="/upload" className="primary-button w-fit">
          Upload Resume
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;