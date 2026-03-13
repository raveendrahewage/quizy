import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
} from "firebase/firestore";
import {
  Trophy,
  LogOut,
  CheckCircle2,
  ListChecks,
  CheckSquare,
  BarChart3,
  Settings,
  Plus,
  Square,
  Trash2,
  X,
  Clock,
} from "lucide-react";
import confetti from "canvas-confetti";

const ADMIN_EMAIL = "hewagerv@gmail.com"; // 👈 CHANGE THIS TO YOUR EMAIL

export default function App() {
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [step, setStep] = useState(0);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // Format: { questionIdx: [selectedIndices] }
  const [timeLeft, setTimeLeft] = useState(15);
  const [showAdmin, setShowAdmin] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => setUser(u));
    const unsubQ = onSnapshot(query(collection(db, "questions")), (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    const unsubL = onSnapshot(
      query(collection(db, "responses"), orderBy("score", "desc"), limit(8)),
      (snap) => {
        setLeaderboard(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
    );
    return () => {
      unsubQ();
      unsubL();
    };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (step === 1 && timeLeft > 0) {
      timerRef.current = setInterval(
        () => setTimeLeft((prev) => prev - 1),
        1000,
      );
    } else if (timeLeft === 0 && step === 1) {
      handleNext();
    }
    return () => clearInterval(timerRef.current);
  }, [timeLeft, step]);

  const handleLogin = () => signInWithPopup(auth, googleProvider);

  const handleSelection = (idx) => {
    const isMulti = questions[currentQ].isMulti;
    let currentSelection = answers[currentQ] || [];

    if (isMulti) {
      if (currentSelection.includes(idx)) {
        currentSelection = currentSelection.filter((i) => i !== idx);
      } else {
        currentSelection = [...currentSelection, idx];
      }
      setAnswers({ ...answers, [currentQ]: currentSelection });
    } else {
      setAnswers({ ...answers, [currentQ]: [idx] });
      setTimeout(() => handleNext(), 300);
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

      // Scoring: (Correct choices selected / Total correct choices) - (Wrong choices selected / Total correct choices)
      const correctHits = userAns.filter((a) => correctAns.includes(a)).length;
      const wrongHits = userAns.filter((a) => !correctAns.includes(a)).length;

      const questionScore = Math.max(
        0,
        (correctHits - wrongHits) / correctAns.length,
      );
      totalScore += questionScore;
    });

    const finalPoints = Math.round(totalScore * 1000); // Scale to points

    await addDoc(collection(db, "responses"), {
      uid: user.uid,
      name: user.displayName,
      photo: user.photoURL,
      score: finalPoints,
      timestamp: new Date(),
    });

    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    setStep(2);
  };

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-violet-700 p-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full"
        >
          <Trophy className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
            Quizy
          </h1>
          <p className="text-slate-500 mb-8">Ready to climb the leaderboard?</p>
          <button
            onClick={handleLogin}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
          >
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <AnimatePresence>
        {showAdmin && (
          <AdminPanel
            questions={questions}
            onClose={() => setShowAdmin(false)}
          />
        )}
      </AnimatePresence>

      <nav className="bg-white border-b p-4 flex justify-between items-center px-8">
        <div className="flex items-center gap-2 font-black text-indigo-600 text-xl tracking-tighter">
          <Trophy /> QUIZY
        </div>
        <div className="flex items-center gap-4">
          {/* Admin Settings Button - Only shows if user is Admin */}
          {user.email === ADMIN_EMAIL && (
            <button
              onClick={() => setShowAdmin(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
              title="Admin Settings"
            >
              <Settings size={20} />
            </button>
          )}

          {/* Logout Button - Always shows for logged in users */}
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-sm border text-center">
              <h1 className="text-4xl font-black mb-4">
                Ready, {user.displayName.split(" ")[0]}?
              </h1>
              <p className="text-slate-500 mb-8 font-medium italic">
                15 seconds per question. Multi-select questions earn partial
                points!
              </p>
              <button
                onClick={() => {
                  setStep(1);
                  setTimeLeft(15);
                }}
                className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl"
              >
                Start Quiz
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full font-black">
                  <Clock size={18} /> {timeLeft}s
                </div>
                <div className="text-sm font-bold text-slate-400">
                  Question {currentQ + 1} of {questions.length}
                </div>
              </div>

              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-3xl shadow-lg border relative overflow-hidden"
              >
                {questions[currentQ].isMulti && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                    <ListChecks size={12} /> Multi-Select
                  </div>
                )}
                <h2 className="text-2xl font-bold mb-8">
                  {questions[currentQ].text}
                </h2>
                <div className="grid gap-3">
                  {questions[currentQ].options.map((opt, i) => {
                    const isSelected = (answers[currentQ] || []).includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelection(i)}
                        className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all font-bold text-left ${isSelected ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200"}`}
                      >
                        {questions[currentQ].isMulti ? (
                          isSelected ? (
                            <CheckSquare className="text-indigo-600" />
                          ) : (
                            <Square className="text-slate-300" />
                          )
                        ) : null}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {questions[currentQ].isMulti && (
                  <button
                    onClick={handleNext}
                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg"
                  >
                    Confirm Selection
                  </button>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl text-center shadow-sm">
              <CheckCircle2
                size={80}
                className="text-emerald-500 mx-auto mb-4"
              />
              <h2 className="text-4xl font-black mb-2">Quiz Complete!</h2>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border h-fit">
          <div className="flex items-center gap-2 mb-6 font-black text-slate-800 text-lg uppercase tracking-tight">
            <BarChart3 className="text-indigo-600" /> Real-time Rankings
          </div>
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <motion.div
                layout
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border"
              >
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-300 text-sm">
                    #{i + 1}
                  </span>
                  <img
                    src={entry.photo}
                    className="w-8 h-8 rounded-full border border-white shadow-sm"
                    alt="avatar"
                  />
                  <span className="font-bold text-slate-700 text-xs truncate w-20">
                    {entry.name}
                  </span>
                </div>
                <span className="font-black text-indigo-600">
                  {entry.score}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- ADMIN PANEL COMPONENT ---
function AdminPanel({ questions, onClose }) {
  const [newQ, setNewQ] = useState({
    text: "",
    options: ["", "", "", ""],
    correct: [],
    isMulti: false,
  });

  const toggleCorrect = (idx) => {
    if (newQ.isMulti) {
      const updated = newQ.correct.includes(idx)
        ? newQ.correct.filter((i) => i !== idx)
        : [...newQ.correct, idx];
      setNewQ({ ...newQ, correct: updated });
    } else {
      setNewQ({ ...newQ, correct: [idx] });
    }
  };

  const addQuestion = async () => {
    if (!newQ.text || newQ.correct.length === 0)
      return alert(
        "Fill out the question and mark at least one correct answer.",
      );
    await addDoc(collection(db, "questions"), newQ);
    setNewQ({
      text: "",
      options: ["", "", "", ""],
      correct: [],
      isMulti: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-black">Admin Panel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full"
          >
            <X />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <h3 className="font-black uppercase text-slate-400 text-xs tracking-widest">
              New Question
            </h3>
            <div className="space-y-4">
              <input
                value={newQ.text}
                onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                placeholder="Question text..."
                className="w-full p-4 rounded-xl bg-slate-100 font-bold"
              />

              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={newQ.isMulti}
                  onChange={(e) =>
                    setNewQ({ ...newQ, isMulti: e.target.checked, correct: [] })
                  }
                  className="w-5 h-5 accent-indigo-600"
                />
                <label className="text-sm font-black text-indigo-700">
                  Multiple Answer Question?
                </label>
              </div>

              {newQ.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={opt}
                    onChange={(e) => {
                      const o = [...newQ.options];
                      o[i] = e.target.value;
                      setNewQ({ ...newQ, options: o });
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 p-3 rounded-xl border font-semibold text-sm"
                  />
                  <button
                    onClick={() => toggleCorrect(i)}
                    className={`w-12 rounded-xl flex items-center justify-center ${newQ.correct.includes(i) ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              ))}
              <button
                onClick={addQuestion}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center justify-center gap-2"
              >
                <Plus /> Save to Bank
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-black uppercase text-slate-400 text-xs tracking-widest">
              Question Bank ({questions.length})
            </h3>
            <div className="space-y-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3 bg-slate-50 rounded-xl border flex justify-between items-center"
                >
                  <span className="text-sm font-bold truncate w-48">
                    {q.text}
                  </span>
                  <button
                    onClick={() => deleteDoc(doc(db, "questions", q.id))}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
