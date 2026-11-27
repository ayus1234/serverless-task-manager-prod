import { useEffect, useState } from 'react'
import './App.css'

const API = 'https://7kdibsbwkc.execute-api.us-east-1.amazonaws.com/prod/tasks'

export default function App() {
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium' })
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    const res = await fetch(API)
    const data = await res.json()
    setTasks(data.items || [])
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const method = editingId ? 'PUT' : 'POST'
    const url = editingId ? `${API}/${editingId}` : API
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Request failed')
      return
    }
    setForm({ title: '', description: '', status: 'todo', priority: 'medium' })
    setEditingId(null)
    await load()
  }

  const edit = (task) => {
    setEditingId(task.id)
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
    })
  }

  const remove = async (id) => {
    await fetch(`${API}/${id}`, { method: 'DELETE' })
    await load()
  }

  const statusClass = (s) => `status-${s}`

  return (
    <div className="app">
      <header>
        <h1>Task Manager</h1>
        <p>Serverless CRUD demo (Lambda + API Gateway + DynamoDB)</p>
      </header>

      <form onSubmit={submit} className="form">
        <input
          type="text"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          <option value="todo">todo</option>
          <option value="in-progress">in-progress</option>
          <option value="done">done</option>
        </select>
        <select
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: e.target.value })}
        >
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <button type="submit">{editingId ? 'Update Task' : 'Create Task'}</button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null)
              setForm({ title: '', description: '', status: 'todo', priority: 'medium' })
            }}
          >
            Cancel
          </button>
        )}
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="empty">No tasks yet. Create one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t.id} className="task">
              <span className={statusClass(t.status)}>{t.status}</span>
              <div className="task-body">
                <h3>{t.title}</h3>
                {t.description && <p>{t.description}</p>}
                <div className="meta">
                  <span className={`pri-${t.priority}`}>{t.priority}</span>
                  <span className="date">{t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</span>
                </div>
              </div>
              <div className="actions">
                <button onClick={() => edit(t)}>Edit</button>
                <button onClick={() => remove(t.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}