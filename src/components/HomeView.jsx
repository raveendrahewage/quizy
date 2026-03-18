import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, onSnapshot, limit, where } from "firebase/firestore";
import { db } from "../firebase";
import { Trophy, Clock, Play, BarChart3, Star, Zap, Lock, X } from "lucide-react";

export default function HomeView({ user, onPlayQuiz }) {
  const [quizzes, setQuizzes] = useState([]);
  const [leaderboards, setLeaderboards] = useState({});
  const [pinPromptQuiz, setPinPromptQuiz] = useState(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const checkedUrlRef = React.useRef(false);

  useEffect(() => {
    // Fetch all published quizzes
    const qv = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
    const unsubQ = onSnapshot(qv, (snap) => {
      const fetchedQuizzes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setQuizzes(fetchedQuizzes);

      // For each quiz, fetch its top 3 leaderboard
      fetchedQuizzes.forEach(quiz => {
        const lbq = query(
          collection(db, "responses"),
          where("quizId", "==", quiz.id),
          orderBy("score", "desc"),
          limit(3)
        );
        onSnapshot(lbq, (lSnap) => {
          setLeaderboards(prev => ({
            ...prev,
            [quiz.id]: lSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          }));
        });
      });
    });

    return () => unsubQ();
  }, []);

  // Check URL parameter for auto-play
  useEffect(() => {
    if (quizzes.length > 0 && !checkedUrlRef.current) {
      checkedUrlRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const quizId = params.get("quiz");
      if (quizId) {
        const targetQ = quizzes.find(q => q.id === quizId);
        if (targetQ) {
          if (targetQ.isPrivate) {
            setPinPromptQuiz(targetQ);
          } else {
            onPlayQuiz(targetQ);
          }
        }
        // Clean up URL so it doesn't loop
        window.history.replaceState({}, "", "/");
      }
    }
  }, [quizzes, onPlayQuiz]);

  const handlePlayClick = (quiz) => {
    if (quiz.isPrivate) {
      setPinPromptQuiz(quiz);
      setEnteredPin("");
      setPinError(false);
    } else {
      onPlayQuiz(quiz);
    }
  };

  const submitPin = () => {
    if (pinPromptQuiz && enteredPin === pinPromptQuiz.pin) {
      const q = pinPromptQuiz;
      setPinPromptQuiz(null);
      setEnteredPin("");
      onPlayQuiz(q);
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 500);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 relative min-h-screen overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-indigo-300/20 to-violet-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-300/20 to-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="mb-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full font-bold text-sm mb-6 border border-indigo-100 shadow-sm"
        >
          <Zap size={16} className="fill-indigo-600" />
          Ready for a new challenge?
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-5xl md:text-7xl font-black text-slate-800 tracking-tight leading-tight"
        >
          Welcome back, <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 drop-shadow-sm">
            {user.displayName.split(" ")[0]}!
          </span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-slate-500 font-medium text-xl max-w-2xl leading-relaxed"
        >
          Select a quiz from below and test your knowledge against the world. 
          Will you make it to the top of the leaderboard?
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 relative z-10">
        <AnimatePresence>
          {quizzes.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-2 text-center py-32 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl shadow-indigo-500/5 group"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform duration-500">
                <Trophy className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-700 mb-2">No Quizzes Yet</h3>
              <p className="text-slate-500 font-medium text-lg">Check back later or ask an admin to create some!</p>
            </motion.div>
          ) : (
            quizzes.map((quiz, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, type: "spring" }}
                key={quiz.id}
                className="group bg-white/70 backdrop-blur-md rounded-[2.5rem] p-8 sm:p-10 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/20 border border-white hover:border-indigo-100 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 text-indigo-50/50 group-hover:scale-125 group-hover:-rotate-12 transition-transform duration-700 ease-out z-0 pointer-events-none">
                  <Star className="w-48 h-48 fill-current" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-3xl font-black text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors flex items-center gap-3">
                      {quiz.isPrivate && <Lock size={24} className="text-amber-500 shrink-0" />}
                      {quiz.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-500 font-medium mb-10 text-lg leading-relaxed line-clamp-2">
                    {quiz.description || "Test your skills with this exciting quiz challenge!"}
                  </p>

                  <div className="mt-auto">
                    {/* Interaction Row */}
                    <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
                      <div className="flex gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2 text-slate-600 font-bold bg-white px-4 py-2.5 rounded-xl border-2 border-slate-100 shadow-sm">
                          <Clock size={18} className="text-indigo-500" />
                          15s / Q
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePlayClick(quiz)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:shadow-indigo-600/40 transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3 overflow-hidden relative overflow-group group/btn"
                      >
                        <span className="relative z-10">Play Now</span>
                        <Play size={18} fill="currentColor" className="relative z-10 group-hover/btn:translate-x-1 transition-transform" />
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-600 opacity-0 group-hover/btn:opacity-100 transition-opacity z-0" />
                      </button>
                    </div>

                    {/* Mini Leaderboard preview */}
                    {leaderboards[quiz.id] && leaderboards[quiz.id].length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-200/60">
                        <div className="flex items-center gap-2 mb-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                          <BarChart3 size={14} className="text-indigo-400" /> Current Leaders
                        </div>
                        <div className="flex -space-x-4">
                          {leaderboards[quiz.id].map((lb, idx) => (
                            <div key={idx} className="relative group/avatar cursor-pointer">
                              <img 
                                src={lb.photo} 
                                alt={lb.name}
                                className="w-12 h-12 rounded-full border-[3px] border-white shadow-lg relative z-10 transition-transform duration-300 group-hover/avatar:z-20 group-hover/avatar:scale-125 group-hover/avatar:-translate-y-2 ring-2 ring-transparent group-hover/avatar:ring-indigo-100"
                              />
                              <div className="absolute opacity-0 group-hover/avatar:opacity-100 bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-xl -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 shadow-xl pointer-events-none z-30 scale-95 group-hover/avatar:scale-100">
                                {lb.name}
                                <span className="text-indigo-400 ml-2">{lb.score}</span>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* PIN Prompt Modal */}
      <AnimatePresence>
        {pinPromptQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0, x: pinError ? [-10, 10, -10, 10, 0] : 0 }}
              transition={{ x: { duration: 0.4 } }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative"
            >
              <button 
                onClick={() => setPinPromptQuiz(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Lock size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-800 text-center mb-2">Private Quiz</h3>
              <p className="text-slate-500 text-center font-medium mb-8">
                Enter the secret PIN to unlock "{pinPromptQuiz.title}".
              </p>
              
              <input
                type="password"
                placeholder="Enter PIN..."
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitPin()}
                autoFocus
                className={`w-full p-4 text-center text-xl font-black tracking-widest rounded-xl border-2 outline-none transition-all mb-4 text-slate-800 ${pinError ? 'border-red-500 bg-red-50 focus:border-red-600' : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500'}`}
              />
              
              {pinError && <p className="text-red-500 text-center font-bold text-sm mb-4">Incorrect PIN. Try again.</p>}
              
              <button
                onClick={submitPin}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-600/20 transition-all text-lg"
              >
                Unlock & Play
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
