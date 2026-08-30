/**
 * Curated YouTube Videos for InvestIQ Lessons
 *
 * Hand-picked: all verified under 6 minutes, high quality, reputable channels.
 * Keyed by lesson ID — drop a new entry here to add a video to any lesson.
 *
 * To add more videos:
 *   1. Find a video on YouTube (under 6 min, reputable source)
 *   2. Copy the video ID from the URL (the part after v=)
 *   3. Add an entry below with the matching lesson ID as the key
 */

export interface LessonVideo {
  videoId:  string;  // YouTube video ID (from youtube.com/watch?v=THIS_PART)
  title:    string;  // Video title as shown on YouTube
  channel:  string;  // Channel / creator name
  duration: string;  // Video length as "M:SS"
  tier:     1 | 2 | 3;
}

export const LESSON_VIDEOS: Record<string, LessonVideo> = {

  // ── TIER 1 — Beginner ─────────────────────────────────────────────────────
  T1L01: {
    videoId:  'p7HKvqRI_Bo',
    title:    'How does the stock market work?',
    channel:  'TED-Ed',
    duration: '4:24',
    tier:     1,
  },
  T1L05: {
    videoId:  'jTW777ENc3c',
    title:    'Compound Interest Explained in One Minute',
    channel:  'One Minute Economics',
    duration: '1:01',
    tier:     1,
  },

  // ── TIER 2 — Intermediate ─────────────────────────────────────────────────
  T2L05: {
    videoId:  'CMQLdJa64Wk',
    title:    'How do investors choose stocks?',
    channel:  'TED-Ed',
    duration: '5:07',
    tier:     2,
  },
  T2L13: {
    videoId:  'z-3LSDIbnGE',
    title:    "Warren Buffett's Value Investing Strategy",
    channel:  'CNBC',
    duration: '5:30',
    tier:     2,
  },

  // ── TIER 3 — Expert (add as you build advanced content) ───────────────────
  // Example format:
  // T3L01: {
  //   videoId:  'YOUR_VIDEO_ID',
  //   title:    'Video Title',
  //   channel:  'Channel Name',
  //   duration: '5:45',
  //   tier:     3,
  // },
};
