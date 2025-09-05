import { Outlet, Link } from 'react-router-dom'

export default function App() {
  return (
    <div className="app">
      <h1>Juggling Flashcards</h1>
      <nav>
        <Link to="/">Practice</Link> | <Link to="/manage">Manage</Link>
      </nav>
      <Outlet />
    </div>
  )
}