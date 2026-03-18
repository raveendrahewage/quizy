import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { collection, query, orderBy, onSnapshot, limit, addDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { CheckCircle2, ListChecks, Square, CheckSquare, Clock, ArrowLeft, Trophy, Crown } from "lucide-react";
import confetti from "canvas-confetti";

export default function QuizPlayer({ user, quiz, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [step, setStep] = useState(0); // 0 = start, 1 = playing, 2 = complete
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [score, setScore] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    // Fetch questions for this quiz
    const unsubQ = onSnapshot(query(collection(db, "questions"), where("quizId", "==", quiz.id)), (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Fetch leaderboard for this quiz
    const unsubL = onSnapshot(
      query(collection(db, "responses"), where("quizId", "==", quiz.id), orderBy("score", "desc"), limit(10)),
      (snap) => {
        setLeaderboard(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    return () => {
      unsubQ();
      unsubL();
    };
  }, [quiz.id]);

  useEffect(() => {
    if (step === 1 && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && step === 1) {
      handleNext();
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, step]);

  const handleSelection = (idx) => {
    const q = questions[currentQ];
    let currentSelection = answers[currentQ] || [];

    if (q.isMulti) {
      if (currentSelection.includes(idx)) {
        currentSelection = currentSelection.filter((i) => i !== idx);
      } else {
        currentSelection = [...currentSelection, idx];
      }
      setAnswers({ ...answers, [currentQ]: currentSelection });
    } else {
      setAnswers({ ...answers, [currentQ]: [idx] });
      setTimeout(() => handleNext(), 400); // Small delay for UX
    }
  };

  const handleNext = () => {
    clearInterval(timerRef.current);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setTimeLeft(15);
    } else {
      submitQuiz();
    }
  };

  const submitQuiz = async () => {
    let totalScore = 0;
    questions.forEach((q, i) => {
      const userAns = answers[i] || [];
      const correctAns = Array.isArray(q.correct) ? q.correct : [q.correct];

      const correctHits = userAns.filter((a) => correctAns.includes(a)).length;
      const wrongHits = userAns.filter((a) => !correctAns.includes(a)).length;

      const questionScore = Math.max(0, (correctHits - wrongHits) / correctAns.length);
      totalScore += questionScore;
    });

    const finalPoints = Math.round((totalScore / questions.length) * 1000 * questions.length); // Adjusted scale

    setScore(finalPoints);

    try {
      await addDoc(collection(db, "responses"), {
        uid: user.uid,
        name: user.displayName,
        photo: user.photoURL,
        score: finalPoints,
        quizId: quiz.id,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("Error saving score:", e);
    }

    confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#4f46e5', '#8b5cf6', '#06b6d4'] });
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-6 md:p-8 transition-colors duration-300">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 w-fit"
      >
        <ArrowLeft size={18} /> Back to Quizzes
      </button>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div 
                key="start"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <h1 className="text-4xl md:text-5xl font-black mb-6 text-slate-800 dark:text-slate-100 tracking-tight">
                  {quiz.title}
                </h1>
                
                {questions.length === 0 ? (
                  <div className="p-8 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-3xl border border-amber-200 dark:border-amber-800/50 font-bold text-lg inline-block">
                    This quiz has no questions yet!
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 dark:text-slate-400 mb-10 text-xl max-w-lg mx-auto leading-relaxed">
                      {questions.length} questions. 15 seconds per question. 
                      Multi-select questions earn partial points!
                    </p>
                    <button
                      onClick={() => {
                        setStep(1);
                        setTimeLeft(15);
                      }}
                      className="px-14 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto"
                    >
                      Start Challenge <Trophy size={24} />
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div 
                key="play"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 relative overflow-hidden flex flex-col min-h-[500px]"
              >
                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 absolute top-0 left-0">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                    initial={{ width: `${(currentQ / questions.length) * 100}%` }}
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>

                <div className="p-10 flex-1 flex flex-col">
                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-10 mt-4">
                    <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black shadow-sm transition-colors border ${
                      timeLeft <= 5 ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}>
                      <Clock size={20} className={timeLeft <= 5 ? "animate-pulse" : ""} /> 
                      <span className="text-xl">{timeLeft}s</span>
                    </div>
                    <div className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full border border-slate-100 dark:border-slate-700">
                      Q {currentQ + 1} / {questions.length}
                    </div>
                  </div>

                  {/* Question Area */}
                  <div className="relative mb-10">
                    {questions[currentQ].isMulti && (
                      <div className="absolute -top-10 left-0 flex items-center gap-1.5 text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                        <ListChecks size={14} /> Multiple Answers
                      </div>
                    )}
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                      {questions[currentQ].text}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className="grid gap-4 mt-auto">
                    {questions[currentQ].options.map((opt, i) => {
                      if (!opt) return null; // Skip empty options
                      const isSelected = (answers[currentQ] || []).includes(i);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSelection(i)}
                          className={`
                            group flex items-center gap-5 p-5 md:p-6 rounded-2xl border-[3px] transition-all duration-300 font-bold text-left text-lg
                            ${isSelected 
                              ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200 shadow-md shadow-indigo-100 dark:shadow-indigo-900/20 translate-x-2" 
                              : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-sm"
                            }
                          `}
                        >
                          {questions[currentQ].isMulti ? (
                            <div className={`
                              flex items-center justify-center p-1 rounded-xl transition-colors
                              ${isSelected ? "text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm" : "text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"}
                            `}>
                              {isSelected ? <CheckSquare size={24} className="fill-current text-white dark:text-slate-900 stroke-indigo-600 dark:stroke-indigo-400" /> : <Square size={24} />}
                            </div>
                          ) : (
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                              ${isSelected ? "border-indigo-600 dark:border-indigo-400 bg-indigo-600 dark:bg-indigo-500 text-white" : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 group-hover:border-indigo-300 dark:group-hover:border-indigo-600"}
                            `}>
                              <span className="text-xs">{String.fromCharCode(65 + i)}</span>
                            </div>
                          )}
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {questions[currentQ].isMulti && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={handleNext}
                      className="w-full mt-8 py-5 bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-indigo-600 dark:hover:bg-indigo-400 text-white rounded-2xl font-black shadow-lg shadow-slate-900/20 dark:shadow-indigo-500/10 transition-all text-lg"
                    >
                      Submit Selection
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] text-center shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-900/20 to-transparent pointer-events-none" />
                < Crown size={100} className="text-amber-400 mx-auto mb-6 drop-shadow-lg" />
                <h2 className="text-5xl font-black mb-4 text-slate-800 dark:text-slate-100">Quiz Complete!</h2>
                <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 my-8">
                  {score} <span className="text-2xl text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">pts</span>
                </div>
                <div className="flex gap-4 justify-center mt-10 relative z-10">
                  <button
                    onClick={() => {
                      setStep(0);
                      setCurrentQ(0);
                      setAnswers({});
                      setScore(0);
                    }}
                    className="px-8 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-colors"
                  >
                    Play Again
                  </button>
                  <button
                    onClick={onBack}
                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    Back to Menu
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Leaderboard */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-xl shadow-slate-200/40 dark:shadow-black/20 border border-slate-100 dark:border-slate-800 h-fit lg:sticky lg:top-8">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Trophy size={24} /> 
            </div>
            <div>
              <h3 className="font-black text-xl uppercase tracking-tight">Leaderboard</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-bold">{quiz.title}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {leaderboard.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">
                Be the first to play!
              </div>
            ) : (
              leaderboard.map((entry, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={entry.id}
                  className={`
                    flex items-center justify-between p-4 rounded-2xl border-2 transition-all
                    ${i === 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 shadow-sm" : 
                      i === 1 ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700" :
                      i === 2 ? "bg-orange-50/50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800/50" :
                      "bg-transparent border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                    }
                  `}
                >
                  <div className="flex items-center gap-4">
                    <span className={`font-black text-lg w-6 text-center
                      ${i === 0 ? "text-amber-500" : 
                        i === 1 ? "text-slate-400" :
                        i === 2 ? "text-orange-400" :
                        "text-slate-300"
                      }
                    `}>
                      {i + 1}
                    </span>
                    <img
                      src={entry.photo}
                      className="w-10 h-10 rounded-full shadow-sm"
                      alt="avatar"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200 truncate w-24">
                      {entry.name}
                    </span>
                  </div>
                  <span className={`font-black text-lg ${i === 0 ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {entry.score}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
