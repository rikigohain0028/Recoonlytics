import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { UploadArea } from '@/components/UploadArea';
import { AccountPanel } from '@/components/auth/AccountPanel';
import { UsageBar } from '@/components/auth/UsageBar';
import { Link } from 'wouter';
import { 
  BarChart3, Database, GraduationCap, Building2, Sun, Moon, 
  Lock, Zap, Shield, Cpu, Download, FileJson, TrendingUp,
  Sparkles, BarChart2, Share2,
  CheckCircle2
} from 'lucide-react';
import Footer from '@/components/Footer';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const TrustBadge = ({ icon: Icon, text }: { icon: React.ComponentType<{ className: string }>; text: string }) => (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-sm border transition-all hover:scale-105 ${
      isDark 
        ? 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800/60' 
        : 'bg-white/40 border-slate-200/50 text-slate-700 hover:bg-white/60'
    }`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );

  const StepCard = ({ number, title, description }: { number: number; title: string; description: string }) => (
    <div className={`rounded-2xl p-8 border transition-all hover:scale-105 duration-300 ${
      isDark 
        ? 'bg-slate-800/50 border-slate-700/50' 
        : 'bg-white border-slate-100'
    }`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg mb-4 ${
        isDark 
          ? 'bg-blue-500/20 text-blue-400' 
          : 'bg-blue-100 text-blue-600'
      }`}>
        {number}
      </div>
      <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{title}</h3>
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{description}</p>
    </div>
  );

  const CapabilityItem = ({ text }: { text: string }) => (
    <div className="flex items-start gap-3">
      <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
      <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{text}</span>
    </div>
  );

  const StatCard = ({ icon: Icon, label, value }: { icon: React.ComponentType<{ className: string }>; label: string; value: string }) => (
    <div className={`rounded-2xl p-6 border text-center ${
      isDark 
        ? 'bg-slate-800/30 border-slate-700/50' 
        : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4 ${
        isDark 
          ? 'bg-blue-500/20 text-blue-400' 
          : 'bg-blue-100 text-blue-600'
      }`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className={`text-2xl font-bold mb-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{value}</p>
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{label}</p>
    </div>
  );

  const ExportOption = ({ icon: Icon, label }: { icon: React.ComponentType<{ className: string }>; label: string }) => (
    <div className={`flex flex-col items-center gap-3 p-4 rounded-lg ${
      isDark 
        ? 'bg-slate-800/30 border border-slate-700/50' 
        : 'bg-slate-50 border border-slate-200'
    }`}>
      <Icon className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
      <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{label}</span>
    </div>
  );

  return (
    <div className={`min-h-screen overflow-x-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 px-4 md:px-6 py-3 flex items-center justify-between backdrop-blur-md ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} border-b`}>
        <div className="flex items-center">
          <img src="/logo.jpg" alt="Recoonlytics" className="h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:flex gap-5 text-sm font-medium">
            <a href="#features" className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-[#1e3a8a]'} transition-colors`}>Features</a>
            <a href="#audience" className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-[#1e3a8a]'} transition-colors`}>Who it's for</a>
            <Link href="/pricing">
              <span className={`cursor-pointer ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-[#1e3a8a]'} transition-colors`}>Pricing</span>
            </Link>
          </div>
          {/* Usage bar — compact, desktop only */}
          <div className="hidden lg:block w-44">
            <UsageBar />
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <AccountPanel />
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-16 px-4 relative">
        <div className={`absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isDark ? 'from-blue-900/30 via-slate-950 to-slate-950' : 'from-blue-100/50 via-white to-white'} pointer-events-none`} />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-blue-50 border-blue-100 text-blue-800'} border text-sm font-semibold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            100% Browser-Based. Fast & Secure.
          </div>
          
          <h1 className={`text-5xl md:text-7xl font-display font-extrabold leading-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Analyze, Clean & Understand Your <br className="hidden md:block"/>
            <span className={`${isDark ? 'text-blue-400' : 'text-gradient'}`}>Excel Data Instantly</span>
          </h1>
          
          <p className={`text-xl mb-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Designed for Professionals & Learners. Transform messy spreadsheets into clear insights with zero setup.
          </p>

          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <UploadArea />
          </div>
        </div>
      </div>

      {/* Trust Badges */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TrustBadge icon={Lock} text="Files auto-deleted" />
          <TrustBadge icon={Zap} text="Seconds to insights" />
          <TrustBadge icon={Shield} text="No permanent storage" />
          <TrustBadge icon={Cpu} text="AI never trains on data" />
          <TrustBadge icon={Download} text="Trusted payments" />
        </div>
      </div>

      {/* How It Works */}
      <div className={`py-20 px-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-display font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              How Recoonlytics Works
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Four simple steps from raw data to actionable insights
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StepCard number={1} title="Upload Dataset" description="Upload CSV, XLSX or PDF files securely." />
            <StepCard number={2} title="AI Analysis" description="Recoonlytics detects structure, duplicates, and patterns." />
            <StepCard number={3} title="Get Insights" description="Receive AI explanations, charts, and statistics." />
            <StepCard number={4} title="Export Results" description="Download cleaned data, charts, and reports." />
          </div>
        </div>
      </div>

      {/* Feature visual split */}
      <div className={`max-w-7xl mx-auto px-4 py-20 ${isDark ? 'border-slate-800' : 'border-slate-100'} border-t`}>
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <h2 className={`text-3xl md:text-4xl font-display font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Powerful Data <br/> Capabilities
            </h2>
            <p className={`text-lg ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Recoonlytics automatically detects your data structure, identifies duplicates, calculates essential statistics, and generates beautiful charts in seconds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <CapabilityItem text="Automatic duplicate detection" />
              <CapabilityItem text="Missing value detection" />
              <CapabilityItem text="Outlier detection" />
              <CapabilityItem text="AI executive reports" />
              <CapabilityItem text="Natural language questions" />
              <CapabilityItem text="Multi-file merging" />
              <CapabilityItem text="PDF to data conversion" />
              <CapabilityItem text="Smart data cleaning" />
            </div>
          </div>
          <div className="flex-1 relative">
            <div className={`absolute inset-0 rounded-3xl transform rotate-3 scale-105 -z-10 ${isDark ? 'bg-gradient-to-tr from-blue-900/30 to-transparent' : 'bg-gradient-to-tr from-blue-100 to-transparent'}`}></div>
            <img src="/hero-banner.jpg" alt="Dashboard Preview" className={`rounded-3xl shadow-2xl relative z-10 w-full object-cover ${isDark ? 'border-slate-700' : 'border-white/50'} border`} />
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className={`py-20 px-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-display font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Built for Performance
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Enterprise-grade reliability and speed
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Database} label="Large datasets" value="20MB+" />
            <StatCard icon={TrendingUp} label="Instant results" value="Seconds" />
            <StatCard icon={FileJson} label="Format support" value="CSV, XLSX, PDF" />
            <StatCard icon={Sparkles} label="AI powered" value="100%" />
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className={`text-4xl font-display font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Export Your Results
          </h2>
          <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Download in your preferred format
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ExportOption icon={FileJson} label="CSV" />
          <ExportOption icon={Database} label="Excel" />
          <ExportOption icon={Download} label="JSON" />
          <ExportOption icon={BarChart2} label="Charts" />
          <ExportOption icon={Share2} label="AI Reports" />
        </div>
      </div>

      {/* Audience Section */}
      <div id="audience" className={`py-24 px-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-display font-bold mb-4 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Designed for Professionals & Learners
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              You don't need a degree in data science to understand your data. We built Recoonlytics to be intuitive for all skill levels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`rounded-3xl p-8 border hover:scale-105 hover:shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20' : 'bg-white border-slate-100 shadow-lg shadow-black/5'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-[#1e3a8a]'}`}>
                <GraduationCap className="w-7 h-7" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Education & Statistics</h3>
              <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Perfect for teachers grading data or students analyzing research. Get immediate statistical summaries without writing a single formula.</p>
            </div>

            <div className={`rounded-3xl p-8 border hover:scale-105 hover:shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20' : 'bg-white border-slate-100 shadow-lg shadow-black/5'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Office & Excel Users</h3>
              <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Clean messy CRM exports, remove duplicates, and standardize text formatting instantly before your next big meeting.</p>
            </div>

            <div className={`rounded-3xl p-8 border hover:scale-105 hover:shadow-lg transition-all duration-300 ${isDark ? 'bg-slate-800 border-slate-700 shadow-lg shadow-black/20' : 'bg-white border-slate-100 shadow-lg shadow-black/5'}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isDark ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                <BarChart3 className="w-7 h-7" />
              </div>
              <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Data Analysis</h3>
              <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Quickly profile new datasets. Understand distributions, missing values, and outliers before loading into complex BI tools.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Credibility Strip */}
      <div className={`py-16 px-4 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
        <div className="max-w-6xl mx-auto">
          <h3 className={`text-2xl font-bold text-center mb-12 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            Why Trust Recoonlytics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-slate-800/30 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Minimal data collection</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Only essentials stored</p>
            </div>
            <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-slate-800/30 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Secure processing</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>HTTPS encrypted</p>
            </div>
            <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-slate-800/30 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Transparent policies</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Clear privacy terms</p>
            </div>
            <div className={`p-6 rounded-xl text-center ${isDark ? 'bg-slate-800/30 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
              <p className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Continuous improvements</p>
              <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Regular updates</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
