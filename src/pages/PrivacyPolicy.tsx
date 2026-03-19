import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function PrivacyPolicy() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-8">
      <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
        {title}
      </h2>
      <div className={`space-y-3 ${isDark ? 'text-slate-300' : 'text-slate-700'} leading-relaxed`}>
        {children}
      </div>
    </div>
  );

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
          Privacy Policy
        </h1>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-12`}>
          Last updated: March 2026
        </p>

        <div className={`${isDark ? 'border-slate-800' : 'border-slate-200'} border-t pt-8`}>
          <Section title="Introduction">
            <p>
              Recoonlytics is a data analysis platform that allows users to upload datasets for cleaning, analysis, and AI insights. We are committed to protecting your privacy and being transparent about how we handle your data.
            </p>
          </Section>

          <Section title="Information We Collect">
            <div>
              <p className="font-semibold mb-3">We only collect:</p>
              <ul className={`space-y-2 ml-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li>• Email address (for account login)</li>
                <li>• Uploaded files (processed temporarily)</li>
                <li>• Usage activity (feature usage only)</li>
              </ul>
            </div>
            <div className="mt-6">
              <p className="font-semibold mb-3">We DO NOT collect:</p>
              <ul className={`space-y-2 ml-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li>• Names</li>
                <li>• Phone numbers</li>
                <li>• Addresses</li>
                <li>• Payment card details</li>
              </ul>
            </div>
          </Section>

          <Section title="File Handling Policy">
            <p>Uploaded files are processed only for analysis purposes. Files are automatically deleted after processing or within a limited time. Recoonlytics does not permanently store user datasets.</p>
          </Section>

          <Section title="AI Data Policy">
            <p>We do not use customer data to train AI models. User data is never used for external AI training or development.</p>
          </Section>

          <Section title="Data Usage">
            <p className="font-semibold mb-3">We use data only to:</p>
            <ul className={`space-y-2 ml-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li>• Provide analysis results</li>
              <li>• Improve platform performance</li>
              <li>• Provide support</li>
              <li>• Prevent misuse</li>
            </ul>
          </Section>

          <Section title="Third Party Services">
            <p className="mb-3">We use trusted providers:</p>
            <ul className={`space-y-2 ml-4 ${isDark ? 'text-slate-300' : 'text-slate-700'} mb-3`}>
              <li>• PayPal (payments)</li>
              <li>• Google Pay (payments)</li>
              <li>• Zoho ZeptoMail (emails)</li>
            </ul>
            <p>These providers have their own privacy policies. We encourage you to review them.</p>
          </Section>

          <Section title="Security">
            <p>We take data security seriously:</p>
            <ul className={`space-y-2 ml-4 mt-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li>• We use secure connections (HTTPS)</li>
              <li>• We limit internal access to data</li>
              <li>• We do not sell user data</li>
            </ul>
          </Section>

          <Section title="User Rights">
            <p className="mb-3">You have the right to:</p>
            <ul className={`space-y-2 ml-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li>• Stop using the service anytime</li>
              <li>• Request account deletion</li>
              <li>• Contact our support team with questions</li>
            </ul>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
              <a href="mailto:support.recoonlytics@gmail.com" className={`font-semibold ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                support.recoonlytics@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
