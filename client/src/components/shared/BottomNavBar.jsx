import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: 'home', fillIcon: 'home' },
  { to: '/scan', label: 'Scan', icon: 'document_scanner', fillIcon: 'document_scanner' },
  { to: '/profile', label: 'Profile', icon: 'person', fillIcon: 'person' },
];

export default function BottomNavBar() {
  const location = useLocation();

  return (
    <nav className="md:hidden bg-surface-container-low/60 backdrop-blur-2xl border-t border-white/10 shadow-lg fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3">
      {NAV_ITEMS.map(({ to, label, icon, fillIcon }) => {
        const isActive =
          to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
        return (
          <NavLink key={to} to={to} className="no-underline">
            <motion.div
              whileTap={{ scale: 0.88 }}
              className={`flex flex-col items-center justify-center px-4 py-1 rounded-xl transition-colors duration-200 ${
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:bg-white/5'
              }`}
            >
              <span
                className="material-symbols-outlined mb-0.5"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {isActive ? fillIcon : icon}
              </span>
              <span className="font-label-caps text-label-caps">{label}</span>
            </motion.div>
          </NavLink>
        );
      })}
    </nav>
  );
}
