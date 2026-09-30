import { Link } from "@remix-run/react";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full bg-black/20 backdrop-blur-sm py-6 mt-auto">
      {/* Teaching Lab's four brand colors, as in the background photo's edge */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(to_right,#2e95d3_0_24%,#e4683a_24%_50%,#479a8b_50%_76%,#2b6fbf_76%)]"
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side - Copyright */}
          <div className="text-white/80 text-sm">
            © {currentYear} Teaching Lab. All rights reserved.
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-6">
            <Link
              to="/privacy-policy"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <a
              href="mailto:project.log@teachinglab.org"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              Contact Us
            </a>
            <a
              href="https://www.teachinglab.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white text-sm transition-colors duration-200"
            >
              Teaching Lab
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

