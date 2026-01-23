import { useEffect, useState } from "react";
import "./App.css";

interface Message {
  id: string;
  content: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const fetchMessages = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/messages");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      // SurrealDB returns array of results? Or just data?
      // Based on my backend: return c.JSON(http.StatusOK, data)
      // data comes from db.Select("message")
      setMessages(data as Message[]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    try {
      const res = await fetch("http://localhost:8080/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      if (res.ok) {
        setInput("");
        fetchMessages();
      }
    } catch (err) {
      console.error(err);
    }
  };

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

        <ul style={{ textAlign: "left", marginTop: "20px" }}>
          {messages &&
            messages.map((msg) => (
              <li key={msg.id}>{msg.content || JSON.stringify(msg)}</li>
            ))}
        </ul>
      </div>
    </>
  );
}

export default App;
