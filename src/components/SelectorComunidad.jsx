export default function SelectorComunidad({ comunidades, valor, onChange, className, style }) {
  const mias = comunidades.filter(c => c.esMia)
  const otras = comunidades.filter(c => !c.esMia)
  const propia = c => `${c.nombre} ${c.nivel}`
  const ajena = c => `${c.nombre} ${c.nivel} · ${c.tutor_nombre || 'No tutor'}`

  return (
    <select className={className} style={style} value={valor || ''} onChange={(e) => onChange(e.target.value)}>
      {mias.length > 0 && otras.length > 0 ? (
        <>
          <optgroup label="My communities">
            {mias.map(c => <option key={c.id} value={c.id}>{propia(c)}</option>)}
          </optgroup>
          <optgroup label="Other tutors">
            {otras.map(c => <option key={c.id} value={c.id}>{ajena(c)}</option>)}
          </optgroup>
        </>
      ) : (
        comunidades.map(c => (
          <option key={c.id} value={c.id}>{c.esMia ? propia(c) : ajena(c)}</option>
        ))
      )}
    </select>
  )
}