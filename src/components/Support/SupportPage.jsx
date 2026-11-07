import { useState } from 'react'
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react'
import { submitSupportMessage } from '@/services/adminService'

export default function SupportPage() {
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [message, setMessage] = useState('')
  const [status,  setStatus]  = useState('idle') // idle | loading | success | error
  const [errMsg,  setErrMsg]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('loading')
    setErrMsg('')
    try {
      await submitSupportMessage({ name, email, message })
      setStatus('success')
      setName('')
      setEmail('')
      setMessage('')
    } catch (err) {
      setErrMsg(err.message)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-f1red/20 border border-f1red/40 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7 text-f1red" />
          </div>
          <h1 className="text-2xl font-black text-white">Collush Sports Support</h1>
          <p className="text-gray-400 text-sm">
            Have a question or issue? Send us a message and we'll get back to you.
          </p>
        </div>

        {/* Success state */}
        {status === 'success' ? (
          <div className="bg-green-900/30 border border-green-700 rounded-2xl px-6 py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Message Sent!</h2>
            <p className="text-gray-400 text-sm">
              We received your message and will follow up if you provided an email.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-2 text-sm text-green-400 underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Name <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Email <span className="text-gray-600 normal-case font-normal">(optional, for reply)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={5}
                placeholder="Describe your issue or question…"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {errMsg || 'Something went wrong. Please try again.'}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-f1red hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
            >
              {status === 'loading' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {status === 'loading' ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-600">
          Collush Sports · Fantasy Sports Platform
        </p>
      </div>
    </div>
  )
}
