import type { Metadata } from "next";
import Homepage from "@/app/_page"

export const metadata: Metadata = {
  title: "Goodplay — Track, rate, and discover games",
};


export default function Home() {
  return <Homepage />
}
