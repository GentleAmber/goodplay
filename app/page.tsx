import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Gamepad2, Star, Users } from "lucide-react";
import { Status } from "@/generated/prisma"

import { useSession, signIn, signOut } from "next-auth/react"
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Goodplay — Track, rate, and discover games",
};

const FEATURES = [
  {
    icon: Gamepad2,
    title: "Video Games",
    description:
      "Discover and track video games, from the latest releases to all-time classics.",
  },
  {
    icon: Star,
    title: "Ratings & Reviews",
    description:
      "Rate and review games, track your play status, and build your collection.",
  },
  {
    icon: Users,
    title: "Social",
    description:
      "Follow friends and discover what the community is playing.",
  },
];

// The order in which status groups appear on the dashboard
const STATUS_ORDER: Status[] = [
  Status.PLAYING,
  Status.WANT_TO_PLAY,
  Status.COMPLETED,
  Status.PLAYED,
];

export default function Home() {

  return (
    <>
      <section className="container mx-auto px-4 py-20 text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
          Your games.{" "}
          <span className="text-muted-foreground">Tracked.</span>
        </h1>
        <p className="mx-auto max-w-[600px] text-lg text-muted-foreground">
          Goodplay is the best way to discover, rate, and track your
          video games. Join the community.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <button>
            <Link href="/register">Get started free</Link>
          </button>
          <button>
            <Link href="/videogames">Browse games</Link>
          </button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border bg-card p-6 space-y-3"
            >
              <Icon className="h-6 w-6 text-muted-foreground" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
