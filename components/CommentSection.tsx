'use client'

import { useState, useEffect } from 'react'

interface Comment {
  id: string
  text: string
  created_at: string
  profiles: {
    display_name: string
    avatar_url: string | null
  }
}

interface CommentSectionProps {
  suggestedId: string
  isOpen: boolean
  onClose: () => void
  initialCount: number
}

export default function CommentSection({ suggestedId, isOpen, onClose, initialCount }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [moderating, setModerating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadComments()
    }
  }, [isOpen, suggestedId])

  const loadComments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/comment?suggestedId=${suggestedId}`)
      const data = await response.json()
      
      if (data.success) {
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return

    setSubmitting(true)
    setModerating(true)

    try {
      // First, moderate the comment
      const moderationResponse = await fetch('/api/moderate-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment }),
      })

      const moderationData = await moderationResponse.json()
      setModerating(false)

      if (!moderationData.approved) {
        alert(`Comment rejected: ${moderationData.reason || 'Content violates community guidelines'}`)
        setSubmitting(false)
        return
      }

      // If approved, submit the comment
      const response = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestedId,
          text: newComment,
        }),
      })

      if (response.ok) {
        setNewComment('')
        loadComments() // Reload comments
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to post comment')
      }
    } catch (error) {
      console.error('Error submitting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
      setModerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-2xl font-bold">💬 Comments ({comments.length})</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              <p className="mt-2 text-gray-400">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-lg">No comments yet</p>
              <p className="text-sm mt-2">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">👤</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{comment.profiles.display_name}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-200">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="p-6 border-t border-white/10">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts... (AI will check for inappropriate content)"
            className="w-full bg-white/5 border border-white/20 rounded-lg p-3 text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 transition"
            rows={3}
            disabled={submitting}
          />
          
          {moderating && (
            <div className="mt-2 text-sm text-yellow-400 flex items-center gap-2">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-400"></div>
              AI is checking your comment for inappropriate content...
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-400">
              ✨ Comments are moderated by AI to keep our community safe
            </p>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
