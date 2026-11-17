import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-16 text-center">
      <div className="text-[56px]" aria-hidden>
        🍩
      </div>
      <h1 className="heading mt-2 text-[32px]">This page got eaten.</h1>
      <p className="mt-2 text-[17px] text-ink-soft">Nothing lives at this address.</p>
      <Link href="/" className="press sticker heading mt-6 inline-flex min-h-[54px] items-center rounded-2xl bg-brand px-6 text-[18px]">
        Back to the snacks
      </Link>
    </div>
  );
}
