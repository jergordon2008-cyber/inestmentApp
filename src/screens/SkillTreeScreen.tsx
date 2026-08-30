/**
 * SkillTreeScreen — Horizontal Game-style Constellation Skill Tree
 *
 * Layout: branches run as rows (top → bottom), levels flow left → right.
 * Horizontally scrollable canvas that fills the full screen height.
 *
 * Features:
 * ─ Fixed left column shows branch icons + progress (always visible)
 * ─ Level headers at top of scrollable canvas
 * ─ Glowing circular nodes with shared breathing pulse
 * ─ SVG connection lines (lit when path is completed)
 * ─ Staggered node entry animation
 * ─ Tap any node → slide-up detail panel
 * ─ XP progress bar + level badge in header
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Animated,
  TouchableOpacity, Dimensions, Easing, ScrollView, Pressable,
} from 'react-native';
import Svg, { Line, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { useSkillTreeStore, SKILL_NODES, SkillNode, Branch } from '../services/skillTreeStore';

const { width: SW, height: SH } = Dimensions.get('window');
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// ── Design constants ──────────────────────────────────────────────────────────
const NR       = 26;   // standard node radius
const NR_BOSS  = 32;   // level-5 mastery node radius
const LABEL_W  = 62;   // fixed left branch-label column width
const CANVAS_W = Math.round(SW * 1.9); // ~741px on 390px — wide horizontal canvas
const CANVAS_H = Math.max(520, SH - 148); // fills remaining screen height

const XP_FOR_LEVEL = (l: number) => l * l * 100;

// ── Branch visual config ──────────────────────────────────────────────────────
const BC: Record<Branch, { label: string; short: string; color: string; icon: IoniconName }> = {
  value:     { label: 'VALUE',     short: 'VAL', color: '#34D399', icon: 'search-outline'       },
  growth:    { label: 'GROWTH',    short: 'GRW', color: '#6C47FF', icon: 'trending-up-outline'  },
  macro:     { label: 'MACRO',     short: 'MAC', color: '#F5A623', icon: 'globe-outline'        },
  technical: { label: 'TECHNICAL', short: 'TEC', color: '#F87171', icon: 'analytics-outline'    },
  portfolio: { label: 'PORTFOLIO', short: 'POR', color: '#A78BFA', icon: 'pie-chart-outline'    },
};

const branchOrder: Branch[] = ['value', 'growth', 'macro', 'technical', 'portfolio'];

// ── Branch Y centers (5 rows spread evenly across CANVAS_H) ──────────────────
const _vPad   = 65;
const _rowGap = (CANVAS_H - _vPad * 2) / (branchOrder.length - 1);
const BY: Record<Branch, number> = Object.fromEntries(
  branchOrder.map((br, i) => [br, _vPad + i * _rowGap])
) as Record<Branch, number>;

// ── Level X centers (5 columns spread across CANVAS_W) ───────────────────────
const _hPad   = 55;
const _colGap = (CANVAS_W - _hPad * 2) / 4; // 4 gaps for 5 columns
const LX      = Array.from({ length: 5 }, (_, i) => Math.round(_hPad + i * _colGap));

// ── Organic jitter (±4px) for constellation feel ─────────────────────────────
const JITTER: Record<string, [number, number]> = {
  v1:[0,0],   v2:[-3,4],  v3:[3,-3], v4:[-2,3],  v5:[2,-2],
  g1:[2,-4],  g2:[3,2],   g3:[-3,4], g4:[3,-3],  g5:[-2,2],
  m1:[-2,3],  m2:[2,-2],  m3:[0,0],  m4:[-3,4],  m5:[2,-3],
  t1:[3,-3],  t2:[-2,4],  t3:[4,-2], t4:[-3,3],  t5:[2,-4],
  p1:[-3,2],  p2:[2,-4],  p3:[4,3],  p4:[-2,-3], p5:[3,2],
};

// ── Node position map ─────────────────────────────────────────────────────────
const NP: Record<string, { x: number; y: number }> = {};
SKILL_NODES.forEach(n => {
  const [dx, dy] = JITTER[n.id] ?? [0, 0];
  NP[n.id] = { x: LX[n.level - 1] + dx, y: BY[n.branch] + dy };
});

// ── Connection list ───────────────────────────────────────────────────────────
const CONNECTIONS = SKILL_NODES.flatMap(n =>
  n.requires.map(from => ({ from, to: n.id, branch: n.branch as Branch }))
);

// ── Background starfield (pre-computed) ──────────────────────────────────────
const STARS = (() => {
  const pts: { x: number; y: number; r: number }[] = [];
  for (let x = 0; x <= CANVAS_W; x += 34) {
    for (let y = 0; y <= CANVAS_H; y += 34) {
      pts.push({ x, y, r: 1.1 });
    }
  }
  // Extra scattered micro-dots for depth
  const seeds = [
    48, 88,  162, 128,  305, 98,  495, 142,  648, 91,
    22, 228,  198, 268,  382, 212,  558, 258,  718, 242,
    72, 358,  228, 398,  424, 352,  592, 386,  712, 368,
    33, 488,  182, 516,  374, 482,  544, 508,  716, 494,
  ];
  for (let i = 0; i < seeds.length - 1; i += 2) {
    pts.push({ x: seeds[i], y: seeds[i + 1], r: 0.65 });
  }
  return pts;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

interface Props { onBack: () => void; onLessonPress?: (id: string) => void; }

export function SkillTreeScreen({ onBack, onLessonPress }: Props) {
  const { theme }                                 = useTheme();
  const { xp, level, unlockedNodes, completedNodes,
          gamificationEnabled, completeNode }      = useSkillTreeStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Shared pulsing glow ────────────────────────────────────────────────────
  const glowPulse = useRef(new Animated.Value(0.35)).current;

  // ── Bottom panel slide ─────────────────────────────────────────────────────
  const panelSlide = useRef(new Animated.Value(300)).current;

  // ── Per-node entry scale animations ───────────────────────────────────────
  const entryAnims = useRef(
    SKILL_NODES.reduce<Record<string, Animated.Value>>((acc, n) => {
      acc[n.id] = new Animated.Value(0);
      return acc;
    }, {})
  ).current;

  useEffect(() => {
    // Breathing glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1,    duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.35, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Staggered node entry — left-to-right (sort by level then branch)
    const sorted = [...SKILL_NODES].sort((a, b) =>
      a.level !== b.level ? a.level - b.level : branchOrder.indexOf(a.branch) - branchOrder.indexOf(b.branch)
    );
    Animated.stagger(40,
      sorted.map(n =>
        Animated.spring(entryAnims[n.id], {
          toValue: 1, tension: 90, friction: 13, useNativeDriver: true,
        })
      )
    ).start();
  }, []);

  // Panel open/close
  useEffect(() => {
    Animated.spring(panelSlide, {
      toValue: selectedId ? 0 : 300,
      tension: 130, friction: 22,
      useNativeDriver: true,
    }).start();
  }, [selectedId]);

  const selectedNode  = selectedId ? SKILL_NODES.find(n => n.id === selectedId) ?? null : null;
  const nextLevelXP   = XP_FOR_LEVEL(level);
  const prevLevelXP   = XP_FOR_LEVEL(level - 1);
  const xpPct         = Math.min(1, Math.max(0, (xp - prevLevelXP) / (nextLevelXP - prevLevelXP)));

  const handleNodePress = (node: SkillNode) => {
    const unlocked = unlockedNodes.includes(node.id);
    if (unlocked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    setSelectedId(prev => prev === node.id ? null : node.id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#07070D' }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#6C47FF" />
          </TouchableOpacity>
          <View style={s.headerMid}>
            <Text style={s.headerTitle}>
              {gamificationEnabled ? '⬡ SKILL TREE' : '◈ LEARNING PATHS'}
            </Text>
            <Text style={s.headerSub}>
              {completedNodes.length} of {SKILL_NODES.length} mastered
            </Text>
          </View>
          {gamificationEnabled && (
            <LinearGradient colors={['#6C47FF', '#5934E0']} style={s.levelBadge}>
              <Text style={s.levelNum}>{level}</Text>
              <Text style={s.levelLbl}>LVL</Text>
            </LinearGradient>
          )}
        </View>

        {/* ── XP Bar ── */}
        {gamificationEnabled && (
          <View style={s.xpRow}>
            <View style={[s.xpTrack, { backgroundColor: '#1A1A24' }]}>
              <View style={[s.xpFill, { width: `${Math.round(xpPct * 100)}%` }]} />
            </View>
            <Text style={s.xpLabel}>
              {xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
            </Text>
          </View>
        )}

        {/* ── Canvas row: [branch labels] [horizontal scroll] ── */}
        <View style={{ flex: 1, flexDirection: 'row' }}>

          {/* Fixed left branch label column */}
          <View style={[s.labelCol, { height: CANVAS_H }]}>
            {/* Subtle right edge separator */}
            <View style={s.labelColEdge} />

            {branchOrder.map(br => {
              const cfg  = BC[br];
              const done = SKILL_NODES.filter(n => n.branch === br && completedNodes.includes(n.id)).length;
              const y    = BY[br];
              return (
                <View
                  key={`lbl-${br}`}
                  style={[s.branchLabel, { top: y - 28 }]}
                >
                  <View style={[s.branchIconRing, { borderColor: cfg.color + '50', backgroundColor: cfg.color + '14' }]}>
                    <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                  </View>
                  <Text style={[s.branchLblText, { color: cfg.color }]} numberOfLines={1}>
                    {cfg.short}
                  </Text>
                  <Text style={[s.branchProgText, { color: cfg.color + '70' }]}>
                    {done}/5
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Horizontal scrollable skill canvas */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1 }}
            contentContainerStyle={{ width: CANVAS_W }}
            bounces
          >
            <Pressable onPress={() => setSelectedId(null)}>
              <View style={{ width: CANVAS_W, height: CANVAS_H }}>

                {/* Layer 1: SVG — starfield + lane separators + connection lines */}
                <Svg
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                >
                  {/* Starfield */}
                  {STARS.map((d, i) => (
                    <SvgCircle key={i} cx={d.x} cy={d.y} r={d.r} fill="#FFFFFF" opacity={0.04} />
                  ))}

                  {/* Branch lane separator lines (horizontal, between rows) */}
                  {branchOrder.slice(0, -1).map((br, i) => {
                    const y1  = BY[br];
                    const y2  = BY[branchOrder[i + 1]];
                    const mid = (y1 + y2) / 2;
                    return (
                      <Line
                        key={`lane-${br}`}
                        x1={0} y1={mid} x2={CANVAS_W} y2={mid}
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        opacity={0.04}
                        strokeDasharray="6,12"
                      />
                    );
                  })}

                  {/* Connection lines */}
                  {CONNECTIONS.map(c => {
                    const fp = NP[c.from];
                    const tp = NP[c.to];
                    if (!fp || !tp) return null;
                    const col      = BC[c.branch].color;
                    const bothDone = completedNodes.includes(c.from) && completedNodes.includes(c.to);
                    const fromUnlk = unlockedNodes.includes(c.from);

                    return (
                      <React.Fragment key={`${c.from}-${c.to}`}>
                        {/* Wide soft glow */}
                        <Line
                          x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                          stroke={col}
                          strokeWidth={bothDone ? 12 : 6}
                          opacity={bothDone ? 0.22 : 0.05}
                          strokeLinecap="round"
                        />
                        {/* Crisp foreground line */}
                        <Line
                          x1={fp.x} y1={fp.y} x2={tp.x} y2={tp.y}
                          stroke={col}
                          strokeWidth={bothDone ? 2.5 : fromUnlk ? 1.5 : 1}
                          opacity={bothDone ? 0.92 : fromUnlk ? 0.42 : 0.12}
                          strokeLinecap="round"
                          strokeDasharray={!fromUnlk ? '5,7' : undefined}
                        />
                      </React.Fragment>
                    );
                  })}
                </Svg>

                {/* Layer 2: Level column headers */}
                {LX.map((x, i) => (
                  <View
                    key={`lvl-hdr-${i}`}
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: x - 30,
                      top: 14,
                      width: 60,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={s.levelColLabel}>LVL {i + 1}</Text>
                    {/* Vertical guide line */}
                  </View>
                ))}

                {/* Layer 3: Glow halos (Animated, breathing) */}
                {SKILL_NODES.map(node => {
                  const pos    = NP[node.id];
                  if (!pos) return null;
                  const done   = completedNodes.includes(node.id);
                  const unlock = unlockedNodes.includes(node.id);
                  if (!unlock && !done) return null;
                  const col  = BC[node.branch].color;
                  const boss = node.level === 5;
                  const gr   = boss ? NR_BOSS : NR;

                  return (
                    <Animated.View
                      key={`hl-${node.id}`}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        width:  gr * 3.6,
                        height: gr * 3.6,
                        borderRadius: gr * 1.8,
                        left: pos.x - gr * 1.8,
                        top:  pos.y - gr * 1.8,
                        backgroundColor: col + (done ? '2A' : '18'),
                        opacity: done ? 0.9 : glowPulse,
                      }}
                    />
                  );
                })}

                {/* Layer 4: Nodes (interactive) */}
                {SKILL_NODES.map(node => {
                  const pos    = NP[node.id];
                  if (!pos) return null;
                  const done   = completedNodes.includes(node.id);
                  const unlock = unlockedNodes.includes(node.id);
                  const sel    = selectedId === node.id;
                  const col    = BC[node.branch].color;
                  const boss   = node.level === 5;
                  const r      = boss ? NR_BOSS : NR;
                  const d      = r * 2;

                  return (
                    <Animated.View
                      key={node.id}
                      style={{
                        position: 'absolute',
                        left: pos.x - r,
                        top:  pos.y - r,
                        transform: [{ scale: entryAnims[node.id] }],
                        zIndex: sel ? 20 : 10,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => handleNodePress(node)}
                        activeOpacity={0.75}
                        style={{
                          width: d, height: d, borderRadius: r,
                          alignItems: 'center', justifyContent: 'center',
                          backgroundColor: done
                            ? col + '28'
                            : unlock ? col + '14' : '#101020',
                          borderWidth: sel ? 2.5 : boss ? 2.5 : done ? 2 : 1.5,
                          borderColor: done
                            ? col
                            : sel ? col
                            : unlock ? col + '80' : '#1E1E3A',
                          shadowColor: (done || unlock) ? col : 'transparent',
                          shadowOffset: { width: 0, height: 0 },
                          shadowRadius: done ? 18 : sel ? 16 : unlock ? 9 : 0,
                          shadowOpacity: done ? 0.9 : sel ? 0.85 : 0.55,
                          elevation: done ? 14 : unlock ? 6 : 0,
                        }}
                      >
                        {done ? (
                          <Ionicons name="checkmark" size={boss ? 24 : 18} color={col} />
                        ) : !unlock ? (
                          <Ionicons name="lock-closed" size={13} color="#252545" />
                        ) : boss ? (
                          <Ionicons name="star" size={20} color={col} />
                        ) : (
                          <Ionicons name={BC[node.branch].icon} size={15} color={col} />
                        )}
                      </TouchableOpacity>

                      {/* Level ring badge on unlocked-but-incomplete nodes */}
                      {unlock && !done && (
                        <View style={[s.lvlBadge, { backgroundColor: col, borderColor: '#07070D' }]}>
                          <Text style={s.lvlBadgeText}>{node.level}</Text>
                        </View>
                      )}

                      {/* XP badge below boss nodes */}
                      {done && boss && (
                        <View style={[s.xpBadge, { backgroundColor: col + '30', borderColor: col + '50' }]}>
                          <Text style={[s.xpBadgeText, { color: col }]}>+{node.xpReward}</Text>
                        </View>
                      )}

                      {/* Node title label — shows below each node */}
                      <Text
                        numberOfLines={2}
                        style={[
                          s.nodeTitle,
                          {
                            color: done ? col : unlock ? col + 'BB' : '#252545',
                            width: d + 28,
                            left: -(14),
                          },
                        ]}
                      >
                        {node.title}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </Pressable>
          </ScrollView>
        </View>

        {/* ── Node Detail Panel ── */}
        <Animated.View
          style={[
            s.panel,
            {
              borderTopColor: selectedNode ? BC[selectedNode.branch].color + '50' : '#1A1A24',
              transform: [{ translateY: panelSlide }],
            },
          ]}
        >
          {selectedNode && (
            <NodePanel
              node={selectedNode}
              unlocked={unlockedNodes.includes(selectedNode.id)}
              completed={completedNodes.includes(selectedNode.id)}
              prerequisiteTitle={
                selectedNode.requires.length > 0
                  ? SKILL_NODES.find(n => n.id === selectedNode.requires[0])?.title
                  : undefined
              }
              onClose={() => setSelectedId(null)}
              onOpenLesson={() => {
                setSelectedId(null);
                if (onLessonPress) onLessonPress(selectedNode.lessonId);
              }}
              onMarkDone={() => {
                completeNode(selectedNode.id);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            />
          )}
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Node Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function NodePanel({
  node, unlocked, completed, prerequisiteTitle,
  onClose, onOpenLesson, onMarkDone,
}: {
  node: SkillNode;
  unlocked: boolean;
  completed: boolean;
  prerequisiteTitle?: string;
  onClose: () => void;
  onOpenLesson: () => void;
  onMarkDone: () => void;
}) {
  const col  = BC[node.branch].color;
  const boss = node.level === 5;

  const contentScale = useRef(new Animated.Value(0.92)).current;
  useEffect(() => {
    Animated.spring(contentScale, {
      toValue: 1, tension: 200, friction: 18, useNativeDriver: true,
    }).start();
  }, [node.id]);

  return (
    <Animated.View style={{ transform: [{ scale: contentScale }] }}>
      <View style={s.panelIndicator} />

      <View style={s.panelHeader}>
        <View style={[s.panelIconBox, { backgroundColor: col + '20' }]}>
          <Ionicons name={boss ? 'star' : BC[node.branch].icon} size={20} color={col} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.panelTitleRow}>
            <Text style={[s.panelBranchTag, { color: col }]}>
              {BC[node.branch].label} · LEVEL {node.level}
            </Text>
            {boss && (
              <View style={[s.masterBadge, { backgroundColor: col + '20', borderColor: col + '40' }]}>
                <Text style={[s.masterBadgeText, { color: col }]}>MASTERY</Text>
              </View>
            )}
          </View>
          <Text style={s.panelTitle} numberOfLines={2}>{node.title}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.closeBtn}>
          <Ionicons name="close" size={20} color="#555580" />
        </TouchableOpacity>
      </View>

      <Text style={s.panelDesc}>{node.description}</Text>

      {completed ? (
        <View style={[s.statusRow, { backgroundColor: col + '14', borderColor: col + '30' }]}>
          <Ionicons name="checkmark-circle" size={16} color={col} />
          <Text style={[s.statusText, { color: col }]}>Mastered · +{node.xpReward} XP earned</Text>
        </View>
      ) : !unlocked ? (
        <View style={[s.statusRow, { backgroundColor: '#F871711A', borderColor: '#F8717130' }]}>
          <Ionicons name="lock-closed-outline" size={15} color="#F87171" />
          <Text style={[s.statusText, { color: '#F87171' }]}>
            {prerequisiteTitle ? `Complete "${prerequisiteTitle}" first` : 'Complete prerequisites to unlock'}
          </Text>
        </View>
      ) : (
        <View style={[s.statusRow, { backgroundColor: col + '12', borderColor: col + '28' }]}>
          <Ionicons name="radio-button-on-outline" size={15} color={col} />
          <Text style={[s.statusText, { color: col }]}>Unlocked · {node.xpReward} XP available</Text>
        </View>
      )}

      {unlocked && !completed && (
        <View style={s.panelActions}>
          <TouchableOpacity
            onPress={onOpenLesson}
            style={[s.primaryActionBtn, { backgroundColor: col, shadowColor: col }]}
            activeOpacity={0.8}
          >
            <Ionicons name="book-outline" size={16} color="#07070D" />
            <Text style={s.primaryActionText}>Open Lesson</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onMarkDone}
            style={[s.secondaryActionBtn, { borderColor: col + '60' }]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color={col} />
            <Text style={[s.secondaryActionText, { color: col }]}>Mark Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {completed && (
        <TouchableOpacity
          onPress={onOpenLesson}
          style={[s.reviewBtn, { borderColor: col + '40' }]}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={15} color={col} />
          <Text style={[s.reviewBtnText, { color: col }]}>Review Lesson Again</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────────
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerMid: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 2 },
  headerSub:   { fontSize: 10, color: '#333360', fontWeight: '500', marginTop: 2 },
  levelBadge:  {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C47FF', shadowRadius: 10, shadowOpacity: 0.6,
    shadowOffset: { width: 0, height: 0 }, elevation: 8,
  },
  levelNum: { fontSize: 16, fontWeight: '900', color: '#FFF', lineHeight: 18 },
  levelLbl: { fontSize: 9,  fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },

  // ── XP bar ──────────────────────────────────────────────────────────────────
  xpRow:  { paddingHorizontal: 16, paddingBottom: 10, gap: 5 },
  xpTrack: { height: 5, borderRadius: 3, overflow: 'hidden' },
  xpFill:  {
    height: 5, borderRadius: 3, backgroundColor: '#6C47FF',
    shadowColor: '#6C47FF', shadowRadius: 6, shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
  },
  xpLabel: { fontSize: 10, color: '#333360', fontWeight: '500', textAlign: 'right' },

  // ── Fixed left branch label column ──────────────────────────────────────────
  labelCol: {
    width: LABEL_W,
    backgroundColor: '#07070D',
    position: 'relative',
    overflow: 'visible',
  },
  labelColEdge: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: 1,
    backgroundColor: '#FFFFFF08',
  },
  branchLabel: {
    position: 'absolute', left: 0, width: LABEL_W,
    alignItems: 'center', gap: 3,
  },
  branchIconRing: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  branchLblText:  { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, textAlign: 'center' },
  branchProgText: { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // ── Level column header labels (inside canvas) ───────────────────────────────
  levelColLabel: {
    fontSize: 8, fontWeight: '800', letterSpacing: 1.5,
    color: '#FFFFFF18', textAlign: 'center',
  },

  // ── Node level ring badge ────────────────────────────────────────────────────
  lvlBadge: {
    position: 'absolute', top: -6, right: -6,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  lvlBadgeText: { fontSize: 9, fontWeight: '900', color: '#07070D' },

  // ── Boss XP badge ────────────────────────────────────────────────────────────
  xpBadge: {
    position: 'absolute', bottom: -12, left: '50%',
    marginLeft: -22, paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1,
  },
  xpBadgeText: { fontSize: 8, fontWeight: '800' },

  // ── Node title label ─────────────────────────────────────────────────────────
  nodeTitle: {
    position: 'absolute',
    top: NR_BOSS * 2 + 6, // below node circle
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 11,
    letterSpacing: 0.1,
  },

  // ── Bottom detail panel ──────────────────────────────────────────────────────
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0C0C1A',
    borderTopWidth: 1.5,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 20,
  },
  panelIndicator: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#2A2A44',
    alignSelf: 'center', marginTop: 8, marginBottom: 16,
  },
  panelHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  panelIconBox:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  panelTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  panelBranchTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  masterBadge:    { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  masterBadgeText:{ fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  panelTitle:     { fontSize: 16, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3, lineHeight: 22 },
  closeBtn:       { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 4, flexShrink: 0 },
  panelDesc:      { fontSize: 13, color: '#4A4A70', lineHeight: 20, marginBottom: 14 },

  // Status row
  statusRow:  {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 12, borderWidth: 1, marginBottom: 14,
  },
  statusText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // Action buttons
  panelActions:      { flexDirection: 'row', gap: 10 },
  primaryActionBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 16,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  primaryActionText:  { fontSize: 14, fontWeight: '800', color: '#07070D', letterSpacing: 0.2 },
  secondaryActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5,
  },
  secondaryActionText:{ fontSize: 13, fontWeight: '700' },
  reviewBtn:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  reviewBtnText:      { fontSize: 13, fontWeight: '600' },
});
