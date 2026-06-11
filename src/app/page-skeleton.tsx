/** 切換頁面／月份時的骨架畫面 */
export function PageSkeleton() {
  return (
    <>
      <div className="bg-white ring-1 ring-gray-950/5">
        <div className="mx-auto flex max-w-3xl items-center gap-6 px-4 py-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-4 w-12 animate-pulse rounded bg-gray-200"
            />
          ))}
        </div>
      </div>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="flex items-end justify-between">
          <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="mt-4 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-7 w-20 animate-pulse rounded-full bg-gray-200"
            />
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-gray-200/70" />
          <div className="h-72 animate-pulse rounded-2xl bg-gray-200/70" />
        </div>
        <div className="mt-6 space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-gray-200/70"
            />
          ))}
        </div>
      </main>
    </>
  );
}
