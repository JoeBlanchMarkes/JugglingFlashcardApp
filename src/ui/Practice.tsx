import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, Move } from '../utils/db'

function useInterval(callback: () => void, delay: number | null) {
  const savedRef = useRef(callback)
  useEffect(() => { savedRef.current = callback }, [callback])
  useEffect(() => {
    if (delay === null) return
    const id = setInterval(() => savedRef.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}

export default function Practice() {
  const [balls, setBalls] = useState<3 | 4 | 5>(3)
  const [seconds, setSeconds] = useState(6)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<'select' | 'practice'>('select')
  const [countdown, setCountdown] = useState(seconds)
  const [randomize, setRandomize] = useState(true)
  const [shuffledPool, setShuffledPool] = useState<Move[]>([])
  const [sessions, setSessions] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem('jugglingSessions')
    return saved ? JSON.parse(saved) : {}
  })
  const [showGifs, setShowGifs] = useState(true)

  const moves = useLiveQuery(() => db.moves.where('balls').equals(balls).toArray(), [balls]) || []
  const pool = useMemo(() => (selectedIds.length ? moves.filter((m: Move) => selectedIds.includes(m.id!)) : moves), [moves, selectedIds])
  const practicePool = mode === 'practice' ? shuffledPool : pool

  const [index, setIndex] = useState(0)
  const current = practicePool[index % Math.max(practicePool.length, 1)]

  useEffect(() => {
    setCountdown(seconds)
  }, [seconds])

  useInterval(() => {
    if (running && practicePool.length) {
      setCountdown(c => {
        if (c <= 1) {
          setIndex(i => (i + 1) % practicePool.length)
          return seconds
        }
        return c - 1
      })
    }
  }, running ? 1000 : null)

  const allSelected = selectedIds.length && selectedIds.length === moves.length

  function saveSession() {
    const name = prompt('Enter session name:')
    if (name && selectedIds.length) {
      const newSessions = { ...sessions, [name]: selectedIds }
      setSessions(newSessions)
      localStorage.setItem('jugglingSessions', JSON.stringify(newSessions))
    }
  }

  function loadSession(name: string) {
    setSelectedIds(sessions[name] || [])
  }

  function deleteSession(name: string) {
    const newSessions = { ...sessions }
    delete newSessions[name]
    setSessions(newSessions)
    localStorage.setItem('jugglingSessions', JSON.stringify(newSessions))
  }

  function startPractice() {
    if (pool.length) {
      const practiceMoves = randomize ? [...pool].sort(() => Math.random() - 0.5) : pool
      setShuffledPool(practiceMoves)
      setMode('practice')
      setIndex(0)
      setCountdown(seconds)
      setRunning(true)
    }
  }

  function backToSelect() {
    setMode('select')
    setRunning(false)
    setShuffledPool([])
  }

  if (mode === 'practice') {
    return (
      <div className="card flash-card" style={{
        maxWidth: '600px',
        margin: '20px auto',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderRadius: '12px'
      }}>
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          {/* GIF Status Indicator */}
          {(() => {
            const withGifs = practicePool.filter((m: Move) => m.gifUrl).length
            const total = practicePool.length
            return total > 0 ? (
              <div
                style={{
                  backgroundColor: withGifs > 0 ? '#28a745' : '#6c757d',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
                title={`${withGifs}/${total} moves have GIFs`}
              >
                GIF: {withGifs}/{total}
              </div>
            ) : null
          })()}
          <button
            className="button secondary"
            onClick={backToSelect}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          >
            Back to Select
          </button>
        </div>
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '2rem',
            color: '#007acc',
            fontWeight: 'bold',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '8px 16px',
            borderRadius: '20px',
            minWidth: '120px',
            textAlign: 'center'
          }}>
            {countdown}s
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            maxWidth: '400px'
          }}>
            <button
              className="button secondary"
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                flex: 1,
                margin: '0 4px'
              }}
            >
              Previous
            </button>
            <button
              className="button secondary"
              onClick={() => setRunning(r => !r)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                flex: 1,
                margin: '0 4px'
              }}
            >
              {running ? 'Pause' : 'Resume'}
            </button>
            <button
              className="button secondary"
              onClick={() => setIndex(i => (i + 1) % practicePool.length)}
              style={{
                padding: '12px 20px',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                flex: 1,
                margin: '0 4px'
              }}
            >
              Next
            </button>
          </div>
        </div>
        {current ? (
          <div style={{
            textAlign: 'center',
            padding: '20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#333',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {current.name}
            </h2>
            {showGifs && current.gifUrl && (
              <div style={{
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <img
                  src={current.gifUrl}
                  alt={`${current.name} animation`}
                  style={{
                    // Force a roughly square display while remaining responsive
                    width: 'min(60vw, 320px)',
                    height: 'min(60vw, 320px)',
                    maxWidth: '100%',
                    maxHeight: '320px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    backgroundColor: 'white',
                    padding: '8px'
                  }}
                  onError={(e) => {
                    // Hide broken images
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
            <div style={{
              marginBottom: '16px',
              fontSize: '1.2rem',
              color: '#666',
              lineHeight: '1.4'
            }}>
              {current.description}
            </div>
            {current.level && (
              <div style={{
                marginBottom: '16px',
                fontSize: '1.1rem',
                color: '#007acc',
                fontWeight: '600',
                backgroundColor: '#e7f3ff',
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: '20px',
                margin: '0 auto 16px auto'
              }}>
                Level: {current.level}
              </div>
            )}
            {current.tags.length > 0 && (
              <div style={{
                marginBottom: '20px',
                fontSize: '1rem',
                color: '#888',
                fontStyle: 'italic'
              }}>
                Tags: {current.tags.join(', ')}
              </div>
            )}
            <div style={{
              marginTop: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center'
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <button
                  className="button secondary"
                  onClick={() => setShowGifs(!showGifs)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.9rem'
                  }}
                >
                  {showGifs ? 'Hide' : 'Show'} GIFs
                </button>
              </div>
              {current.libraryUrl && (
                <a
                  href={current.libraryUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Library of Juggling
                </a>
              )}
              {current.video && (
                <a
                  href={current.video}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    backgroundColor: '#007acc',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Video Tutorial
                </a>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            fontSize: '1.2rem',
            fontStyle: 'italic'
          }}>
            No moves selected.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h3 style={{ marginBottom: '20px', color: '#333', fontSize: '1.5rem' }}>Select Moves</h3>
      <div className="row" style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px', gap: '16px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#555' }}>Balls</span>
          <select
            value={balls}
            onChange={e => setBalls(Number(e.target.value) as 3|4|5)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#555' }}>Seconds per card</span>
          <input
            className="input"
            type="number"
            min={1}
            value={seconds}
            onChange={e => setSeconds(Math.max(1, Number(e.target.value)))}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '500', color: '#555' }}>
          <input
            type="checkbox"
            checked={randomize}
            onChange={e => setRandomize(e.target.checked)}
          />
          Randomize order
        </label>
      </div>

      <div className="row" style={{ marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <button
          className="button secondary"
          onClick={() => setSelectedIds([])}
          style={{ padding: '10px 16px', borderRadius: '6px' }}
        >
          Clear selection
        </button>
        <button
          className="button secondary"
          onClick={() => setSelectedIds(moves.map((m: Move) => m.id!))}
          style={{ padding: '10px 16px', borderRadius: '6px' }}
        >
          Select all
        </button>
        <button
          className="button"
          onClick={saveSession}
          disabled={!selectedIds.length}
          style={{ padding: '10px 16px', borderRadius: '6px' }}
        >
          Save Session
        </button>
        <button
          className="button"
          onClick={startPractice}
          disabled={!pool.length}
          style={{ padding: '10px 16px', borderRadius: '6px', backgroundColor: '#28a745', borderColor: '#28a745' }}
        >
          Start Practice
        </button>
        <span className="small" style={{ alignSelf: 'center', color: '#666', fontSize: '0.9rem' }}>
          {selectedIds.length ? `${selectedIds.length} of ${moves.length} selected` : `All ${moves.length} moves`}
        </span>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '12px', color: '#333', fontSize: '1.2rem' }}>Saved Sessions</h4>
        {Object.keys(sessions).map(name => (
          <div key={name} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <span style={{ fontWeight: '500' }}>{name} <span style={{ color: '#666', fontSize: '0.9rem' }}>({sessions[name].length} moves)</span></span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="button secondary"
                onClick={() => loadSession(name)}
                style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
              >
                Load
              </button>
              <button
                className="button danger"
                onClick={() => deleteSession(name)}
                style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {Object.keys(sessions).length === 0 && (
          <p className="small" style={{ color: '#666', fontStyle: 'italic' }}>
            No saved sessions.
          </p>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        {/* GIF Status Summary */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#555' }}>GIF Status:</span>
            {(() => {
              const withGifs = moves.filter((m: Move) => m.gifUrl).length
              const needExtraction = moves.filter((m: Move) => m.libraryUrl && !m.gifUrl).length
              const noUrl = moves.filter((m: Move) => !m.libraryUrl).length
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>●</span>
                    <span style={{ fontSize: '0.9rem' }}>{withGifs} with GIFs</span>
                  </div>
                  {needExtraction > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#ffc107', fontWeight: 'bold' }}>●</span>
                      <span style={{ fontSize: '0.9rem' }}>{needExtraction} need extraction</span>
                    </div>
                  )}
                  {noUrl > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#6c757d', fontWeight: 'bold' }}>●</span>
                      <span style={{ fontSize: '0.9rem' }}>{noUrl} no library URL</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {moves.map((m: Move) => (
          <label key={m.id} className="row" style={{justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0', cursor: 'pointer'}}>
            <span style={{display: 'flex', alignItems: 'center'}}>
              <input
                type="checkbox"
                checked={selectedIds.includes(m.id!)}
                onChange={e => setSelectedIds(v => e.target.checked ? [...v, m.id!] : v.filter(id => id !== m.id))}
                style={{marginRight: '12px'}}
              />
              <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                {/* GIF Status Indicator */}
                {m.gifUrl ? (
                  <span
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}
                    title="Has GIF"
                  >
                    GIF
                  </span>
                ) : m.libraryUrl ? (
                  <span
                    style={{
                      backgroundColor: '#ffc107',
                      color: '#212529',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 'bold'
                    }}
                    title="Needs GIF extraction"
                  >
                    ?
                  </span>
                ) : null}
                <div>
                  <div style={{fontWeight: '500', fontSize: '1rem'}}>{m.name}</div>
                  <div style={{fontSize: '0.85rem', color: '#666', marginTop: '2px'}}>
                    {m.level && <span style={{color: '#007acc', fontWeight: '500'}}>Level: {m.level}</span>}
                    {m.level && m.tags.length > 0 && <span style={{margin: '0 6px'}}>•</span>}
                    {m.tags.length > 0 && <span>Tags: {m.tags.join(', ')}</span>}
                  </div>
                </div>
              </div>
            </span>
            <div style={{display: 'flex', gap: '8px'}}>
              <a
                className="small"
                href={m.libraryUrl || '#'}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#f0f0f0',
                  color: '#333',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}
              >
                Library
              </a>
              {m.video && (
                <a
                  className="small"
                  href={m.video}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#007acc',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}
                >
                  Video
                </a>
              )}
            </div>
          </label>
        ))}
        {moves.length === 0 && (
          <p className="small" style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
            No moves yet for {balls} balls. Add some in Manage.
          </p>
        )}
      </div>
    </div>
  )
}
