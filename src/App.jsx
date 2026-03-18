import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { Trophy, LogOut, Settings } from "lucide-react";

import HomeView from "./components/HomeView";
import QuizPlayer from "./components/QuizPlayer";
import QuizStudio from "./components/QuizStudio";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] p-6 font-sans relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-slate-900/80 backdrop-blur-3xl border border-slate-800 p-10 md:p-14 rounded-[2.5rem] shadow-[0_0_80px_20px_rgba(79,70,229,0.1)] text-center max-w-[420px] w-full relative z-10"
        >
          <img 
            src="/logo_v2.png" 
            alt="Quizy Logo" 
            className="w-40 h-40 mx-auto transition-transform hover:scale-105 duration-500 object-contain relative z-10 mb-4 mix-blend-screen"
          />
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">
            Quizy
          </h1>
          <p className="text-slate-400 mb-10 text-lg font-medium">
            Challenge yourself. <br/> Compete globally.
          </p>
          <button
            onClick={handleLogin}
            className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3 hover:-translate-y-1"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200">
      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdmin && <QuizStudio user={user} onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div 
            onClick={() => setActiveQuiz(null)}
            className="flex items-center gap-3 font-black text-slate-800 text-2xl tracking-tighter cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/favicon.png" 
              alt="Quizy Logo" 
              className="w-10 h-10 rounded-full shadow-sm object-cover border border-slate-100" 
            />
            QUIZY
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
              <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full shadow-sm" />
              <span className="font-bold text-sm text-slate-700">{user.displayName}</span>
            </div>

            <button
              onClick={() => setShowAdmin(true)}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              title="Quiz Studio"
            >
              <Settings size={18} />
              <span className="hidden md:inline">Quiz Studio</span>
            </button>

            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 p-2.5 md:px-4 md:py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            >
              <LogOut size={18} />
              <span className="hidden md:inline">Logout</span>
            </button>
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
