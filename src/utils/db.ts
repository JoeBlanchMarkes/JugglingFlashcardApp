import Dexie, { Table } from 'dexie'
import Papa from 'papaparse'

export interface Move {
  id?: number
  name: string
  description: string
  balls: 3 | 4 | 5
  level?: number
  tags: string[]
  relatedIds: number[]
  libraryUrl?: string
  video?: string
  gifUrl?: string
}

export function movesToCSV(moves: Move[]): string {
  const rows = moves.map(m => ({
    Trick: m.name,
    Level: m.level || '',
    Balls: m.balls,
    Link: m.libraryUrl || '',
    Video: m.video || '',
    GIF: m.gifUrl || '',
    Comments: m.description || ''
  }))
  return Papa.unparse(rows)
}

export function movesFromCSV(csv: string): Move[] {
  const { data } = Papa.parse(csv, { header: true })
  return (data as any[]).map(row => ({
    name: row.Trick || '',
    description: row.Comments || '',
    balls: Number(row.Balls) as 3|4|5,
    level: row.Level ? Number(row.Level) : undefined,
    tags: [],
    relatedIds: [],
    libraryUrl: row.Link || '',
    video: row.Video || '',
    gifUrl: row.GIF || ''
  }))
}

export async function extractGifUrl(libraryUrl: string): Promise<string | null> {
  if (!libraryUrl) return null

  try {
    console.log('🔍 Attempting to extract GIF from:', libraryUrl)

    // Extract ball count and trick name from URL
    const urlMatch = libraryUrl.match(/\/(\d+)balltricks\/(.+)\.html$/)
    if (!urlMatch) {
      console.warn('❌ Could not parse URL pattern:', libraryUrl)
      return null
    }

    const ballCount = urlMatch[1]
    const trickName = urlMatch[2]
    console.log('📊 Parsed - Ball count:', ballCount, 'Trick name:', trickName)

    // Sanitize the trick name to handle apostrophes, spaces and punctuation
    // Example: "Cliff'sConfusion" -> "cliffsconfusion"
    const lower = trickName.toLowerCase()
    const collapsed = lower.replace(/[^a-z0-9]/g, '')
    const dashed = lower.replace(/[^a-z0-9]+/g, '-')

    // Try multiple URL patterns based on observed patterns
    const possibleUrls = [
      // direct: cleaned lowercase
      `https://libraryofjuggling.com/JugglingGifs/${ballCount}balltricks/${collapsed}.gif`,
      // direct with lowercase trickName (may include punctuation)
      `https://libraryofjuggling.com/JugglingGifs/${ballCount}balltricks/${lower}.gif`,
      // ball count prefix (collapsed)
      `https://libraryofjuggling.com/JugglingGifs/${ballCount}balltricks/${ballCount}ball${collapsed}.gif`,
      // ball count prefix with dashed name
      `https://libraryofjuggling.com/JugglingGifs/${ballCount}balltricks/${ballCount}ball${dashed}.gif`,
      // original case fallback
      `https://libraryofjuggling.com/JugglingGifs/${ballCount}balltricks/${trickName}.gif`,
    ]

    // Remove duplicates and log
    const uniqueUrls = [...new Set(possibleUrls.filter(Boolean))]
    console.log('🎯 Trying URL patterns:', uniqueUrls)

    // Test each URL using a more reliable method
    for (const url of uniqueUrls) {
      try {
        console.log('🧪 Testing URL:', url)

        // Use Image object to test if GIF exists (bypasses CORS for images)
        const img = new Image()
        const loadPromise = new Promise<boolean>((resolve) => {
          img.onload = () => {
            console.log('✅ GIF found at:', url)
            resolve(true)
          }
          img.onerror = () => {
            console.log('❌ GIF not found at:', url)
            resolve(false)
          }
          // Set a timeout
          setTimeout(() => {
            console.log('⏰ Timeout testing:', url)
            resolve(false)
          }, 3000)
        })

        img.src = url
        const exists = await loadPromise

        if (exists) {
          console.log('🎉 Success! GIF URL:', url)
          return url
        }
      } catch (error) {
        console.warn('⚠️ Error testing URL:', url, error)
        continue
      }
    }

    console.log('😞 No GIF found for:', libraryUrl)
    return null
  } catch (error) {
    console.error('💥 Error extracting GIF URL:', error)
    return null
  }
}

class JuggleDB extends Dexie {
  moves!: Table<Move, number>
  constructor() {
    super('JuggleDB')
    this.version(1).stores({
      moves: '++id, name, balls, *tags, libraryUrl, video'
    })
    this.version(2).stores({
      moves: '++id, name, balls, level, *tags, libraryUrl, video'
    }).upgrade(async (tx) => {
      // Migrate existing data from version 1 to version 2
      const moves = await tx.table('moves').toArray()
      for (const move of moves) {
        // If level is stored in tags, extract it
        let level: number | undefined
        const newTags: string[] = []

        for (const tag of move.tags || []) {
          const levelMatch = tag.match(/^(\d+)$/)
          if (levelMatch) {
            level = parseInt(levelMatch[1])
          } else {
            newTags.push(tag)
          }
        }

        await tx.table('moves').update(move.id, {
          level: level,
          tags: newTags
        })
      }
    })
    this.version(3).stores({
      moves: '++id, name, balls, level, *tags, libraryUrl, video, gifUrl'
    })
  }
}

export const db = new JuggleDB()
