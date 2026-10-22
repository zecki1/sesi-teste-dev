import { useState, useEffect } from 'react'

type ColorFilter = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monocromia'
type FontSize = 'small' | 'normal' | 'large' | 'xlarge'
type Font = 'default' | 'opendyslexic'

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false)
  const [colorFilter, setColorFilter] = useState<ColorFilter>('none')
  const [fontSize, setFontSize] = useState<FontSize>('normal')
  const [font, setFont] = useState<Font>('default')

  useEffect(() => {
    const root = document.documentElement
    if (colorFilter === 'none') root.removeAttribute('data-color-filter')
    else root.setAttribute('data-color-filter', colorFilter)
  }, [colorFilter])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-font-size', fontSize)
  }, [fontSize])

  useEffect(() => {
    const root = document.documentElement
    if (font === 'default') root.removeAttribute('data-font')
    else root.setAttribute('data-font', font)
  }, [font])

  return (
    <>
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="protanopia-filter">
            <feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0" />
          </filter>
          <filter id="deuteranopia-filter">
            <feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0" />
          </filter>
          <filter id="tritanopia-filter">
            <feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0" />
          </filter>
        </defs>
      </svg>

      <button
        onClick={() => setOpen(!open)}
        aria-label="Abrir menu de acessibilidade"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '20px',
          zIndex: 9999,
          padding: '12px',
          background: '#0C0C0D',
          color: '#FFFFFF',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          minWidth: '48px',
          minHeight: '48px'
        }}
      >
        ♿
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Menu de acessibilidade"
          style={{
            position: 'fixed',
            bottom: '140px',
            left: '20px',
            zIndex: 9999,
            background: '#FFFFFF',
            border: '2px solid #0C0C0D',
            borderRadius: '8px',
            padding: '16px',
            width: '280px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>Acessibilidade</h2>
          
          <fieldset style={{ marginBottom: '12px' }}>
            <legend style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Filtro para daltonismo</legend>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value as ColorFilter)}
              style={{ width: '100%', padding: '8px' }}
              aria-label="Filtro para daltonismo"
            >
              <option value="none">Nenhum</option>
              <option value="protanopia">Protanopia</option>
              <option value="deuteranopia">Deuteranopia</option>
              <option value="tritanopia">Tritanopia</option>
              <option value="monocromia">Monocromia</option>
            </select>
          </fieldset>

          <fieldset style={{ marginBottom: '12px' }}>
            <legend style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Tamanho da fonte</legend>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={() => setFontSize('small')} aria-label="Fonte pequena" style={{ flex: 1, padding: '6px' }}>A-</button>
              <button onClick={() => setFontSize('normal')} aria-label="Fonte normal" style={{ flex: 1, padding: '6px' }}>A</button>
              <button onClick={() => setFontSize('large')} aria-label="Fonte grande" style={{ flex: 1, padding: '6px' }}>A+</button>
              <button onClick={() => setFontSize('xlarge')} aria-label="Fonte muito grande" style={{ flex: 1, padding: '6px' }}>A++</button>
            </div>
          </fieldset>

          <fieldset>
            <legend style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Fonte</legend>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={font === 'opendyslexic'}
                onChange={(e) => setFont(e.target.checked ? 'opendyslexic' : 'default')}
              />
              OpenDyslexic
            </label>
          </fieldset>
        </div>
      )}
    </>
  )
}
