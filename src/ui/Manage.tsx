import { ChangeEvent, FormEvent, useMemo, useState, useEffect } from 'react'
import { db, Move, movesToCSV, movesFromCSV, extractGifUrl } from '../utils/db'
import { useLiveQuery } from 'dexie-react-hooks'

const tagify = (s: string) => Array.from(new Set(s.split(',').map(t => t.trim()).filter(Boolean)))

export default function Manage() {
  const [query, setQuery] = useState('')
  const moves = useLiveQuery(() => db.moves.orderBy('name').toArray(), []) || []
  const filtered = useMemo(() => moves.filter(m => [m.name, m.description, m.tags.join(' ')].join(' ').toLowerCase().includes(query.toLowerCase())), [moves, query])

  // Calculate GIF extraction statistics
  const gifStats = useMemo(() => {
    const total = moves.length
    const withLibraryUrl = moves.filter(m => m.libraryUrl).length
    const withGif = moves.filter(m => m.gifUrl).length
    const needExtraction = moves.filter(m => m.libraryUrl && !m.gifUrl).length
    return { total, withLibraryUrl, withGif, needExtraction }
  }, [moves])

  const [form, setForm] = useState<Move>({ name: '', description: '', balls: 3, level: undefined, tags: [], relatedIds: [], libraryUrl: '', video: '', gifUrl: '' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [extractionProgress, setExtractionProgress] = useState<{ current: number; total: number; isExtracting: boolean } | null>(null)
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState<string>('')

  // On first run, load JugglingTricks.csv if DB is empty
  useEffect(() => {
    (async () => {
      if ((await db.moves.count()) === 0) {
        try {
          const csv = await fetch('/JugglingTricks.csv').then(r => r.text())
          const initial = movesFromCSV(csv)
          await db.moves.bulkAdd(initial)
        } catch {}
      }
    })()
  }, [])

  function downloadCSV() {
    const csv = movesToCSV(moves)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'JugglingTricks.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function uploadCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const imported = movesFromCSV(text)
    await db.moves.clear()
    await db.moves.bulkAdd(imported)
    setEditingId(null)
    setForm({ name: '', description: '', balls: 3, level: undefined, tags: [], relatedIds: [], libraryUrl: '', video: '', gifUrl: '' })
  }

  async function clearAll() {
    if (window.confirm('Are you sure you want to delete all moves? This action cannot be undone.')) {
      await db.moves.clear()
      setEditingId(null)
      setForm({ name: '', description: '', balls: 3, level: undefined, tags: [], relatedIds: [], libraryUrl: '', video: '', gifUrl: '' })
    }
  }

  async function extractGifs() {
    const movesToUpdate = moves.filter(m => m.libraryUrl && !m.gifUrl)
    if (movesToUpdate.length === 0) {
      alert('No moves found that need GIF extraction.')
      return
    }

    if (!confirm(`Extract GIFs for ${movesToUpdate.length} moves? This may take a few moments.`)) {
      return
    }

    setExtractionProgress({ current: 0, total: movesToUpdate.length, isExtracting: true })
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < movesToUpdate.length; i++) {
      const move = movesToUpdate[i]
      try {
        const gifUrl = await extractGifUrl(move.libraryUrl!)
        if (gifUrl) {
          await db.moves.update(move.id!, { gifUrl })
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        console.error(`Failed to extract GIF for ${move.name}:`, error)
        errorCount++
      }
      setExtractionProgress({ current: i + 1, total: movesToUpdate.length, isExtracting: true })
    }

    setExtractionProgress(null)
    alert(`GIF extraction complete!\nSuccess: ${successCount}\nFailed: ${errorCount}`)
  }

  async function bulkUpdateGifs() {
    const text = prompt('Paste GIF URLs (one per line, format: MoveName|GIF_URL):')
    if (!text) return

    const lines = text.split('\n').filter(line => line.trim())
    let successCount = 0
    let errorCount = 0

    for (const line of lines) {
      const [moveName, gifUrl] = line.split('|').map(s => s.trim())
      if (moveName && gifUrl) {
        try {
          const move = moves.find(m => m.name.toLowerCase() === moveName.toLowerCase())
          if (move) {
            await db.moves.update(move.id!, { gifUrl })
            successCount++
          } else {
            errorCount++
          }
        } catch (error) {
          errorCount++
        }
      }
    }

    alert(`Bulk update complete!\nSuccess: ${successCount}\nFailed: ${errorCount}`)
  }

  async function testGifExtraction() {
    if (!testUrl.trim()) {
      setTestResult('Please enter a Library of Juggling URL')
      return
    }

    setTestResult('Testing...')
    try {
      const gifUrl = await extractGifUrl(testUrl.trim())
      if (gifUrl) {
        setTestResult(`✅ GIF found: ${gifUrl}`)
      } else {
        setTestResult('❌ No GIF found for this URL')
      }
    } catch (error) {
      setTestResult(`❌ Error: ${error}`)
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const data: Move = { ...form, name: form.name.trim(), description: form.description.trim(), tags: tagify(form.tags.join(',')), libraryUrl: form.libraryUrl?.trim(), video: form.video?.trim(), gifUrl: form.gifUrl?.trim() }
    if (!data.name) return
    if (editingId) await db.moves.put({ ...data, id: editingId })
    else await db.moves.add(data)
    setForm({ name: '', description: '', balls: 3, level: undefined, tags: [], relatedIds: [], libraryUrl: '', video: '', gifUrl: '' })
    setEditingId(null)
  }

  async function remove(id?: number) {
    if (!id) return
    await db.moves.delete(id)
  }

  return (
    <div className="grid cols-2">
      <div className="card">
        <h3>Add or edit move</h3>
        <form className="grid" onSubmit={submit}>
          <label>Name
            <input className="input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </label>
          <label>Description
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </label>
          <div className="row">
            <label>balls
              <select value={form.balls} onChange={e => setForm(f => ({...f, balls: Number(e.target.value) as 3|4|5}))}>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </label>
            <label>level
              <input
                className="input"
                type="number"
                min={1}
                max={10}
                value={form.level || ''}
                onChange={e => setForm(f => ({...f, level: e.target.value ? Number(e.target.value) : undefined}))}
                placeholder="1-10"
              />
            </label>
            <label>tags (comma separated)
              <input className="input" value={form.tags.join(', ')} onChange={e => setForm(f => ({...f, tags: tagify(e.target.value)}))} placeholder="siteswap, mills mess, bodythrow" />
            </label>
          </div>
          <label>Library of juggling link
            <input className="input" type="url" value={form.libraryUrl} onChange={e => setForm(f => ({...f, libraryUrl: e.target.value}))} placeholder="https://libraryofjuggling.com/..." />
          </label>
          <label>Video URL
            <input className="input" type="url" value={form.video} onChange={e => setForm(f => ({...f, video: e.target.value}))} placeholder="https://youtube.com/..." />
          </label>
          <label>GIF URL (optional)
            <input className="input" type="url" value={form.gifUrl} onChange={e => setForm(f => ({...f, gifUrl: e.target.value}))} placeholder="https://libraryofjuggling.com/JugglingGifs/..." />
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                if (form.libraryUrl) {
                  const gifUrl = await extractGifUrl(form.libraryUrl)
                  if (gifUrl) {
                    setForm(f => ({...f, gifUrl}))
                    alert('GIF URL extracted successfully!')
                  } else {
                    alert('Could not extract GIF URL automatically. You can enter it manually.')
                  }
                } else {
                  alert('Please enter a Library of Juggling URL first.')
                }
              }}
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
            >
              Extract GIF
            </button>
            <span style={{ fontSize: '0.8rem', color: '#666' }}>Auto-extract from Library URL</span>
          </div>
          <label>Related move IDs (comma separated)
            <input className="input" value={form.relatedIds.join(', ')} onChange={e => setForm(f => ({...f, relatedIds: e.target.value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n))}))} placeholder="optional" />
          </label>
          <div className="row">
            <button className="button" type="submit">{editingId ? 'Update' : 'Add'} move</button>
            {editingId && <button type="button" className="button secondary" onClick={() => { setEditingId(null); setForm({ name: '', description: '', balls: 3, level: undefined, tags: [], relatedIds: [], libraryUrl: '', video: '', gifUrl: '' }) }}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Moves</h3>

        {/* GIF Status Summary */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>GIF Status</h4>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#28a745', fontWeight: 'bold' }}>●</span>
              <span>{gifStats.withGif} with GIFs</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#ffc107', fontWeight: 'bold' }}>●</span>
              <span>{gifStats.needExtraction} need extraction</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#6c757d', fontWeight: 'bold' }}>●</span>
              <span>{gifStats.withLibraryUrl - gifStats.withGif - gifStats.needExtraction} no library URL</span>
            </div>
          </div>
        </div>

        {/* Extraction Progress */}
        {extractionProgress && (
          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px',
            border: '1px solid #b3d9ff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span>Extracting GIFs...</span>
              <span>{extractionProgress.current}/{extractionProgress.total}</span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#d1ecf1',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(extractionProgress.current / extractionProgress.total) * 100}%`,
                height: '100%',
                backgroundColor: '#007acc',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}

        {/* GIF Extraction Test */}
        <div style={{
          backgroundColor: '#fff3cd',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '12px',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#856404' }}>Test GIF Extraction</h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="url"
              placeholder="https://libraryofjuggling.com/Tricks/3balltricks/Cascade.html"
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
            <button
              className="button secondary"
              onClick={testGifExtraction}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Test
            </button>
            <button
              className="button secondary"
              onClick={() => setTestUrl('https://libraryofjuggling.com/Tricks/3balltricks/Cascade.html')}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            >
              Use Test URL
            </button>
          </div>
          {testResult && (
            <div style={{
              marginTop: '8px',
              padding: '6px 8px',
              backgroundColor: 'white',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              wordBreak: 'break-all'
            }}>
              {testResult}
            </div>
          )}
        </div>

        <div className="row" style={{marginBottom: 8}}>
          <button className="button secondary" type="button" onClick={downloadCSV}>Download CSV</button>
          <label className="button secondary" style={{margin: 0}}>
            Upload CSV
            <input type="file" accept=".csv" style={{display: 'none'}} onChange={uploadCSV} />
          </label>
          <button
            className="button"
            type="button"
            onClick={extractGifs}
            disabled={extractionProgress?.isExtracting}
            style={{
              backgroundColor: extractionProgress?.isExtracting ? '#6c757d' : '#28a745',
              cursor: extractionProgress?.isExtracting ? 'not-allowed' : 'pointer'
            }}
          >
            {extractionProgress?.isExtracting ? 'Extracting...' : 'Extract GIFs'}
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={bulkUpdateGifs}
            style={{ backgroundColor: '#17a2b8' }}
          >
            Bulk Update GIFs
          </button>
          <button className="button danger" type="button" onClick={clearAll}>Clear All</button>
        </div>
        <input className="input" placeholder="search" value={query} onChange={e => setQuery(e.target.value)} />
        <div style={{marginTop: 12}}>
          {filtered.map(m => (
            <div key={m.id} className="row" style={{justifyContent: 'space-between'}}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <strong>{m.name}</strong>
                  <span className="small">({m.balls} balls)</span>
                  {/* GIF Status Indicator */}
                  {m.gifUrl ? (
                    <span
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}
                      title="Has GIF"
                    >
                      GIF ✓
                    </span>
                  ) : m.libraryUrl ? (
                    <span
                      style={{
                        backgroundColor: '#ffc107',
                        color: '#212529',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}
                      title="Needs GIF extraction"
                    >
                      GIF ?
                    </span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: '#6c757d',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}
                      title="No library URL"
                    >
                      No URL
                    </span>
                  )}
                </div>
                <div className="small">{m.description}</div>
                <div className="row" style={{marginTop: 4}}>
                  {m.tags.map(t => <span key={t} className="badge">{t}</span>)}
                </div>
              </div>
              <div className="row">
                <button className="button secondary" onClick={() => { setEditingId(m.id!); setForm(m) }}>Edit</button>
                <button className="button danger" onClick={() => remove(m.id)}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="small">No matches.</p>}
        </div>
      </div>
    </div>
  )
}
