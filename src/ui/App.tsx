import { NavLink, Outlet } from 'react-router-dom'

export default function App() {
  return (
    <div className="app-shell">
      <div className="topbar">
        <strong>Juggling Flashcards</strong>
        <NavLink to="/" end>Practice</NavLink>
        <NavLink to="/manage">Manage</NavLink>
      </div>
      <div className="container">
        <Outlet />
      </div>
    </div>
  )
}
