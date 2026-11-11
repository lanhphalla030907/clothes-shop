import { fetchPublishedFeedbackPage } from '@/features/feedback/api'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { toUserMessage } from '@/lib/api/errors'
import { InlineNotice } from '@/components/account/States'
import { Reveal } from '@/components/ui/Reveal'
import type { PublicFeedbackPage } from '@/types/api'

// Helper to generate a clean, styled initials avatar
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink to-graphite text-[11px] font-mono tracking-wider text-canvas shadow-sm ring-1 ring-line/50">
      {initials || '??'}
    </div>
  )
}

export function FeedbackSection() {
  const page = useAsyncResource<PublicFeedbackPage>(
    (signal) => fetchPublishedFeedbackPage({ page: 1, limit: 6 }, signal),
    [],
  )

  const rows = page.data?.items ?? []

  if (page.error !== undefined) {
    return (
      <section className="container-editorial py-20 sm:py-28">
        <InlineNotice message={toUserMessage(page.error)} onDismiss={() => page.refetch()} />
      </section>
    )
  }

  return (
    <section className="container-editorial py-20 sm:py-28 border-t border-line pt-10 sm:pt-14">
      {/* Refined Editorial Header */}
      <Reveal>
        <div className="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <span className="h-px w-6 bg-[var(--ctrl-red)]" aria-hidden />
              <span className="label-micro text-graphite">Studio Notes</span>
            </div>
            <h2 className="type-display text-3xl leading-tight sm:text-4xl">
              Words from<br />the archive.
            </h2>
          </div>
          <div className="max-w-xs sm:text-right">
            <p className="text-sm leading-relaxed text-graphite/70">
              Real notes from our community. A collection of thoughts, experiences, and moments captured in time.
            </p>
          </div>
        </div>
      </Reveal>

      {page.isLoading && (
        <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <div key={index} className="flex flex-col h-full bg-bone/50 p-6 sm:p-8 rounded-none border border-transparent">
              <div className="h-8 w-8 animate-pulse bg-line mb-6 rounded-full" />
              <div className="h-4 w-3/4 animate-pulse bg-line mb-3" />
              <div className="h-4 w-full animate-pulse bg-line mb-2" />
              <div className="h-4 w-5/6 animate-pulse bg-line mb-8" />
              <div className="mt-auto h-px w-full bg-line/50 mb-4" />
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 animate-pulse bg-line rounded-full" />
                <div className="h-3 w-1/3 animate-pulse bg-line" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!page.isLoading && rows.length === 0 && (
        <div className="mt-10 text-center sm:mt-14">
          <p className="text-sm leading-relaxed text-graphite/70 sm:text-base">
            No published notes yet. Once a team member publishes a customer’s
            note, it will appear here.
          </p>
        </div>
      )}

      {!page.isLoading && rows.length > 0 && (
        <div className="mt-10 grid gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
          {rows.map((row) => (
            <Reveal key={row.id} className="group relative flex flex-col h-full" as="article">
              {/* Subtle background and border on hover */}
              <div className="absolute inset-0 bg-bone/30 border border-line/40 transition-all duration-500 group-hover:bg-bone/60 group-hover:border-line group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]" />
              
              {/* Red accent line on the left */}
              <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--ctrl-red)] scale-y-0 origin-top transition-transform duration-500 ease-out group-hover:scale-y-100" />

              <div className="relative flex flex-col h-full p-6 sm:p-8">
                {/* Large editorial quote mark */}
                <span className="font-serif text-5xl leading-none text-line/60 group-hover:text-[var(--ctrl-red)]/20 transition-colors duration-500 mb-2 -ml-1">
                  “
                </span>

                <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-ink sm:text-[15px]">
                  {row.title}
                </h3>
                
                <p className="mt-3 text-[14px] leading-relaxed text-graphite/90 sm:text-[15px]">
                  {row.message}
                </p>

                <div className="mt-auto pt-6">
                  <div className="h-px w-full bg-line/60 mb-4 transition-colors duration-500 group-hover:bg-line" />
                  
                  {/* Updated Profile Section */}
                  <div className="flex items-center gap-3">
                    <Avatar name={row.customerName} />
                    <div className="flex flex-col">
                      <p className="text-[12px] font-medium text-ink tracking-wide">
                        {row.customerName}
                      </p>
                      <p className="text-[10px] text-graphite/60 font-mono tracking-wider uppercase">
                        {new Date(row.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  )
}