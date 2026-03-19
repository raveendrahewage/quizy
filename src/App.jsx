import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously, updateProfile } from "firebase/auth";
import { Trophy, LogOut, Settings, Moon, Sun, User as UserIcon, ArrowLeft } from "lucide-react";

import HomeView from "./components/HomeView";
import QuizPlayer from "./components/QuizPlayer";
import QuizStudio from "./components/QuizStudio";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark" || 
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setGuestLoading(true);
    try {
      const { user: anonUser } = await signInAnonymously(auth);
      await updateProfile(anonUser, {
        displayName: guestName,
        photoURL: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(guestName)}`
      });
      // Force state update since updateProfile doesn't trigger onAuthStateChanged
      setUser({ ...auth.currentUser });
    } catch (error) {
      console.error("Guest login failed:", error);
    } finally {
      setGuestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="w-12 h-12 border-4 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden transition-all duration-1000 ${isDark ? 'bg-[#05070a]' : 'bg-[#dae2ed]'}`}>
        <div className="absolute top-8 right-8 flex gap-4 z-50">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 font-black shadow-lg hover:scale-105 active:scale-95 ${isDark ? 'bg-slate-900/60 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200'}`}
          >
            {isDark ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-indigo-600" />}
            <span className="text-sm hidden sm:inline">{isDark ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>

        {/* Dynamic Background Blobs */}
        <div className={`absolute -top-24 -left-24 w-[35rem] h-[35rem] rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-float ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-300'}`}></div>
        <div className={`absolute top-1/2 -right-24 w-[30rem] h-[30rem] rounded-full blur-[120px] mix-blend-multiply opacity-50 animate-float-delayed ${isDark ? 'bg-violet-900/40' : 'bg-violet-300'}`}></div>
        <div className={`absolute -bottom-24 left-1/2 w-[25rem] h-[25rem] rounded-full blur-[100px] mix-blend-multiply opacity-30 animate-pulse-slow ${isDark ? 'bg-pink-900/30' : 'bg-pink-200'}`}></div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`backdrop-blur-2xl p-10 md:p-16 rounded-[3.5rem] border-4 text-center max-w-[480px] w-full relative z-10 shadow-2xl transition-all duration-500
            ${isDark 
              ? 'bg-slate-900/40 border-slate-800/50 shadow-indigo-500/10' 
              : 'bg-white/70 border-white shadow-slate-300/50'
            }`}
        >
          <div className="relative mb-10 group">
            <div className={`absolute inset-0 blur-3xl rounded-full opacity-20 group-hover:opacity-40 transition-opacity duration-1000 ${isDark ? 'bg-indigo-400' : 'bg-indigo-600'}`}></div>
            <img 
              src="/logo_v2.png" 
              alt="Quizy Logo" 
              className={`w-32 h-32 mx-auto relative z-10 drop-shadow-2xl transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3 ${isDark ? 'mix-blend-screen' : ''}`}
            />
          </div>

          <h1 className={`text-6xl font-black mb-3 tracking-tighter transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Quizy
          </h1>
          
          <AnimatePresence mode="wait">
            {!showGuestForm ? (
              <motion.div
                key="login-buttons"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full"
              >
                <p className={`mb-12 text-xl font-bold leading-relaxed tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Master facts. <br/> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
                    Conquer the world.
                  </span>
                </p>

                <div className="space-y-4">
                  <button
                    onClick={handleLogin}
                    className={`w-full py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-4 hover:-translate-y-1.5 active:scale-95 group overflow-hidden relative
                      ${isDark 
                        ? 'bg-white text-slate-950 hover:bg-indigo-50' 
                        : 'bg-slate-950 text-white hover:bg-slate-900'
                      }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <svg className="w-7 h-7" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span className="relative z-10">Sign in with Google</span>
                  </button>

                  <button
                    onClick={() => setShowGuestForm(true)}
                    className={`w-full py-5 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-4 hover:bg-black/5 dark:hover:bg-white/5 border-2 ${isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'}`}
                  >
                    <UserIcon size={24} />
                    <span>Play as Guest</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="guest-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <button 
                  onClick={() => setShowGuestForm(false)}
                  className={`mb-6 flex items-center gap-2 font-bold text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900 transition-colors'}`}
                >
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
                <form onSubmit={handleGuestLogin} className="space-y-6">
                  <div className="text-left">
                    <label className={`block text-sm font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Choose a display name
                    </label>
                    <input
                      autoFocus
                      type="text"
                      maxLength={15}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. QuizMaster99"
                      className={`w-full px-6 py-5 rounded-2xl font-bold text-lg outline-none transition-all
                        ${isDark 
                          ? 'bg-slate-950/50 border-2 border-slate-800 text-white focus:border-indigo-500 focus:bg-slate-950' 
                          : 'bg-white border-2 border-slate-100 text-slate-900 focus:border-indigo-500 focus:shadow-xl'
                        }`}
                    />
                  </div>
                  <button
                    disabled={guestLoading || !guestName.trim()}
                    type="submit"
                    className={`w-full py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center justify-center gap-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:scale-[1.02] disabled:opacity-50 disabled:grayscale disabled:scale-100 hover:shadow-indigo-500/20`}
                  >
                    {guestLoading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      "Start Playing"
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 flex items-center justify-center gap-8 border-t pt-10 border-slate-200/10">
            <div className="text-center">
              <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>1k+</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quizzes</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>50k+</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Players</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>#1</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ranking</div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans selection:bg-indigo-200 transition-colors duration-300">
      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdmin && <QuizStudio user={user} onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div 
            onClick={() => setActiveQuiz(null)}
            className="flex items-center gap-3 font-black text-slate-800 dark:text-slate-100 text-2xl tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/logo_v2.png" 
              alt="Quizy Logo" 
              className="w-10 h-10 rounded-full shadow-sm object-cover border border-slate-100 dark:border-slate-800" 
            />
            QUIZY
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200/50 dark:border-slate-700/50"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className={`hidden md:flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 ${user.isAnonymous ? 'ring-2 ring-amber-400/20' : ''}`}>
              <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full shadow-sm" />
              <div className="flex flex-col">
                <span className="font-bold text-xs uppercase tracking-tighter text-slate-400 -mb-1">{user.isAnonymous ? 'Guest' : 'Member'}</span>
                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{user.displayName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!user.isAnonymous && (
                <button
                  onClick={() => setShowAdmin(true)}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 border border-indigo-200 dark:border-indigo-800/50"
                  title="Quiz Studio"
                >
                  <Settings size={18} />
                  <span className="hidden md:inline">Quiz Studio</span>
                </button>
              )}

              <button
                onClick={() => {
                  signOut(auth);
                  setShowGuestForm(false);
                  setGuestName("");
                  setActiveQuiz(null);
                  setShowAdmin(false);
                }}
                className="flex items-center gap-2 p-2.5 md:px-4 md:py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
              >
                <LogOut size={18} />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main>
        <AnimatePresence mode="wait">
          {!activeQuiz ? (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeView user={user} onPlayQuiz={(quiz) => setActiveQuiz(quiz)} />
            </motion.div>
          ) : (
            <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizPlayer user={user} quiz={activeQuiz} onBack={() => setActiveQuiz(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
