import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, Mail, Instagram } from 'lucide-react';
import { Link } from 'wouter';

export default function Contact() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/">
          <span className={`inline-flex items-center gap-2 mb-8 cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}>
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </span>
        </Link>

        <h1 className={`text-4xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Get in Touch
        </h1>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-12 text-lg`}>
          We'd love to hear from you. Whether you have questions, feedback, or need support, reach out anytime.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className={`rounded-2xl p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
              <Mail className="w-6 h-6" />
            </div>
            <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Email Support
            </h3>
            <p className={`mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              For help, bug reports, or feature requests:
            </p>
            <a
              href="mailto:support.recoonlytics@gmail.com"
              className={`inline-block font-semibold ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
            >
              support.recoonlytics@gmail.com
            </a>
          </div>

          <div className={`rounded-2xl p-8 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border`}>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${isDark ? 'bg-pink-900/30 text-pink-400' : 'bg-pink-100 text-pink-600'}`}>
              <Instagram className="w-6 h-6" />
            </div>
            <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Follow Us
            </h3>
            <p className={`mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Stay updated with our latest features and announcements:
            </p>
            <a
              href="https://www.instagram.com/recoonlytics"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block font-semibold ${isDark ? 'text-pink-400 hover:text-pink-300' : 'text-pink-600 hover:text-pink-700'} transition-colors`}
            >
              @recoonlytics
            </a>
          </div>
        </div>

        <div className={`mt-12 p-8 rounded-2xl ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'} border`}>
          <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Response Time
          </h3>
          <p className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            We typically respond to emails within 24-48 hours. Thank you for your patience and for using Recoonlytics!
          </p>
        </div>
      </div>
    </div>
  );
}
