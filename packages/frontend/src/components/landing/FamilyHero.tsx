type Props = {
  familyName: string
  introText: string
  foundedYear?: string | null
}

export default function FamilyHero({ familyName, introText, foundedYear }: Props) {
  const paragraphs = introText.split('\n').filter(Boolean)

  return (
    <section className="bg-gradient-to-b from-amber-50 to-stone-50 py-16 px-4 text-center">
      <h1 className="text-4xl md:text-5xl font-bold text-stone-800 mb-3">{familyName}</h1>
      {foundedYear && (
        <p className="text-amber-700 font-medium mb-6">Thành lập năm {foundedYear}</p>
      )}
      <div className="max-w-2xl mx-auto space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-stone-600 leading-relaxed">{p}</p>
        ))}
      </div>
    </section>
  )
}
