import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DATA_DOC = doc(db, "app", "data");

const DEFAULT_EXERCISES = [
  "Εκκίνηση / Στάση","Στροφές","Παρκάρισμα παράλληλο","Παρκάρισμα κάθετο",
  "Αντίστροφη","Κυκλικός κόμβος","Εθνική / Ταχύτητα","Προτεραιότητα / Σήματα",
  "Νυχτερινή οδήγηση","Αλλαγή λωρίδας","Φρενάρισμα έκτακτης ανάγκης","Κεκλιμένο επίπεδο",
].map(n => ({ name: n, reqNew: false, reqRetrain: false }));
const DEFAULT_ROUTES = [
  "Κέντρο πόλης","Αυτοκινητόδρομος","Παραλιακή","Ορεινή διαδρομή","Σχολικές ζώνες",
].map(n => ({ name: n, reqNew: false, reqRetrain: false }));

function today() { return new Date().toISOString().slice(0, 10); }

// Normalize old string-array data to {name, reqNew, reqRetrain} objects
function normalizeList(arr) {
  if (!arr) return [];
  return arr.map(it => typeof it === "string"
    ? { name: it, reqNew: false, reqRetrain: false }
    : { name: it.name, reqNew: !!it.reqNew, reqRetrain: !!it.reqRetrain });
}
function names(arr) { return normalizeList(arr).map(it => it.name); }

export default function App() {
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedStudentId, setSchedStudentId] = useState("");
  const [schedViewDate, setSchedViewDate] = useState(today());
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [editSchedId, setEditSchedId] = useState(null);
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [routes, setRoutes] = useState(DEFAULT_ROUTES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("home");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editLesson, setEditLesson] = useState(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editStudentJob, setEditStudentJob] = useState("");
  const [editStudentNotes, setEditStudentNotes] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentType, setNewStudentType] = useState("new");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentJob, setNewStudentJob] = useState("");
  const [newStudentNotes, setNewStudentNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [lessonDate, setLessonDate] = useState(today());
  const [lessonDuration, setLessonDuration] = useState(90);
  const [lessonExercises, setLessonExercises] = useState([]);
  const [lessonRoutes, setLessonRoutes] = useState([]);
  const [lessonNotes, setLessonNotes] = useState("");
  const [newExercise, setNewExercise] = useState("");
  const [newRoute, setNewRoute] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(DATA_DOC);
        if (snap.exists()) {
          const data = snap.data();
          setStudents(data.students || []);
          if (data.exercises) setExercises(normalizeList(data.exercises));
          if (data.routes) setRoutes(normalizeList(data.routes));
          if (data.schedule) setSchedule(data.schedule);
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  async function persist(s, ex, rt, sch) {
    setSaving(true);
    try { await setDoc(DATA_DOC, { students: s, exercises: ex, routes: rt, schedule: sch !== undefined ? sch : schedule }); }
    catch(e) { console.error(e); }
    setSaving(false);
  }

  function updateStudents(updater) {
    setStudents(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next, exercises, routes);
      return next;
    });
  }
  function updateExercises(newEx) { setExercises(newEx); persist(students, newEx, routes); }
  function updateRoutes(newRt) { setRoutes(newRt); persist(students, exercises, newRt); }
  function updateSchedule(newSch) { setSchedule(newSch); persist(students, exercises, routes, newSch); }

  function addScheduleEntry() {
    if (!schedDate || !schedTime || !schedStudentId) return;
    const stu = students.find(x => String(x.id) === String(schedStudentId));
    if (editSchedId) {
      updateSchedule(schedule.map(e => e.id === editSchedId
        ? { ...e, date: schedDate, time: schedTime, studentId: schedStudentId, studentName: stu ? stu.name : e.studentName }
        : e));
    } else {
      const entry = {
        id: Date.now(),
        date: schedDate,
        time: schedTime,
        studentId: schedStudentId,
        studentName: stu ? stu.name : "—",
      };
      updateSchedule([...schedule, entry]);
    }
    setSchedViewDate(schedDate);
    setSchedDate(""); setSchedTime(""); setSchedStudentId("");
    setShowSchedForm(false); setEditSchedId(null);
  }

  function startEditSchedule(e) {
    setSchedDate(e.date); setSchedTime(e.time); setSchedStudentId(e.studentId);
    setEditSchedId(e.id); setShowSchedForm(true);
  }

  function closeSchedForm() {
    setShowSchedForm(false); setEditSchedId(null);
    setSchedDate(""); setSchedTime(""); setSchedStudentId("");
  }

  function deleteScheduleEntry(id) {
    setConfirmDialog({ message: "Να διαγραφεί αυτό το ραντεβού από το πρόγραμμα;",
      onConfirm: () => updateSchedule(schedule.filter(e => e.id !== id)) });
  }

  function openStudentFromSchedule(studentId) {
    const stu = students.find(x => String(x.id) === String(studentId));
    if (stu) { setSelectedStudent(stu); setView("student"); }
    else alert("Ο μαθητής έχει διαγραφεί. Το ραντεβού παραμένει στο ιστορικό.");
  }

  function startAddStudent(type) {
    setNewStudentType(type);
    setNewStudentName(""); setNewStudentPhone(""); setNewStudentJob(""); setNewStudentNotes("");
    setDuplicateWarning(false);
    setView("addStudent");
  }

  function addStudent() {
    if (!newStudentName.trim()) return;
    const exists = students.some(st => st.name.toLowerCase() === newStudentName.trim().toLowerCase());
    if (exists) { setDuplicateWarning(true); return; }
    const st = { id: Date.now(), name: newStudentName.trim(), phone: newStudentPhone.trim(), job: newStudentJob.trim(), notes: newStudentNotes.trim(), type: newStudentType, lessons: [] };
    updateStudents(prev => [...prev, st]);
    setNewStudentName(""); setNewStudentPhone(""); setNewStudentJob(""); setNewStudentNotes("");
    setView("home");
  }

  function startEditStudent(s) {
    setEditStudentName(s.name); setEditStudentPhone(s.phone||"");
    setEditStudentJob(s.job||""); setEditStudentNotes(s.notes||"");
    setView("editStudent");
  }

  function saveStudent() {
    updateStudents(prev => prev.map(s => {
      if (s.id !== selectedStudent.id) return s;
      const updated = { ...s, name: editStudentName.trim(), phone: editStudentPhone.trim(), job: editStudentJob.trim(), notes: editStudentNotes.trim() };
      setSelectedStudent(updated); return updated;
    }));
    setView("student");
  }

  function deleteStudent(id) {
    setConfirmDialog({ message: "Να διαγραφεί οριστικά ο μαθητής με όλα τα μαθήματά του;",
      onConfirm: () => { updateStudents(prev => prev.filter(s => s.id !== id)); setView("home"); }
    });
  }

  function openStudent(s) { setSelectedStudent(s); setView("student"); }

  function startAddLesson() {
    setLessonDate(today()); setLessonDuration(90); setLessonExercises([]);
    setLessonRoutes([]); setLessonNotes(""); setEditLesson(null); setView("addLesson");
  }

  function startEditLesson(lesson) {
    setLessonDate(lesson.date); setLessonDuration(lesson.duration);
    setLessonExercises(lesson.exercises); setLessonRoutes(lesson.routes);
    setLessonNotes(lesson.notes); setEditLesson(lesson.id); setView("addLesson");
  }

  function saveLesson() {
    const lesson = { id: editLesson||Date.now(), date: lessonDate, duration: lessonDuration, exercises: lessonExercises, routes: lessonRoutes, notes: lessonNotes };
    updateStudents(prev => prev.map(s => {
      if (s.id !== selectedStudent.id) return s;
      const lessons = editLesson ? s.lessons.map(l => l.id===editLesson ? lesson : l) : [...s.lessons, lesson];
      const updated = { ...s, lessons }; setSelectedStudent(updated); return updated;
    }));
    setView("student");
  }

  function deleteLesson(lid) {
    setConfirmDialog({ message: "Να διαγραφεί οριστικά αυτό το μάθημα;",
      onConfirm: () => { updateStudents(prev => prev.map(s => {
        if (s.id !== selectedStudent.id) return s;
        const lessons = s.lessons.filter(l => l.id !== lid);
        const updated = { ...s, lessons }; setSelectedStudent(updated); return updated;
      })); }
    });
  }

  function toggleArr(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }

  const StatusBadge = () => saving ? <div style={s.savingBadge}>💾 Αποθήκευση...</div> : null;

  if (loading) return (
    <div style={{...s.page, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh"}}>
      <div style={{textAlign:"center", color:"#888"}}>
        <div style={{fontSize:40}}>🚗</div>
        <div style={{marginTop:12, fontSize:15}}>Φόρτωση δεδομένων...</div>
      </div>
    </div>
  );

  if (confirmDialog) return (
    <div style={s.page}>
      <div style={s.overlay}>
        <div style={s.dialog}>
          <div style={s.dialogIcon}>⚠️</div>
          <div style={s.dialogMsg}>{confirmDialog.message}</div>
          <div style={s.dialogBtns}>
            <button style={s.dialogCancel} onClick={() => { if (confirmDialog.onCancel) confirmDialog.onCancel(); setConfirmDialog(null); }}>
              {confirmDialog.cancelLabel || "Ακύρωση"}
            </button>
            <button style={s.dialogConfirm} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>
              {confirmDialog.confirmLabel || "Διαγραφή"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === "home") return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}>
        <span style={s.logo}>🚗</span>
        <div style={{flex:1}}><div style={s.appTitle}>Οδηγώ & Μαθαίνω</div><div style={s.appSub}>Διαχείριση Μαθητών</div></div>
        <StatusBadge />
        <button style={s.settingsBtn} onClick={() => setView("schedule")}>📅</button>
        <button style={s.settingsBtn} onClick={() => setView("settings")}>⚙️</button>
      </div></div>
      <div style={s.container}>
        <div style={{position:"relative"}}>
          <div style={s.searchBox}>
            <span style={s.searchIcon}>🔍</span>
            <input style={{...s.searchInput, paddingRight: searchQuery ? 28 : 0}} placeholder="Αναζήτηση μαθητή..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
          </div>
          {searchQuery && <button style={s.searchClear} onClick={() => setSearchQuery("")}>✕</button>}
        </div>
        {students.length === 0 && <div style={s.empty}><div style={{fontSize:48}}>🛣️</div><div style={s.emptyTitle}>Δεν έχεις μαθητές ακόμα</div><div style={s.emptyText}>Πρόσθεσε τον πρώτο σου μαθητή παρακάτω</div></div>}
        {searchQuery && students.filter(st => st.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
          <div style={s.empty}><div style={{fontSize:36}}>🔍</div><div style={s.emptyText}>Δεν βρέθηκε μαθητής</div></div>
        )}
        {students.filter(st => st.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a,b) => a.name.localeCompare(b.name, 'el')).map(st => (
          <div key={st.id} style={s.studentCard} onClick={() => openStudent(st)}>
            <div style={s.studentAvatar}>{st.name.charAt(0).toUpperCase()}</div>
            <div style={s.studentInfo}>
              <div style={s.studentName}>{st.name} {st.type === "retrain" && <span style={s.typeBadge}>🔄 Μετεκπαίδευση</span>}</div>
              {st.phone && <div style={s.studentPhone}>{st.phone}</div>}
              <div style={s.studentMeta}>{st.lessons.length} μαθήματα</div>
            </div>
            <span style={s.chevron}>›</span>
          </div>
        ))}
        <button style={s.fab} onClick={() => startAddStudent("new")}>+ Νέος Μαθητής</button>
        <button style={s.fabSecondary} onClick={() => startAddStudent("retrain")}>+ Μετεκπαίδευση</button>
        {students.length > 0 && (
          <div style={s.totalBox}>
            <span style={s.totalLbl}>Σύνολο μαθητών</span>
            <span style={s.totalNum}>{students.length}</span>
          </div>
        )}
      </div>
    </div>
  );

  if (view === "addStudent") return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={() => setView("home")}>‹ Πίσω</button><div style={s.appTitle}>{newStudentType === "retrain" ? "Νέα Μετεκπαίδευση" : "Νέος Μαθητής"}</div></div></div>
      <div style={s.container}><div style={s.formCard}>
        <label style={s.label}>Ονοματεπώνυμο</label>
        <input style={{...s.input, borderColor: duplicateWarning ? "#c62828" : "#e0e0e0"}} placeholder="π.χ. Γιώργος Παπαδόπουλος" value={newStudentName} onChange={e => { setNewStudentName(e.target.value); setDuplicateWarning(false); }}/>
        {duplicateWarning && <div style={{color:"#c62828", fontSize:13, fontWeight:600}}>⚠️ Υπάρχει ήδη μαθητής με αυτό το όνομα. Διαφοροποίησέ το λίγο (π.χ. προσθέσε αρχικό επωνύμου).</div>}
        <label style={s.label}>Τηλέφωνο (προαιρετικό)</label>
        <input style={s.input} placeholder="π.χ. 6901234567" value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)}/>
        <label style={s.label}>Επάγγελμα (προαιρετικό)</label>
        <input style={s.input} placeholder="π.χ. Φοιτητής, Δάσκαλος..." value={newStudentJob} onChange={e => setNewStudentJob(e.target.value)}/>
        <label style={s.label}>Σημειώσεις (προαιρετικό)</label>
        <textarea style={{...s.input, height:70, resize:"vertical"}} placeholder="π.χ. Αγχώδης..." value={newStudentNotes} onChange={e => setNewStudentNotes(e.target.value)}/>
        <button style={s.btnPrimary} onClick={addStudent}>Αποθήκευση</button>
      </div></div>
    </div>
  );

  if (view === "student" && selectedStudent) {
    const st = selectedStudent;
    const sorted = [...st.lessons].sort((a,b) => b.date.localeCompare(a.date));
    return (
      <div style={s.page}>
        <div style={s.header}><div style={s.headerInner}>
          <button style={s.back} onClick={() => setView("home")}>‹ Πίσω</button>
          <div style={{flex:1}}>
            <div style={s.appTitle}>{st.name}</div>
            {st.phone && <div style={s.appSub}>{st.phone}</div>}
            {st.job && <div style={s.appSub}>💼 {st.job}</div>}
          </div>
          <StatusBadge />
        </div></div>
        <div style={s.container}>
          {st.notes && <NotesToggle notes={st.notes} />}
          <div style={s.summaryRow}>
            <div style={s.summaryBox}><div style={s.summaryNum}>{st.lessons.length}</div><div style={s.summaryLbl}>Μαθήματα</div></div>
            <div style={s.summaryBox}><div style={s.summaryNum}>{st.lessons.reduce((a,l) => a+l.duration, 0)}</div><div style={s.summaryLbl}>Συνολικά λεπτά</div></div>
          </div>
          {sorted.length === 0 && <div style={s.empty}><div style={{fontSize:36}}>📋</div><div style={s.emptyText}>Δεν υπάρχουν μαθήματα ακόμα</div></div>}
          {sorted.map((l, idx) => (
            <div key={l.id} style={s.lessonCard}>
              <div style={s.lessonTop}><div>
                <div style={s.lessonDate}>{formatDate(l.date)}</div>
                <div style={s.lessonNum}>Αρ. Μαθήματος: {sorted.length - idx}</div>
                <div style={s.lessonDur}>{l.duration} λεπτά</div>
              </div></div>
              {l.exercises.length > 0 && <div style={s.tagSection}><div style={s.tagLabel}>Δοκιμασίες:</div><div style={s.tags}>{l.exercises.map(e => <span key={e} style={s.tag}>{e}</span>)}</div></div>}
              {l.routes.length > 0 && <div style={s.tagSection}><div style={s.tagLabel}>Διαδρομές:</div><div style={s.tags}>{l.routes.map(r => <span key={r} style={{...s.tag, background:"#e8f5e9", color:"#2e7d32"}}>{r}</span>)}</div></div>}
              {l.notes && <div>
                <div style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:3}}>ΣΗΜΕΙΩΣΕΙΣ:</div>
                <div style={s.lessonNotes}>{l.notes}</div>
              </div>}
              <div style={s.lessonActions}>
                <button style={s.editBtn} onClick={() => startEditLesson(l)}>Επεξεργασία</button>
                <button style={s.delBtn} onClick={() => deleteLesson(l.id)}>Διαγραφή</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            <button style={{...s.btnPrimary, marginTop:0}} onClick={startAddLesson}>+ Νέο Μάθημα</button>
            <ProgressCheck student={st} exercises={exercises} routes={routes} />
            <div style={{display:"flex", gap:10}}>
              <button style={{...s.editBtn, padding:"13px", fontSize:14, flex:1, borderRadius:12}} onClick={() => startEditStudent(st)}>✏️ Επεξεργασία Στοιχείων</button>
              <button style={{...s.btnDanger, marginTop:0, flex:1}} onClick={() => deleteStudent(st.id)}>Διαγραφή Μαθητή</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "editStudent" && selectedStudent) return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={() => setView("student")}>‹ Πίσω</button><div style={s.appTitle}>Επεξεργασία Στοιχείων</div></div></div>
      <div style={s.container}><div style={s.formCard}>
        <label style={s.label}>Ονοματεπώνυμο</label><input style={s.input} value={editStudentName} onChange={e => setEditStudentName(e.target.value)}/>
        <label style={s.label}>Τηλέφωνο</label><input style={s.input} value={editStudentPhone} onChange={e => setEditStudentPhone(e.target.value)}/>
        <label style={s.label}>Επάγγελμα</label><input style={s.input} value={editStudentJob} onChange={e => setEditStudentJob(e.target.value)}/>
        <label style={s.label}>Σημειώσεις</label><textarea style={{...s.input, height:70, resize:"vertical"}} value={editStudentNotes} onChange={e => setEditStudentNotes(e.target.value)}/>
        <button style={s.btnPrimary} onClick={saveStudent}>Αποθήκευση</button>
      </div></div>
    </div>
  );

  if (view === "addLesson") {
    function handleBack() {
      if (editLesson) {
        setConfirmDialog({
          message: "Να αποθηκευτούν οι αλλαγές;",
          confirmLabel: "Αποθήκευση",
          cancelLabel: "Απόρριψη",
          onConfirm: () => { saveLesson(); },
          onCancel: () => { setView("student"); }
        });
      } else {
        setView("student");
      }
    }
    return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={handleBack}>‹ Πίσω</button><div style={s.appTitle}>{editLesson ? "Επεξεργασία Μαθήματος" : "Νέο Μάθημα"}</div></div></div>
      <div style={s.container}><div style={s.formCard}>
        <label style={s.label}>Ημερομηνία</label><input type="date" style={s.input} value={lessonDate} onChange={e => setLessonDate(e.target.value)}/>
        <label style={s.label}>Διάρκεια (λεπτά)</label><input type="number" style={s.input} value={lessonDuration} onChange={e => setLessonDuration(Number(e.target.value))}/>
        <label style={s.label}>Δοκιμασίες</label>
        <div style={s.checkGrid}>{exercises.map(ex => <button key={ex.name} style={lessonExercises.includes(ex.name) ? s.checkActive : s.checkInactive} onClick={() => toggleArr(lessonExercises, setLessonExercises, ex.name)}>{ex.name}</button>)}</div>
        <label style={s.label}>Διαδρομές</label>
        <div style={s.checkGrid}>{routes.map(r => <button key={r.name} style={lessonRoutes.includes(r.name) ? {...s.checkActive, background:"#2e7d32"} : s.checkInactive} onClick={() => toggleArr(lessonRoutes, setLessonRoutes, r.name)}>{r.name}</button>)}</div>
        <label style={s.label}>Σημειώσεις</label>
        <textarea style={{...s.input, height:80, resize:"vertical"}} placeholder="π.χ. Καλή πρόοδος στις στροφές..." value={lessonNotes} onChange={e => setLessonNotes(e.target.value)}/>
        <button style={s.btnPrimary} onClick={saveLesson}>Αποθήκευση</button>
      </div></div>
    </div>
    );
  }

  if (view === "schedule") {
    function shiftDay(delta) {
      const d = new Date(schedViewDate + "T12:00:00");
      d.setDate(d.getDate() + delta);
      setSchedViewDate(d.toISOString().slice(0,10));
    }
    const dayEntries = schedule
      .filter(e => e.date === schedViewDate)
      .sort((a,b) => (a.time||"").localeCompare(b.time||""));
    const isToday = schedViewDate === today();
    const isPastDay = schedViewDate < today();

    return (
      <div style={s.page}>
        <div style={s.header}><div style={s.headerInner}>
          <button style={s.back} onClick={() => setView("home")}>‹ Πίσω</button>
          <div style={{flex:1}}><div style={s.appTitle}>📅 Πρόγραμμα</div></div>
          <StatusBadge />
          <button style={s.settingsBtn} onClick={() => { if (showSchedForm) { closeSchedForm(); } else { setSchedDate(schedViewDate); setEditSchedId(null); setShowSchedForm(true); } }}>{showSchedForm ? "✕" : "＋"}</button>
        </div></div>
        <div style={s.container}>

          {/* Day navigator */}
          <div style={s.dayNav}>
            <button style={s.dayNavBtn} onClick={() => shiftDay(-1)}>‹</button>
            <div style={{textAlign:"center", flex:1, position:"relative", marginRight:12}}>
              <div style={s.dayNavDate}>
                {formatDate(schedViewDate)}
                {dayEntries.length > 0 && <span style={s.countBadge}>{dayEntries.length}</span>}
              </div>
              {isToday && <div style={s.todayTag}>Σήμερα</div>}
            </div>
            <button style={s.dayNavBtn} onClick={() => shiftDay(1)}>›</button>
          </div>
          {!isToday && (
            <button style={s.todayBtn} onClick={() => setSchedViewDate(today())}>Επιστροφή στο Σήμερα</button>
          )}

          {/* New appointment form (collapsible) */}
          {showSchedForm && (
            <div style={s.formCard}>
              <div style={s.sectionTitle}>{editSchedId ? "Επεξεργασία Ραντεβού" : "Νέο Ραντεβού"}</div>
              <div style={s.row2}>
                <div style={{flex:1}}>
                  <label style={s.label}>Ημερομηνία</label>
                  <input type="date" style={s.input} value={schedDate} onChange={e => setSchedDate(e.target.value)}/>
                </div>
                <div style={{flex:1}}>
                  <label style={s.label}>Ώρα</label>
                  <input type="time" style={{...s.input, textAlign:"left"}} value={schedTime} onChange={e => setSchedTime(e.target.value)}/>
                </div>
              </div>
              <label style={s.label}>Μαθητής</label>
              <select style={s.input} value={schedStudentId} onChange={e => setSchedStudentId(e.target.value)}>
                <option value="">— Επίλεξε μαθητή —</option>
                {[...students].sort((a,b)=>a.name.localeCompare(b.name,'el')).map(st => (
                  <option key={st.id} value={st.id}>{st.name}{st.type === "retrain" ? " (Μετεκπ.)" : ""}</option>
                ))}
              </select>
              <div style={{display:"flex", gap:10, marginTop:12}}>
                <button style={{...s.btnPrimary, marginTop:0}} onClick={addScheduleEntry}>{editSchedId ? "Αποθήκευση" : "Προσθήκη"}</button>
                <button style={{...s.dialogCancel, flex:1}} onClick={closeSchedForm}>Ακύρωση</button>
              </div>
            </div>
          )}

          {/* Day entries */}
          {dayEntries.length === 0 && (
            <div style={s.empty}><div style={{fontSize:36}}>📭</div><div style={s.emptyText}>Κανένα μάθημα αυτή την ημέρα</div></div>
          )}
          {dayEntries.map(e => {
            const studentExists = students.some(x => String(x.id) === String(e.studentId));
            return (
              <div key={e.id} style={{...s.lessonCard, opacity: isPastDay ? 0.6 : 1}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0}}>
                    <div style={s.schedTimeBig}>{e.time}</div>
                    <div style={{display:"flex", alignItems:"center", gap:5, minWidth:0}}>
                      <span>👤</span>
                      <span style={studentExists ? s.schedStudent : s.schedStudentGone}
                        onClick={() => studentExists && openStudentFromSchedule(e.studentId)}>
                        {e.studentName}{!studentExists && " (διαγραμμένος)"}
                      </span>
                    </div>
                  </div>
                  <div style={{display:"flex", gap:6}}>
                    <button style={s.editSmallBtn} onClick={() => startEditSchedule(e)}>✏️</button>
                    <button style={s.delBtn} onClick={() => deleteScheduleEntry(e.id)}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === "settings") return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={() => setView("home")}>‹ Πίσω</button><div style={s.appTitle}>Ρυθμίσεις Λιστών</div></div></div>
      <div style={s.container}>
        <div style={s.formCard}><div style={s.sectionTitle}>🏁 Δοκιμασίες</div><EditableList items={exercises} onUpdate={updateExercises}/></div>
        <div style={s.formCard}><div style={s.sectionTitle}>🗺️ Διαδρομές</div><EditableList items={routes} onUpdate={updateRoutes}/></div>
      </div>
    </div>
  );

  return null;
}

function ProgressCheck({ student, exercises, routes }) {
  const [show, setShow] = useState(false);
  const type = student.type || "new";
  const reqKey = type === "retrain" ? "reqRetrain" : "reqNew";
  const reqEx = exercises.filter(it => it[reqKey]).map(it => it.name);
  const reqRt = routes.filter(it => it[reqKey]).map(it => it.name);
  const doneEx = new Set();
  const doneRt = new Set();
  student.lessons.forEach(l => {
    (l.exercises||[]).forEach(e => doneEx.add(e));
    (l.routes||[]).forEach(r => doneRt.add(r));
  });
  const missingEx = reqEx.filter(e => !doneEx.has(e));
  const missingRt = reqRt.filter(r => !doneRt.has(r));
  const hasReq = reqEx.length + reqRt.length > 0;
  const allDone = missingEx.length === 0 && missingRt.length === 0;

  return (
    <div>
      <button style={s.progressBtn} onClick={() => setShow(v => !v)}>
        📋 {show ? "Απόκρυψη ελέγχου προόδου" : "Έλεγχος υποχρεωτικών"}
      </button>
      {show && (
        <div style={s.progressBox}>
          {!hasReq && <div style={{fontSize:13,color:"#888"}}>Δεν έχουν οριστεί υποχρεωτικές δοκιμασίες/διαδρομές για αυτόν τον τύπο μαθητή. Όρισέ τες από τις Ρυθμίσεις ⚙️.</div>}
          {hasReq && allDone && <div style={{fontSize:14,color:"#2e7d32",fontWeight:700}}>✅ Ολοκλήρωσε όλες τις υποχρεωτικές δοκιμασίες και διαδρομές!</div>}
          {missingEx.length > 0 && (
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:600,color:"#c62828",textTransform:"uppercase",marginBottom:4}}>Υπολείπονται δοκιμασίες:</div>
              <div style={s.tags}>{missingEx.map(e => <span key={e} style={s.missTag}>{e}</span>)}</div>
            </div>
          )}
          {missingRt.length > 0 && (
            <div>
              <div style={{fontSize:11,fontWeight:600,color:"#c62828",textTransform:"uppercase",marginBottom:4}}>Υπολείπονται διαδρομές:</div>
              <div style={s.tags}>{missingRt.map(r => <span key={r} style={s.missTag}>{r}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotesToggle({ notes }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button style={s.notesToggleBtn} onClick={() => setShow(v => !v)}>
        🔒 {show ? "Απόκρυψη σημειώσεων" : "Εμφάνιση σημειώσεων"}
      </button>
      {show && <div style={{marginTop:6}}>
        <div style={{fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:3}}>ΣΗΜΕΙΩΣΕΙΣ:</div>
        <div style={s.studentNotes}>{notes}</div>
      </div>}
    </div>
  );
}

function EditableList({ items, onUpdate }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editingVal, setEditingVal] = useState("");
  const [newItem, setNewItem] = useState("");
  const [pendingRemove, setPendingRemove] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  function startEdit(i) { setEditingIdx(i); setEditingVal(items[i].name); }
  function saveEdit(i) { if (!editingVal.trim()) return; const next=[...items]; next[i]={...next[i], name:editingVal.trim()}; onUpdate(next); setEditingIdx(null); }
  function remove(i) { onUpdate(items.filter((_,idx)=>idx!==i)); if(editingIdx===i) setEditingIdx(null); setPendingRemove(null); }
  function addItem() { if(!newItem.trim()) return; onUpdate([...items, {name:newItem.trim(), reqNew:false, reqRetrain:false}]); setNewItem(""); }
  function toggleReq(i, key) { const next=[...items]; next[i]={...next[i], [key]:!next[i][key]}; onUpdate(next); }

  function moveItem(from, to) {
    if (from === null || to === null || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onUpdate(next);
  }

  function handleTouchMove(e) {
    if (dragIdx === null) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const row = el.closest('[data-row-idx]');
      if (row) {
        const idx = parseInt(row.getAttribute('data-row-idx'));
        if (idx !== overIdx) setOverIdx(idx);
      }
    }
  }
  function handleTouchEnd() {
    if (dragIdx !== null && overIdx !== null) moveItem(dragIdx, overIdx);
    setDragIdx(null); setOverIdx(null);
  }

  return (
    <div>
      {pendingRemove !== null && (
        <div style={s.overlay}>
          <div style={s.dialog}>
            <div style={s.dialogIcon}>⚠️</div>
            <div style={s.dialogMsg}>Να διαγραφεί οριστικά το "{items[pendingRemove].name}";</div>
            <div style={s.dialogBtns}>
              <button style={s.dialogCancel} onClick={() => setPendingRemove(null)}>Ακύρωση</button>
              <button style={s.dialogConfirm} onClick={() => remove(pendingRemove)}>Διαγραφή</button>
            </div>
          </div>
        </div>
      )}
      <div style={{fontSize:11,color:"#888",marginBottom:6}}>Τικ 🆕 = υποχρεωτικό για Νέο μαθητή, 🔄 = για Μετεκπαίδευση</div>
      {items.map((item,i) => (
        <div key={i} data-row-idx={i}
          style={{...s.listRowCol,
            background: overIdx===i && dragIdx!==null ? "#e8eaf6" : "transparent",
            opacity: dragIdx===i ? 0.4 : 1,
            borderTop: overIdx===i && dragIdx!==null && dragIdx>i ? "2px solid #3949ab" : "1px solid transparent",
            borderBottom: overIdx===i && dragIdx!==null && dragIdx<i ? "2px solid #3949ab" : "1px solid #f0f0f0"}}
          onDragOver={(e)=>{e.preventDefault(); if(overIdx!==i) setOverIdx(i);}}
          onDrop={(e)=>{e.preventDefault(); moveItem(dragIdx, i); setDragIdx(null); setOverIdx(null);}}
        >
          <div style={{display:"flex", alignItems:"center", width:"100%"}}>
            <span
              draggable
              onDragStart={()=>setDragIdx(i)}
              onDragEnd={()=>{setDragIdx(null); setOverIdx(null);}}
              onTouchStart={()=>setDragIdx(i)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={s.dragHandle}
              title="Σύρε για αλλαγή σειράς"
            >≡</span>
            {editingIdx===i
              ? <input autoFocus style={{...s.input, flex:1, padding:"5px 8px", fontSize:13}} value={editingVal} onChange={e=>setEditingVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(i);if(e.key==="Escape")setEditingIdx(null);}}/>
              : <span style={{...s.listItem, flex:1}}>{item.name}</span>}
            <div style={{display:"flex", gap:4, flexShrink:0}}>
              {editingIdx===i ? <button style={s.saveSmallBtn} onClick={()=>saveEdit(i)}>✓</button> : <button style={s.editSmallBtn} onClick={()=>startEdit(i)}>✏️</button>}
              <button style={s.removeBtn} onClick={()=>setPendingRemove(i)}>✕</button>
            </div>
          </div>
          <div style={{display:"flex", gap:6, marginLeft:34, marginTop:4}}>
            <button style={item.reqNew ? s.reqChipActive : s.reqChip} onClick={()=>toggleReq(i,"reqNew")}>🆕 Νέος</button>
            <button style={item.reqRetrain ? s.reqChipActive : s.reqChip} onClick={()=>toggleReq(i,"reqRetrain")}>🔄 Μετεκπ.</button>
          </div>
        </div>
      ))}
      <div style={s.addRow}>
        <input style={{...s.input, flex:1}} placeholder="Νέο στοιχείο..." value={newItem} onChange={e=>setNewItem(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addItem();}}/>
        <button style={s.addBtn} onClick={addItem}>+ Προσθήκη</button>
      </div>
    </div>
  );
}

function formatDate(d) {
  const [y,m,day] = d.split("-");
  const months = ["Ιαν","Φεβ","Μαρ","Απρ","Μαΐ","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"];
  const days = ["Κυριακή","Δευτέρα","Τρίτη","Τετάρτη","Πέμπτη","Παρασκευή","Σάββατο"];
  const weekday = days[new Date(parseInt(y), parseInt(m)-1, parseInt(day)).getDay()];
  return `${weekday}, ${day} ${months[parseInt(m)-1]} ${y}`;
}

const s = {
  page:{fontFamily:"'Segoe UI',Arial,sans-serif",background:"#f0f4f8",minHeight:"100vh",paddingBottom:40},
  header:{background:"linear-gradient(135deg,#1a237e 0%,#283593 100%)",padding:"16px 20px",color:"white",boxShadow:"0 2px 8px rgba(0,0,0,0.2)"},
  headerInner:{display:"flex",alignItems:"center",gap:14,maxWidth:600,margin:"0 auto"},
  logo:{fontSize:30}, appTitle:{fontWeight:700,fontSize:18,color:"white"},
  appSub:{fontSize:12,color:"rgba(255,255,255,0.75)",marginTop:1},
  savingBadge:{fontSize:12,color:"rgba(255,255,255,0.9)",background:"rgba(255,255,255,0.15)",borderRadius:8,padding:"4px 10px"},
  back:{background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:18,cursor:"pointer",borderRadius:8,padding:"4px 12px",fontWeight:700},
  container:{maxWidth:600,margin:"0 auto",padding:"20px 16px",display:"flex",flexDirection:"column",gap:12},
  empty:{textAlign:"center",padding:"40px 20px",color:"#888"},
  emptyTitle:{fontSize:18,fontWeight:600,marginTop:12,color:"#555"}, emptyText:{fontSize:14,marginTop:6},
  studentCard:{background:"white",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",cursor:"pointer"},
  studentAvatar:{width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#1a237e,#3949ab)",color:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,flexShrink:0},
  studentInfo:{flex:1}, studentName:{fontWeight:700,fontSize:16,color:"#1a237e"},
  studentPhone:{fontSize:13,color:"#888",marginTop:2}, studentMeta:{fontSize:13,color:"#555",marginTop:4},
  chevron:{fontSize:24,color:"#ccc"},
  fab:{background:"linear-gradient(135deg,#1a237e,#3949ab)",color:"white",border:"none",borderRadius:14,padding:"14px 20px",fontSize:16,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(26,35,126,0.3)"},
  searchBox:{display:"flex",alignItems:"center",background:"white",borderRadius:12,padding:"10px 14px",gap:8,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"},
  searchIcon:{fontSize:16,flexShrink:0}, searchInput:{flex:1,border:"none",outline:"none",fontSize:15,fontFamily:"inherit",background:"transparent",minWidth:0},
  searchClear:{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#aaa",fontSize:16,cursor:"pointer",fontWeight:700,padding:0},
  overlay:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000},
  dialog:{background:"white",borderRadius:18,padding:"28px 24px",maxWidth:320,width:"90%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,0.2)"},
  dialogIcon:{fontSize:40,marginBottom:12}, dialogMsg:{fontSize:16,color:"#333",fontWeight:600,marginBottom:24,lineHeight:1.4},
  dialogBtns:{display:"flex",gap:10},
  dialogCancel:{flex:1,background:"#f0f0f0",color:"#555",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"},
  dialogConfirm:{flex:1,background:"#c62828",color:"white",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer"},
  summaryRow:{display:"flex",gap:10},
  summaryBox:{flex:1,background:"white",borderRadius:12,padding:"12px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"},
  summaryNum:{fontSize:22,fontWeight:800,color:"#1a237e"}, summaryLbl:{fontSize:11,color:"#888",marginTop:2},
  lessonCard:{background:"white",borderRadius:14,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",gap:10},
  lessonTop:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},
  lessonDate:{fontWeight:700,fontSize:15,color:"#1a237e"}, lessonDur:{fontSize:13,color:"#888",marginTop:2},
  lessonNum:{fontSize:13,fontWeight:600,color:"#3949ab",marginTop:2},
  tagSection:{display:"flex",flexDirection:"column",gap:4},
  tagLabel:{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase"},
  tags:{display:"flex",flexWrap:"wrap",gap:5},
  tag:{background:"#e8eaf6",color:"#3949ab",borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600},
  notes:{fontSize:13,color:"#555",background:"#fafafa",borderRadius:8,padding:"8px 10px"},
  lessonNotes:{fontSize:13,color:"#555",background:"#fff8f0",borderRadius:8,padding:"8px 10px",border:"1px solid #ffe0b2",whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word"},
  studentNotes:{fontSize:13,color:"#555",background:"#fffde7",borderRadius:8,padding:"8px 10px",border:"1px solid #fff9c4",whiteSpace:"pre-wrap",wordBreak:"break-word",overflowWrap:"break-word"},
  lessonActions:{display:"flex",gap:8,justifyContent:"flex-end"},
  editBtn:{background:"#e8eaf6",color:"#1a237e",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"},
  delBtn:{background:"#ffebee",color:"#c62828",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:600,cursor:"pointer"},
  formCard:{background:"white",borderRadius:14,padding:"20px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",display:"flex",flexDirection:"column",gap:6},
  label:{fontSize:13,fontWeight:700,color:"#555",marginTop:8},
  input:{border:"1.5px solid #e0e0e0",borderRadius:10,padding:"10px 12px",fontSize:15,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
  checkGrid:{display:"flex",flexWrap:"wrap",gap:7,marginBottom:4,alignItems:"flex-start"},
  checkActive:{background:"#3949ab",color:"white",border:"none",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",width:"auto",flexShrink:0},
  checkInactive:{background:"#f0f0f0",color:"#555",border:"1.5px solid #e0e0e0",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",width:"auto",flexShrink:0},
  btnPrimary:{background:"linear-gradient(135deg,#1a237e,#3949ab)",color:"white",border:"none",borderRadius:12,padding:"13px",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:8,flex:1},
  btnDanger:{background:"#ffebee",color:"#c62828",border:"none",borderRadius:12,padding:"13px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8},
  settingsBtn:{background:"rgba(255,255,255,0.15)",border:"none",color:"white",fontSize:16,cursor:"pointer",borderRadius:8,padding:"4px 7px"},
  sectionTitle:{fontWeight:700,fontSize:15,color:"#1a237e",marginBottom:8},
  listRow:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f0f0f0"},
  listItem:{fontSize:14,color:"#333"},
  removeBtn:{background:"#ffebee",color:"#c62828",border:"none",borderRadius:6,padding:"3px 9px",fontSize:13,cursor:"pointer",fontWeight:700},
  addRow:{display:"flex",gap:8,marginTop:12,alignItems:"center"},
  addBtn:{background:"#1a237e",color:"white",border:"none",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"},
  arrowBtn:{background:"#f0f0f0",color:"#555",border:"none",borderRadius:6,padding:"3px 7px",fontSize:12,cursor:"pointer",fontWeight:700},
  dragHandle:{cursor:"grab",color:"#bbb",fontSize:20,padding:"0 10px 0 2px",flexShrink:0,touchAction:"none",userSelect:"none"},
  editSmallBtn:{background:"#e8eaf6",color:"#1a237e",border:"none",borderRadius:6,padding:"3px 7px",fontSize:12,cursor:"pointer"},
  saveSmallBtn:{background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:6,padding:"3px 7px",fontSize:13,cursor:"pointer",fontWeight:700},
  notesToggleBtn:{background:"#fff9c4",color:"#888",border:"1px solid #fff9c4",borderRadius:8,padding:"6px 12px",fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",textAlign:"left"},
  totalBox:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"white",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"},
  totalLbl:{fontSize:13,fontWeight:600,color:"#888"},
  totalNum:{fontSize:20,fontWeight:800,color:"#1a237e"},
  fabSecondary:{background:"white",color:"#1a237e",border:"2px solid #1a237e",borderRadius:14,padding:"12px 20px",fontSize:15,fontWeight:700,cursor:"pointer"},
  typeBadge:{fontSize:11,fontWeight:600,color:"#e65100",background:"#fff3e0",borderRadius:6,padding:"1px 7px",marginLeft:4},
  progressBtn:{background:"#e3f2fd",color:"#1565c0",border:"1px solid #bbdefb",borderRadius:8,padding:"10px 14px",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%"},
  progressBox:{background:"white",borderRadius:12,padding:"14px 16px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",marginTop:8},
  missTag:{background:"#ffebee",color:"#c62828",borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600},
  listRowCol:{display:"flex",flexDirection:"column",padding:"9px 0",borderBottom:"1px solid #f0f0f0"},
  reqChip:{background:"#f0f0f0",color:"#888",border:"1px solid #e0e0e0",borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600,cursor:"pointer"},
  reqChipActive:{background:"#1a237e",color:"white",border:"1px solid #1a237e",borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600,cursor:"pointer"},
  schedTime:{fontSize:14,color:"#1565c0",fontWeight:700,marginTop:3},
  schedTimeBig:{fontSize:20,fontWeight:800,color:"#1565c0",minWidth:52,flexShrink:0},
  dayNav:{display:"flex",alignItems:"center",background:"white",borderRadius:12,padding:"10px 12px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)"},
  dayNavBtn:{background:"#e8eaf6",color:"#1a237e",border:"none",borderRadius:10,width:38,height:38,fontSize:20,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  dayNavDate:{fontSize:16,fontWeight:700,color:"#1a237e",display:"inline-flex",alignItems:"center",gap:8},
  countBadge:{background:"#1565c0",color:"white",fontSize:12,fontWeight:700,borderRadius:"50%",minWidth:22,height:22,display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"0 5px"},
  todayTag:{fontSize:11,fontWeight:600,color:"#2e7d32",marginTop:2},
  todayBtn:{background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:10,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer"},
  row2:{display:"flex",gap:10},
  schedStudent:{fontSize:14,color:"#1a237e",fontWeight:600,cursor:"pointer",textDecoration:"underline"},
  schedStudentGone:{fontSize:14,color:"#999",fontWeight:600,fontStyle:"italic"},
};
