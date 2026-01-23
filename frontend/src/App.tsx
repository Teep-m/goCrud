import { useEffect, useState } from 'react'
import './App.css'

interface Message {
  id: any
  content: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  const fetchMessages = async () => {
    try {
      const res = await fetch('http://localhost:8084/api/messages')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setMessages(data as Message[])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input) return

    try {
      const res = await fetch('http://localhost:8084/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input })
      })
      if (res.ok) {
        setInput('')
        fetchMessages()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getDisplayID = (id: any) => {
      if (typeof id === 'string') return id
      return JSON.stringify(id)
  }

  return (
    <>
      <h1>Go + React + SurrealDB</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
        
        <ul style={{ textAlign: 'left', marginTop: '20px' }}>
          {messages && messages.map((msg, index) => (
            <li key={getDisplayID(msg.id) || index}>
                {msg.content} <span style={{fontSize: '0.8em', color: '#888'}}>({getDisplayID(msg.id)})</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}

export default App
