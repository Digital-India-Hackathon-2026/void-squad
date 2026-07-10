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
    <nav className="fixed z-50 flex bg-surface-container-low/80 backdrop-blur-3xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] 
      bottom-0 w-full border-t flex-row justify-around items-center px-4 py-3
      md:bottom-auto md:w-auto md:top-1/2 md:-translate-y-1/2 md:flex-col md:left-6 md:border md:rounded-3xl md:px-3 md:py-6 md:gap-4
    ">
      {NAV_ITEMS.map(({ to, label, icon, fillIcon }) => {
        const isActive =
          to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
        return (
          <NavLink key={to} to={to} className="no-underline">
            <motion.div
              whileTap={{ scale: 0.88 }}
              className={`flex flex-col items-center justify-center px-4 py-1.5 md:py-3 md:px-3 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'text-primary bg-primary/15 shadow-[inset_0_0_12px_rgba(78,222,163,0.1)]'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-on-background'
              }`}
            >
              <span
                className="material-symbols-outlined mb-1 md:mb-1.5 md:text-[26px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {isActive ? fillIcon : icon}
              </span>
              <span className="font-label-caps text-[10px] tracking-wider">{label}</span>
            </motion.div>
          </NavLink>
        );
      })}
    </nav>
  );
}
