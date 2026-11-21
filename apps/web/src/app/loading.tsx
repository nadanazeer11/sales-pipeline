export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="h-14 border-b border-zinc-200" />
      <div className="flex flex-col gap-px p-5">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((key, i) => (
          <div
            key={key}
            className="h-10 animate-pulse rounded-md bg-zinc-100/70"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
