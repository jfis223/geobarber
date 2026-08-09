import Link from "next/link";
import { Show } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 text-center dark:bg-black">
      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        GeoBarber
      </h1>
      <p className="mt-4 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Mobile men&apos;s grooming. Your stylist comes to you.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/booking"
          className="rounded-full bg-black px-6 py-3 text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Book an appointment
        </Link>
        <Show when="signed-out">
          <Link
            href="/sign-in"
            className="rounded-full border border-black/10 px-6 py-3 text-base font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            Sign in
          </Link>
        </Show>
        <Show when="signed-in">
          <Link
            href="/appointments"
            className="rounded-full border border-black/10 px-6 py-3 text-base font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            My appointments
          </Link>
        </Show>
      </div>
    </div>
  );
}
