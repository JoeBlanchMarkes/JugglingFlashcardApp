import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './ui/App'
import Practice from './ui/Practice'
import Manage from './ui/Manage'
import './styles.css'

// Handle GitHub Pages redirect
const getPathFromQuery = () => {
  const query = window.location.search
  if (query.startsWith('/?')) {
    const path = query.slice(2).split('&')[0].replace(/~and~/g, '&')
    window.history.replaceState(null, '', path)
    return path
  }
  return window.location.pathname
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Practice /> },
      { path: 'manage', element: <Manage /> },
    ],
  },
], {
  basename: import.meta.env.DEV ? '/JugglingFlashcardApp' : '/JugglingFlashcardApp'
})

// Set initial path from query if redirected
const initialPath = getPathFromQuery()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
