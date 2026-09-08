import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { changeColor, changeSign } from '../utils/change';
import { useClassroomStore, Classroom, Assignment, ClassMember } from '../services/classroomStore';
import { useUserStore } from '../services/userStore';

interface Props {
  onBack: () => void;
  onLessonPress?: (id: string) => void;
  onBehavioralAssessmentPress?: () => void;
}

type Tab = 'overview' | 'students' | 'assignments' | 'feed';

export function ClassroomScreen({ onBack, onLessonPress, onBehavioralAssessmentPress }: Props) {
  const { theme } = useTheme();
  const s = styles(theme);
  const { classrooms, activeClassroomId, myRole, isTeacher,
    createClassroom, joinClassroom, loadMyClassrooms, refreshMembers,
    addAssignment, completeAssignment, postAnnouncement,
    setRole, setActiveClassroom } = useClassroomStore();
  const user = useUserStore(s => s.user);

  const [tab, setTab] = useState<Tab>('overview');
  const [setupPhase, setSetupPhase] = useState<'choose' | 'join' | 'create' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [createGrade, setCreateGrade] = useState('');
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');

  useEffect(() => { if (user) loadMyClassrooms(user.id); }, [user?.id]);

  const classroom = classrooms.find(c => c.id === activeClassroomId);

  useEffect(() => { if (classroom) refreshMembers(classroom.id); }, [classroom?.id]);

  // ── No classroom yet ──────────────────────────────────────────────────────
  if (!classroom || !activeClassroomId) {
    if (!setupPhase) return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backRow}><Ionicons name="chevron-back" size={18} color={theme.colors.primary} /><Text style={s.back}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Classroom</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={s.centered}>
          <Ionicons name="school-outline" size={64} color={theme.colors.primary} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={[s.bigTitle, { color: theme.colors.textPrimary }]}>Investment Classroom</Text>
          <Text style={[s.subtitle, { color: theme.colors.textSecondary }]}>
            For schools and investing clubs — assign lessons, track portfolios, and compete together.
          </Text>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: theme.colors.primary }]} onPress={() => { setRole('teacher'); setSetupPhase('create'); }}>
            <Text style={s.primaryBtnText}>Create a Classroom</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.secondaryBtn, { borderColor: theme.colors.border }]} onPress={() => { setRole('student'); setSetupPhase('join'); }}>
            <Text style={[s.secondaryBtnText, { color: theme.colors.textPrimary }]}>Join with a Code</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );

    if (setupPhase === 'join') return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSetupPhase(null)} style={s.backRow}><Ionicons name="chevron-back" size={18} color={theme.colors.primary} /><Text style={s.back}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Join Classroom</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={s.formPad}>
          <Text style={[s.formLabel, { color: theme.colors.textSecondary }]}>Enter your class code</Text>
          <TextInput
            style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            value={joinCode} onChangeText={setJoinCode} placeholder="e.g. A1B2C"
            placeholderTextColor={theme.colors.textTertiary} autoCapitalize="characters" autoFocus
          />
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: theme.colors.primary, opacity: joinCode.length < 3 ? 0.5 : 1 }]}
            disabled={joinCode.length < 3}
            onPress={async () => {
              if (!user) return;
              const result = await joinClassroom(joinCode, { uid: user.id, name: user.displayName, email: user.email });
              if (result) { setSetupPhase(null); }
              else showAlert('Code not found', 'Double-check your class code with your teacher.');
            }}
          >
            <Text style={s.primaryBtnText}>Join Classroom →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

    if (setupPhase === 'create') return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSetupPhase(null)} style={s.backRow}><Ionicons name="chevron-back" size={18} color={theme.colors.primary} /><Text style={s.back}>Back</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Create Classroom</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={s.formPad}>
          {[
            { label: 'Classroom Name *', val: createName, set: setCreateName, placeholder: 'e.g. Investing Club — Spring 2026' },
            { label: 'Subject', val: createSubject, set: setCreateSubject, placeholder: 'e.g. Personal Finance' },
            { label: 'Grade Level', val: createGrade, set: setCreateGrade, placeholder: 'e.g. 9–12 or College' },
          ].map(f => (
            <View key={f.label} style={{ marginBottom: 14 }}>
              <Text style={[s.formLabel, { color: theme.colors.textSecondary }]}>{f.label}</Text>
              <TextInput style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                value={f.val} onChangeText={f.set} placeholder={f.placeholder} placeholderTextColor={theme.colors.textTertiary} />
            </View>
          ))}
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: theme.colors.primary, opacity: createName.length < 3 ? 0.5 : 1 }]}
            disabled={createName.length < 3}
            onPress={async () => {
              if (!user) return;
              await createClassroom(
                { name: createName, subject: createSubject, gradeLevel: createGrade },
                { uid: user.id, name: user.displayName, email: user.email }
              );
              setSetupPhase(null);
            }}
          >
            <Text style={s.primaryBtnText}>Create Classroom →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
    return null;
  }

  const students = classroom.members.filter(m => m.role === 'student');
  const activeAssignments = classroom.assignments.filter(a => a.status === 'active');

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backRow}><Ionicons name="chevron-back" size={18} color={theme.colors.primary} /><Text style={s.back}>Back</Text></TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{classroom.name}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={s.codeRow}>
        <Text style={[s.codeLabel, { color: theme.colors.textTertiary }]}>Class code</Text>
        <Text style={[s.codeValue, { color: theme.colors.primary }]}>{classroom.code}</Text>
      </View>

      <View style={s.tabRow}>
        {(['overview', 'students', 'assignments', 'feed'] as Tab[]).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)}
            style={[s.tabBtn, tab === t && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}>
            <Text style={[s.tabLabel, { color: tab === t ? theme.colors.primary : theme.colors.textTertiary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.pad} showsVerticalScrollIndicator={false}>
        {tab === 'overview' && (
          <>
            <View style={s.statsRow}>
              <View style={[s.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{students.length}</Text>
                <Text style={[s.statLbl, { color: theme.colors.textTertiary }]}>Students</Text>
              </View>
              <View style={[s.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{activeAssignments.length}</Text>
                <Text style={[s.statLbl, { color: theme.colors.textTertiary }]}>Active Assignments</Text>
              </View>
              <View style={[s.statBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.statVal, { color: theme.colors.textPrimary }]}>{classroom.announcements.length}</Text>
                <Text style={[s.statLbl, { color: theme.colors.textTertiary }]}>Announcements</Text>
              </View>
            </View>
            {classroom.description ? (
              <Text style={[s.description, { color: theme.colors.textSecondary }]}>{classroom.description}</Text>
            ) : null}
          </>
        )}

        {tab === 'students' && (
          <>
            {students.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>No students have joined yet. Share the class code above.</Text>
            ) : (
              <>
                <Text style={[s.emptyText, { color: theme.colors.textTertiary, marginBottom: 12 }]}>
                  Ranked by lessons completed — see who's leading.
                </Text>
                {/* TODO(Phase 4): switch ranking to thesis-correct rate once that metric exists */}
                {[...students]
                  .sort((a: ClassMember, b: ClassMember) => (b.lessonsCompleted ?? 0) - (a.lessonsCompleted ?? 0))
                  .map((m: ClassMember, i: number) => (
                    <View key={m.id} style={[s.studentRow, { backgroundColor: theme.colors.surface, borderColor: i === 0 ? theme.colors.gold + '60' : theme.colors.border }]}>
                      {i === 0 ? (
                        <View style={{ width: 22, alignItems: 'center' }}>
                          <Ionicons name="trophy" size={14} color={theme.colors.gold} />
                        </View>
                      ) : (
                        <Text style={[s.studentMeta, { width: 22, textAlign: 'center', color: theme.colors.textTertiary, fontWeight: '800' }]}>
                          {`#${i + 1}`}
                        </Text>
                      )}
                      <View style={[s.avatar, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={[s.avatarText, { color: theme.colors.primary }]}>{m.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.studentName, { color: theme.colors.textPrimary }]}>{m.name}</Text>
                        <Text style={[s.studentMeta, { color: theme.colors.textTertiary }]}>
                          ${(m.portfolioValue ?? 100000).toLocaleString()} · {m.lessonsCompleted ?? 0} lessons
                        </Text>
                      </View>
                      <Text style={[s.studentMeta, { color: changeColor(m.portfolioReturn, theme), fontWeight: '700' }]}>
                        {changeSign(m.portfolioReturn)}{(m.portfolioReturn ?? 0).toFixed(1)}%
                      </Text>
                    </View>
                  ))}
              </>
            )}
          </>
        )}

        {tab === 'assignments' && (
          <>
            {isTeacher && (
              <TouchableOpacity onPress={() => setShowNewAssignment(v => !v)} style={[s.addBtn, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{showNewAssignment ? 'Cancel' : '+ New Assignment'}</Text>
              </TouchableOpacity>
            )}
            {showNewAssignment && (
              <View style={{ marginBottom: 16 }}>
                <TextInput style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 8 }]}
                  value={aTitle} onChangeText={setATitle} placeholder="Assignment title" placeholderTextColor={theme.colors.textTertiary} />
                <TextInput style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 8, minHeight: 60 }]}
                  value={aDesc} onChangeText={setADesc} placeholder="Description" placeholderTextColor={theme.colors.textTertiary} multiline />
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: theme.colors.primary, opacity: aTitle.length < 3 ? 0.5 : 1 }]}
                  disabled={aTitle.length < 3}
                  onPress={() => {
                    addAssignment(classroom.id, {
                      title: aTitle, description: aDesc, type: 'lesson',
                      dueDate: new Date(Date.now() + 7*86400000).toISOString(),
                      assignedAt: new Date().toISOString(), assignedBy: user?.displayName ?? 'Teacher',
                      points: 10, status: 'active',
                    });
                    setATitle(''); setADesc('');
                    setShowNewAssignment(false);
                  }}
                >
                  <Text style={s.primaryBtnText}>Assign</Text>
                </TouchableOpacity>
              </View>
            )}
            {classroom.assignments.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>No assignments yet.</Text>
            ) : classroom.assignments.map((a: Assignment) => (
              <View key={a.id} style={[s.assignmentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.assignmentTitle, { color: theme.colors.textPrimary }]}>{a.title}</Text>
                {!!a.description && <Text style={[s.assignmentDesc, { color: theme.colors.textSecondary }]}>{a.description}</Text>}
                <Text style={[s.assignmentMeta, { color: theme.colors.textTertiary }]}>
                  {a.completedBy.length} completed · {a.points} pts · Due {new Date(a.dueDate).toLocaleDateString()}
                </Text>
                {!isTeacher && user && !a.completedBy.includes(user.id) && (
                  <TouchableOpacity
                    onPress={() => { if (user) completeAssignment(classroom.id, a.id, user.id); showAlert('Marked complete! ✅'); }}
                    style={[s.completeBtn, { borderColor: theme.colors.success }]}
                  >
                    <Text style={{ color: theme.colors.success, fontWeight: '700', fontSize: 12 }}>Mark Complete</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}

        {tab === 'feed' && (
          <>
            {isTeacher && (
              <TouchableOpacity onPress={() => setShowAnnouncement(v => !v)} style={[s.addBtn, { borderColor: theme.colors.border }]}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{showAnnouncement ? 'Cancel' : '+ Post Announcement'}</Text>
              </TouchableOpacity>
            )}
            {showAnnouncement && (
              <View style={{ marginBottom: 16 }}>
                <TextInput style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginBottom: 8 }]}
                  value={annTitle} onChangeText={setAnnTitle} placeholder="Title" placeholderTextColor={theme.colors.textTertiary} />
                <TextInput style={[s.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.background, minHeight: 70 }]}
                  value={annBody} onChangeText={setAnnBody} placeholder="Write a message to your class..." placeholderTextColor={theme.colors.textTertiary} multiline />
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: theme.colors.primary, opacity: annTitle.length < 3 || annBody.length < 3 ? 0.5 : 1 }]}
                  disabled={annTitle.length < 3 || annBody.length < 3}
                  onPress={() => {
                    postAnnouncement(classroom.id, { title: annTitle, body: annBody, postedBy: user?.displayName ?? 'Teacher', pinned: false });
                    setAnnTitle(''); setAnnBody('');
                    showAlert('Posted', 'Your announcement is live.');
                  }}
                >
                  <Text style={s.primaryBtnText}>Post</Text>
                </TouchableOpacity>
              </View>
            )}
            {classroom.announcements.length === 0 ? (
              <Text style={[s.emptyText, { color: theme.colors.textSecondary }]}>No announcements yet.</Text>
            ) : classroom.announcements.map(ann => (
              <View key={ann.id} style={[s.annCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[s.annTitle, { color: theme.colors.textPrimary }]}>{ann.title}</Text>
                <Text style={[s.annBody, { color: theme.colors.textSecondary }]}>{ann.body}</Text>
                <Text style={[s.annMeta, { color: theme.colors.textTertiary }]}>{ann.postedBy} · {new Date(ann.postedAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  back: { color: theme.colors.primary, fontSize: 16, fontWeight: '600' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  headerTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  codeRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  codeLabel: { fontSize: 12 },
  codeValue: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '700' },

  pad: { padding: 16 },
  centered: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 },
  bigTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 28 },

  primaryBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#07070D' },
  secondaryBtn: { paddingVertical: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },

  formPad: { padding: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 10, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 19 },

  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 40 },

  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  studentName: { fontSize: 14, fontWeight: '700' },
  studentMeta: { fontSize: 11, marginTop: 2 },

  addBtn: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', marginBottom: 16 },

  assignmentCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  assignmentTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  assignmentDesc: { fontSize: 12, lineHeight: 17, marginBottom: 6 },
  assignmentMeta: { fontSize: 11 },
  completeBtn: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },

  annCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8 },
  annTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  annBody: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  annMeta: { fontSize: 11 },
});
