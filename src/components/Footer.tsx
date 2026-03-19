import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Link } from 'wouter';
import { Instagram } from 'lucide-react';

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const links = [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security', href: '/security' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <footer className={`${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'} border-t`}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-8">
          {/* Brand */}
          <div>
            <h3 className={`font-bold text-lg mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Recoonlytics
            </h3>
            <p className="text-sm">
              Transform & Understand Your Data Instantly.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className={`font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Resources
            </h4>
            <ul className="space-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>
                    <span className={`text-sm hover:${isDark ? 'text-slate-100' : 'text-slate-900'} transition-colors cursor-pointer`}>
                      {link.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className={`font-semibold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Follow Us
            </h4>
            <a
              href="https://www.instagram.com/recoonlytics"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} hover:${isDark ? 'text-slate-100' : 'text-slate-900'} transition-colors`}
            >
              <Instagram className="w-4 h-4" />
              Instagram
            </a>
          </div>
        </div>

        <div className={`${isDark ? 'border-slate-800' : 'border-slate-200'} border-t pt-8 text-center text-sm`}>
          <p>© {new Date().getFullYear()} Recoonlytics. All rights reserved.</p>
          <p className="mt-2">Transform & Understand Your Data Instantly.</p>
        </div>
      </div>
    </footer>
  );
}
