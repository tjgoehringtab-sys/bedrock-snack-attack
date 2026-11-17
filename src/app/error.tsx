"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="text-[56px]" aria-hidden>
        🥴
      </div>
      <h1 className="heading mt-2 text-[32px]">Somebody dropped the chips.</h1>
      <p className="mt-2 text-[17px] text-ink-soft">This page hit an error. Trying again usually fixes it.</p>
      <button
        type="button"
        onClick={reset}
        className="press sticker heading mt-6 inline-flex min-h-[54px] items-center rounded-2xl bg-brand px-6 text-[18px]"
      >
        Try again
      </button>
    </div>
  );
}
