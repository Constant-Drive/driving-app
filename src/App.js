import { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DATA_DOC = doc(db, "app", "data");

const DEFAULT_EXERCISES = [
  "Εκκίνηση / Στάση","Στροφές","Παρκάρισμα παράλληλο","Παρκάρισμα κάθετο",
  "Αντίστροφη","Κυκλικός κόμβος","Εθνική / Ταχύτητα","Προτεραιότητα / Σήματα",
  "Νυχτερινή οδήγηση","Αλλαγή λωρίδας","Φρενάρισμα έκτακτης ανάγκης","Κεκλιμένο επίπεδο",
];
const DEFAULT_ROUTES = [
  "Κέντρο πόλης","Αυτοκινητόδρομος","Παραλιακή","Ορεινή διαδρομή","Σχολικές ζώνες",
];

function today() { return new Date().toISOString().slice(0, 10); }

export default function App() {
  const [students, setStudents] = useState([]);
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
          if (data.exercises) setExercises(data.exercises);
          if (data.routes) setRoutes(data.routes);
        }
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  async function persist(s, ex, rt) {
    setSaving(true);
    try { await setDoc(DATA_DOC, { students: s, exercises: ex, routes: rt }); }
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

  function addStudent() {
    if (!newStudentName.trim()) return;
    const exists = students.some(st => st.name.toLowerCase() === newStudentName.trim().toLowerCase());
    if (exists) { setDuplicateWarning(true); return; }
    const st = { id: Date.now(), name: newStudentName.trim(), phone: newStudentPhone.trim(), job: newStudentJob.trim(), notes: newStudentNotes.trim(), lessons: [] };
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

  function EditableList({ items, onUpdate }) {
    const [editingIdx, setEditingIdx] = useState(null);
    const [editingVal, setEditingVal] = useState("");
    const [newItem, setNewItem] = useState("");
    const [pendingRemove, setPendingRemove] = useState(null);
    function startEdit(i) { setEditingIdx(i); setEditingVal(items[i]); }
    function saveEdit(i) { if (!editingVal.trim()) return; const next=[...items]; next[i]=editingVal.trim(); onUpdate(next); setEditingIdx(null); }
    function remove(i) { onUpdate(items.filter((_,idx)=>idx!==i)); if(editingIdx===i) setEditingIdx(null); setPendingRemove(null); }
    function moveUp(i) { if(i===0) return; const next=[...items]; [next[i-1],next[i]]=[next[i],next[i-1]]; onUpdate(next); }
    function moveDown(i) { if(i===items.length-1) return; const next=[...items]; [next[i],next[i+1]]=[next[i+1],next[i]]; onUpdate(next); }
    function addItem() { if(!newItem.trim()) return; onUpdate([...items, newItem.trim()]); setNewItem(""); }
    return (
      <div>
        {pendingRemove !== null && (
          <div style={s.overlay}>
            <div style={s.dialog}>
              <div style={s.dialogIcon}>⚠️</div>
              <div style={s.dialogMsg}>Να διαγραφεί οριστικά το "{items[pendingRemove]}";</div>
              <div style={s.dialogBtns}>
                <button style={s.dialogCancel} onClick={() => setPendingRemove(null)}>Ακύρωση</button>
                <button style={s.dialogConfirm} onClick={() => remove(pendingRemove)}>Διαγραφή</button>
              </div>
            </div>
          </div>
        )}
        {items.map((item,i) => (
          <div key={i} style={s.listRow}>
            {editingIdx===i
              ? <input autoFocus style={{...s.input, flex:1, padding:"5px 8px", fontSize:13}} value={editingVal} onChange={e=>setEditingVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveEdit(i);if(e.key==="Escape")setEditingIdx(null);}}/>
              : <span style={s.listItem}>{item}</span>}
            <div style={{display:"flex", gap:4, flexShrink:0}}>
              <button style={s.arrowBtn} onClick={()=>moveUp(i)} disabled={i===0}>▲</button>
              <button style={s.arrowBtn} onClick={()=>moveDown(i)} disabled={i===items.length-1}>▼</button>
              {editingIdx===i ? <button style={s.saveSmallBtn} onClick={()=>saveEdit(i)}>✓</button> : <button style={s.editSmallBtn} onClick={()=>startEdit(i)}>✏️</button>}
              <button style={s.removeBtn} onClick={()=>setPendingRemove(i)}>✕</button>
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
            <button style={s.dialogCancel} onClick={() => setConfirmDialog(null)}>Ακύρωση</button>
            <button style={s.dialogConfirm} onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>Διαγραφή</button>
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
        <button style={s.settingsBtn} onClick={() => setView("settings")}>⚙️</button>
      </div></div>
      <div style={s.container}>
        <div style={s.searchBox}>
          <span style={s.searchIcon}>🔍</span>
          <input style={s.searchInput} placeholder="Αναζήτηση μαθητή..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/>
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
              <div style={s.studentName}>{st.name}</div>
              {st.phone && <div style={s.studentPhone}>{st.phone}</div>}
              <div style={s.studentMeta}>{st.lessons.length} μαθήματα</div>
            </div>
            <span style={s.chevron}>›</span>
          </div>
        ))}
        <button style={s.fab} onClick={() => setView("addStudent")}>+ Νέος Μαθητής</button>
      </div>
    </div>
  );

  if (view === "addStudent") return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={() => setView("home")}>‹ Πίσω</button><div style={s.appTitle}>Νέος Μαθητής</div></div></div>
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
          {st.notes && <div style={s.studentNotes}>📝 {st.notes}</div>}
          <div style={s.summaryRow}>
            <div style={s.summaryBox}><div style={s.summaryNum}>{st.lessons.length}</div><div style={s.summaryLbl}>Μαθήματα</div></div>
            <div style={s.summaryBox}><div style={s.summaryNum}>{st.lessons.reduce((a,l) => a+l.duration, 0)}</div><div style={s.summaryLbl}>Συνολικά λεπτά</div></div>
          </div>
          {sorted.length === 0 && <div style={s.empty}><div style={{fontSize:36}}>📋</div><div style={s.emptyText}>Δεν υπάρχουν μαθήματα ακόμα</div></div>}
          {sorted.map(l => (
            <div key={l.id} style={s.lessonCard}>
              <div style={s.lessonTop}><div><div style={s.lessonDate}>{formatDate(l.date)}</div><div style={s.lessonDur}>{l.duration} λεπτά</div></div></div>
              {l.exercises.length > 0 && <div style={s.tagSection}><div style={s.tagLabel}>Δοκιμασίες:</div><div style={s.tags}>{l.exercises.map(e => <span key={e} style={s.tag}>{e}</span>)}</div></div>}
              {l.routes.length > 0 && <div style={s.tagSection}><div style={s.tagLabel}>Διαδρομές:</div><div style={s.tags}>{l.routes.map(r => <span key={r} style={{...s.tag, background:"#e8f5e9", color:"#2e7d32"}}>{r}</span>)}</div></div>}
              {l.notes && <div style={s.notes}>📝 {l.notes}</div>}
              <div style={s.lessonActions}>
                <button style={s.editBtn} onClick={() => startEditLesson(l)}>Επεξεργασία</button>
                <button style={s.delBtn} onClick={() => deleteLesson(l.id)}>Διαγραφή</button>
              </div>
            </div>
          ))}
          <div style={{display:"flex", gap:10, marginTop:8}}><button style={s.btnPrimary} onClick={startAddLesson}>+ Νέο Μάθημα</button></div>
          <div style={{display:"flex", gap:10}}>
            <button style={s.editBtn} onClick={() => startEditStudent(st)}>✏️ Επεξεργασία Στοιχείων</button>
            <button style={s.btnDanger} onClick={() => deleteStudent(st.id)}>Διαγραφή Μαθητή</button>
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

  if (view === "addLesson") return (
    <div style={s.page}>
      <div style={s.header}><div style={s.headerInner}><button style={s.back} onClick={() => setView("student")}>‹ Πίσω</button><div style={s.appTitle}>{editLesson ? "Επεξεργασία Μαθήματος" : "Νέο Μάθημα"}</div></div></div>
      <div style={s.container}><div style={s.formCard}>
        <label style={s.label}>Ημερομηνία</label><input type="date" style={s.input} value={lessonDate} onChange={e => setLessonDate(e.target.value)}/>
        <label style={s.label}>Διάρκεια (λεπτά)</label><input type="number" style={s.input} value={lessonDuration} onChange={e => setLessonDuration(Number(e.target.value))}/>
        <label style={s.label}>Δοκιμασίες</label>
        <div style={s.checkGrid}>{exercises.map(ex => <button key={ex} style={lessonExercises.includes(ex) ? s.checkActive : s.checkInactive} onClick={() => toggleArr(lessonExercises, setLessonExercises, ex)}>{ex}</button>)}</div>
        <label style={s.label}>Διαδρομές</label>
        <div style={s.checkGrid}>{routes.map(r => <button key={r} style={lessonRoutes.includes(r) ? {...s.checkActive, background:"#2e7d32"} : s.checkInactive} onClick={() => toggleArr(lessonRoutes, setLessonRoutes, r)}>{r}</button>)}</div>
        <label style={s.label}>Σημειώσεις</label>
        <textarea style={{...s.input, height:80, resize:"vertical"}} placeholder="π.χ. Καλή πρόοδος στις στροφές..." value={lessonNotes} onChange={e => setLessonNotes(e.target.value)}/>
        <button style={s.btnPrimary} onClick={saveLesson}>Αποθήκευση</button>
      </div></div>
    </div>
  );

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
  fab:{background:"linear-gradient(135deg,#1a237e,#3949ab)",color:"white",border:"none",borderRadius:14,padding:"14px 20px",fontSize:16,fontWeight:700,cursor:"pointer",marginTop:4,boxShadow:"0 2px 8px rgba(26,35,126,0.3)"},
  searchBox:{display:"flex",alignItems:"center",background:"white",borderRadius:12,padding:"10px 14px",gap:8,boxShadow:"0 1px 4px rgba(0,0,0,0.08)"},
  searchIcon:{fontSize:16}, searchInput:{flex:1,border:"none",outline:"none",fontSize:15,fontFamily:"inherit",background:"transparent"},
  searchClear:{background:"none",border:"none",color:"#aaa",fontSize:16,cursor:"pointer",padding:"0 2px",fontWeight:700,marginRight:4},
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
  tagSection:{display:"flex",flexDirection:"column",gap:4},
  tagLabel:{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase"},
  tags:{display:"flex",flexWrap:"wrap",gap:5},
  tag:{background:"#e8eaf6",color:"#3949ab",borderRadius:6,padding:"3px 9px",fontSize:12,fontWeight:600},
  notes:{fontSize:13,color:"#555",background:"#fafafa",borderRadius:8,padding:"8px 10px"},
  studentNotes:{fontSize:13,color:"#555",background:"#fffde7",borderRadius:8,padding:"8px 10px",border:"1px solid #fff9c4"},
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
  editSmallBtn:{background:"#e8eaf6",color:"#1a237e",border:"none",borderRadius:6,padding:"3px 7px",fontSize:12,cursor:"pointer"},
  saveSmallBtn:{background:"#e8f5e9",color:"#2e7d32",border:"none",borderRadius:6,padding:"3px 7px",fontSize:13,cursor:"pointer",fontWeight:700},
};
