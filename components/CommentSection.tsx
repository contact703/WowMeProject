import { useState, useEffect } from 'react'
import theme from '@/lib/theme'

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

      const data = await response.json()

      if (data.success) {
        setNewComment('')
        loadComments()
      } else {
        alert('Failed to post comment')
      }
    } catch (error) {
      console.error('Error posting comment:', error)
      alert('Failed to post comment')
    } finally {
      setSubmitting(false)
      setModerating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800">
          <h3 className="text-xl md:text-2xl font-bold">Comments ({comments.length})</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition text-2xl"
          >
            ×
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className={theme.classes.spinner + ' h-8 w-8 mx-auto mb-2'}></div>
              <p className="text-gray-400">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-2">No comments yet</p>
              <p className="text-gray-500 text-sm">Be the first to share your thoughts!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={theme.classes.cardCompact}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-xl flex-shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img 
                        src={comment.profiles.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full rounded-full object-cover" 
                      />
                    ) : (
                      '👤'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {comment.profiles?.display_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-300 break-words">{comment.text}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Form */}
        <div className="border-t border-gray-800 p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className={theme.classes.textarea + ' h-24'}
              disabled={submitting}
            />
            
            {moderating && (
              <div className="text-sm text-yellow-500 flex items-center gap-2">
                <div className={theme.classes.spinner + ' h-4 w-4'}></div>
                AI is checking your comment...
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Comments are moderated by AI to keep our community safe
              </p>
              <button
                type="submit"
                disabled={submitting || !newComment.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  submitting || !newComment.trim()
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30'
                }`}
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

