'use client';

import { useState } from 'react';
import { feedbackApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { MessageSquare, X, Send, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  courseId?: number;
}

export default function FeedbackModal({ courseId }: Props) {
  const { user } = useAuth();
  const [open, setOpen]       = useState(false);
  const [text, setText]       = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await feedbackApi.submit({
        feedback_text: text,
        course_id: courseId,
        user_id: user?._id,
      });
      toast.success('Thank you! Your feedback has been submitted.');
      setText('');
      setOpen(false);
    } catch {
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <MessageSquare className="h-4 w-4" />
        Leave Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold">Share Your Feedback</h2>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Your feedback helps us improve. It will be analysed by our AI system and reviewed by the team.
            </p>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What did you think about this course? What could be improved?"
              rows={5}
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:ring-2 ring-primary/30 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || !text.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : <><Send className="h-4 w-4" /> Submit</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
