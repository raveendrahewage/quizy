import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { X, Plus, Trash2, Edit3, Save, ChevronRight, Settings2, Rocket, Lock, Globe, Link } from "lucide-react";

export default function AdminDashboard({ user, onClose }) {
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null); // The quiz being edited (questions level)
  
  const [newQuizData, setNewQuizData] = useState({ title: "", description: "", isPrivate: false, pin: "" });
  
  // Question Editor State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [newQ, setNewQ] = useState({
    text: "",
    options: ["", "", "", ""],
    correct: [],
    isMulti: false,
  });

  // Fetch quizzes created by the current user
  useEffect(() => {
    if (!user?.uid) return;
    const qv = query(collection(db, "quizzes"), where("creatorId", "==", user.uid));
    const unsubQ = onSnapshot(qv, (snap) => {
      setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubQ();
  }, [user]);

  // Fetch questions when active quiz changes
  useEffect(() => {
    if (!activeQuiz) {
      setQuizQuestions([]);
      return;
    }
    const unsub = onSnapshot(collection(db, "questions"), (snap) => {
      const allQ = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuizQuestions(allQ.filter(q => q.quizId === activeQuiz.id));
    });
    return () => unsub();
  }, [activeQuiz]);

  const handleCreateQuiz = async () => {
    if (!newQuizData.title.trim()) return;
    if (newQuizData.isPrivate && !newQuizData.pin.trim()) {
      return alert("Please set a PIN for the private quiz.");
    }
    
    await addDoc(collection(db, "quizzes"), {
      title: newQuizData.title,
      description: newQuizData.description,
      isPrivate: newQuizData.isPrivate,
      pin: newQuizData.isPrivate ? newQuizData.pin.trim() : null,
      createdAt: new Date(),
      isPublished: true,
      creatorId: user.uid,
      creatorName: user.displayName
    });
    setNewQuizData({ title: "", description: "", isPrivate: false, pin: "" });
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Delete this quiz and all its questions?")) return;
    
    // Quick Batch delete (In production, consider server-side cloud function)
    const batch = writeBatch(db);
    batch.delete(doc(db, "quizzes", quizId));
    
    quizQuestions.forEach(q => {
      if(q.quizId === quizId) batch.delete(doc(db, "questions", q.id));
    });

    await batch.commit();
    if (activeQuiz?.id === quizId) setActiveQuiz(null);
  };

  // --- Question Management ---
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
      return alert("Fill out the question and mark at least one correct answer.");
    
    await addDoc(collection(db, "questions"), {
      ...newQ,
      quizId: activeQuiz.id
    });
    
    setNewQ({
      text: "",
      options: ["", "", "", ""],
      correct: [],
      isMulti: false,
    });
  };

  /**  EMERGENCY MIGRATION SCRIPT  */
  // This will move all questions without a quizId into a newly created default quiz
  const runMigration = async () => {
    if (!window.confirm("Run database migration? This groups orphaned questions into a Default Quiz.")) return;
    try {
      // 1. Fetch all questions
      const { getDocs } = await import("firebase/firestore"); // Import dynamically
      const qSnap = await getDocs(collection(db, "questions"));
      const allQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const orphaned = allQuestions.filter(q => !q.quizId);
      
      if (orphaned.length === 0) {
        alert("No orphaned questions found! Migration not needed.");
        return;
      }
      
      // 2. Create a Default Quiz
      const defaultQuizRef = await addDoc(collection(db, "quizzes"), {
        title: "Legacy Quiz (Migrated)",
        description: "Contains all the classic questions from before the update.",
        createdAt: new Date(),
        isPublished: true
      });
      
      // 3. Update all orphaned questions to point to this new quiz
      const batch = writeBatch(db);
      orphaned.forEach(q => {
        batch.update(doc(db, "questions", q.id), { quizId: defaultQuizRef.id });
      });
      
      await batch.commit();
      alert(`Successfully migrated ${orphaned.length} questions to the Legacy Quiz!`);
    } catch (e) {
      console.error(e);
      alert("Migration failed: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg">
              <Settings2 size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Quiz Studio</h2>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">Create and manage your own quizzes.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-sm">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar: Quiz List */}
          <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col overflow-hidden shrink-0">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Create New Quiz</h3>
              <div className="space-y-3">
                <input
                  value={newQuizData.title}
                  onChange={(e) => setNewQuizData({ ...newQuizData, title: e.target.value })}
                  placeholder="Quiz Title"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-100 transition-all"
                />
                <input
                  value={newQuizData.description}
                  onChange={(e) => setNewQuizData({ ...newQuizData, description: e.target.value })}
                  placeholder="Short Description"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 outline-none font-medium text-sm text-slate-800 dark:text-slate-300 transition-all"
                />
                
                <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={newQuizData.isPrivate}
                    onChange={(e) => setNewQuizData({ ...newQuizData, isPrivate: e.target.checked })}
                    className="w-5 h-5 accent-indigo-600 rounded"
                  />
                  <div className="flex items-center gap-2">
                    {newQuizData.isPrivate ? <Lock size={16} className="text-amber-500"/> : <Globe size={16} className="text-emerald-500"/>}
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{newQuizData.isPrivate ? "Private Mode" : "Public Mode"}</span>
                  </div>
                </label>

                {newQuizData.isPrivate && (
                  <input
                    value={newQuizData.pin}
                    onChange={(e) => setNewQuizData({ ...newQuizData, pin: e.target.value })}
                    placeholder="Enter a secret PIN..."
                    maxLength={10}
                    className="w-full p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/10 focus:bg-white dark:focus:bg-slate-700 focus:border-amber-500 outline-none font-bold text-slate-800 dark:text-slate-100 transition-all placeholder:text-amber-300 dark:placeholder:text-amber-900/50"
                  />
                )}

                <button
                  onClick={handleCreateQuiz}
                  className="w-full py-3 bg-slate-900 dark:bg-indigo-600 hover:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={18} /> Create Quiz
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Quiz Library ({quizzes.length})</h3>
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => setActiveQuiz(q)}
                  className={`
                    p-4 rounded-2xl cursor-pointer transition-all border-2 flex items-center justify-between group
                    ${activeQuiz?.id === q.id ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500" : "bg-white dark:bg-slate-800 border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"}
                  `}
                >
                  <div className="overflow-hidden pr-3 flex items-center gap-2">
                    {q.isPrivate && <Lock size={14} className="text-amber-500 shrink-0" />}
                    <h4 className={`font-black truncate ${activeQuiz?.id === q.id ? "text-indigo-900 dark:text-indigo-300" : "text-slate-700 dark:text-slate-300"}`}>{q.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(`${window.location.origin}/?quiz=${q.id}`);
                        alert("Invite Link Copied!");
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${activeQuiz?.id === q.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-600'}`}
                      title="Copy Link"
                    >
                      <Link size={14} />
                    </button>
                    <ChevronRight size={18} className={`${activeQuiz?.id === q.id ? "text-indigo-500" : "text-slate-300"}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto">
              <button 
                onClick={runMigration}
                className="w-full py-2 bg-amber-100 dark:bg-amber-900/20 hover:bg-amber-200 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-400 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                Migrate Legacy Data
              </button>
            </div>
          </div>

          {/* Main Area: Question Editor */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900 p-8">
            {!activeQuiz ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                <Edit3 size={64} className="mb-4 text-slate-200 dark:text-slate-800" />
                <p className="text-xl font-bold">Select a quiz to edit its questions</p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                <div className="flex justify-between items-start mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">{activeQuiz.title}</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">{quizQuestions.length} Questions configured</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuiz(activeQuiz.id)}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors"
                  >
                    <Trash2 size={18} /> Delete Quiz
                  </button>
                </div>

                <div className="grid lg:grid-cols-2 gap-10">
                  {/* Add New Question Form */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black">1</div>
                      <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">Add Question</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <textarea
                        value={newQ.text}
                        onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                        placeholder="Type the question here..."
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 focus:border-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-100 min-h-[100px] resize-y"
                      />

                      <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={newQ.isMulti}
                          onChange={(e) => setNewQ({ ...newQ, isMulti: e.target.checked, correct: [] })}
                          className="w-5 h-5 accent-indigo-600 rounded"
                        />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Multiple correct answers?</span>
                      </label>

                      <div className="space-y-3">
                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Answers (Check the correct ones)</p>
                        {newQ.options.map((opt, i) => (
                          <div key={i} className={`flex gap-3 items-center rounded-xl p-2 border-2 transition-colors ${newQ.correct.includes(i) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50'}`}>
                            <div className="font-black text-slate-300 dark:text-slate-600 w-6 text-center">{String.fromCharCode(65 + i)}</div>
                            <input
                              value={opt}
                              onChange={(e) => {
                                const o = [...newQ.options];
                                o[i] = e.target.value;
                                setNewQ({ ...newQ, options: o });
                              }}
                              placeholder={`Option text...`}
                              className="flex-1 p-2 bg-transparent outline-none font-bold text-slate-700 dark:text-slate-200"
                            />
                            <button
                              onClick={() => toggleCorrect(i)}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors shadow-sm ${newQ.correct.includes(i) ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-200 dark:text-slate-600 hover:border-emerald-200 hover:text-emerald-500"}`}
                            >
                              <Save size={18} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={addQuestion}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={20} /> Add to Quiz
                      </button>
                    </div>
                  </div>

                  {/* Existing Questions List */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-black">2</div>
                      <h3 className="font-black text-lg text-slate-800 dark:text-slate-200">Current Questions Focus</h3>
                    </div>

                    <div className="space-y-3">
                      {quizQuestions.length === 0 && (
                        <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                          <Rocket className="mx-auto text-slate-300 mb-2" size={32} />
                          <p className="font-bold text-slate-500">No questions added yet.<br/>Start building the quiz!</p>
                        </div>
                      )}
                      
                      {quizQuestions.map((q, i) => (
                        <div key={q.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm group hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors relative">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="text-xs font-black text-indigo-500 mb-1">Question {i + 1}</div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight">{q.text}</h4>
                            </div>
                            <button
                              onClick={() => deleteDoc(doc(db, "questions", q.id))}
                              className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {q.correct.map(cIdx => (
                              <span key={cIdx} className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 px-2 py-1 rounded">
                                Option {String.fromCharCode(65 + cIdx)} correct
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
