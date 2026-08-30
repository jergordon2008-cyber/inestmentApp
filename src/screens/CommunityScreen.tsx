import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { showAlert } from '../utils/alert';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useUserStore } from '../services/userStore';
import { createForumPost, listForumPosts, ForumPost } from '../services/firestoreSync';

interface Props {
  onBack: () => void;
}

// Leaderboard and Challenges used to live here as hardcoded mock data,
// duplicating (with fake names/numbers) the real Firestore-backed versions
// in ClassroomScreen (portfolio rankings) and SocialScreen (weekly
// challenges). Removed rather than shown alongside real data.
//
// Forum posts were also fake (4 hardcoded fictional authors) with a "Post"
// button that showed a success alert and saved nothing. This now reads and
// writes real posts via firestoreSync — no fake engagement counts (upvotes/
// comments) since we don't track those yet; better to show nothing than a
// fabricated number.

function InitialAvatar({ name, size = 32, color }: { name: string; size?: number; color: string }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: color + '20',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontWeight: '800', fontSize: size * 0.4 }}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function CommunityScreen({ onBack }: Props) {
  const { theme } = useTheme();
  const user = useUserStore(s => s.user);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);

  const loadPosts = () => {
    setLoading(true);
    listForumPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPosts(); }, []);

  const handlePost = async () => {
    if (!user) { showAlert('Sign in required', 'You need to be signed in to post.'); return; }
    if (!newTitle.trim() || !newBody.trim()) {
      showAlert('Missing info', 'Add a title and a bit of detail before posting.');
      return;
    }
    setPosting(true);
    try {
      await createForumPost({
        authorUid: user.id,
        authorName: user.displayName || 'Investor',
        title: newTitle.trim(),
        body: newBody.trim(),
      });
      setShowNewPost(false);
      setNewTitle('');
      setNewBody('');
      loadPosts();
    } catch (e: any) {
      showAlert('Could not post', e?.message ?? 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.back, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Forum</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.forumTopRow}>
          <Text style={[styles.sectionSub, { color: theme.colors.textSecondary, flex: 1 }]}>
            Share trades, insights, and lessons with the community.
          </Text>
          <TouchableOpacity
            onPress={() => setShowNewPost(!showNewPost)}
            style={[styles.newPostBtn, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.newPostBtnTxt}>+ Post</Text>
          </TouchableOpacity>
        </View>

        {showNewPost && (
          <Card style={styles.newPostCard}>
            <Text style={[styles.newPostLabel, { color: theme.colors.textPrimary }]}>Share your insight</Text>
            <TextInput
              style={[styles.newPostTitleInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}
              placeholder="Title"
              placeholderTextColor={theme.colors.textTertiary}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.newPostInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}
              placeholder="What did you learn or trade today?"
              placeholderTextColor={theme.colors.textTertiary}
              value={newBody}
              onChangeText={setNewBody}
              multiline
              numberOfLines={4}
            />
            <View style={styles.newPostBtns}>
              <Button title="Cancel" variant="secondary" onPress={() => { setShowNewPost(false); setNewTitle(''); setNewBody(''); }} style={{ flex: 1 }} />
              <Button title={posting ? 'Posting…' : 'Post'} variant="primary" onPress={handlePost} style={{ flex: 1 }} />
            </View>
          </Card>
        )}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 24 }} />
        ) : posts.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No posts yet — be the first to share something.
          </Text>
        ) : (
          posts.map(post => {
            const expanded = expandedPost === post.id;
            return (
              <Card key={post.id} style={styles.postCard}>
                <View style={styles.postHeader}>
                  <InitialAvatar name={post.authorName} color={theme.colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.postAuthor, { color: theme.colors.textPrimary }]}>{post.authorName}</Text>
                    <Text style={[styles.postTime, { color: theme.colors.textTertiary }]}>{timeAgo(post.createdAt)}</Text>
                  </View>
                </View>

                <Text style={[styles.postTitle, { color: theme.colors.textPrimary }]}>{post.title}</Text>
                <Text style={[styles.postBody, { color: theme.colors.textSecondary }]} numberOfLines={expanded ? undefined : 3}>
                  {post.body}
                </Text>

                {post.body.length > 140 && (
                  <TouchableOpacity onPress={() => setExpandedPost(expanded ? null : post.id)}>
                    <Text style={[styles.readMore, { color: theme.colors.primary }]}>
                      {expanded ? 'Show less' : 'Read more'}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 50 },
  sectionSub: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 32, lineHeight: 20 },
  forumTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  newPostBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  newPostBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
  newPostCard: { marginBottom: 16 },
  newPostLabel: { fontSize: 15, fontWeight: '600', marginBottom: 10 },
  newPostTitleInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10 },
  newPostInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
  newPostBtns: { flexDirection: 'row', gap: 10 },
  postCard: { marginBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  postAuthor: { fontSize: 14, fontWeight: '600' },
  postTime: { fontSize: 11, marginTop: 1 },
  postTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  postBody: { fontSize: 13, lineHeight: 19, marginBottom: 6 },
  readMore: { fontSize: 13, fontWeight: '500' },
});
