import { notFound } from "next/navigation";
import { getSongBySlug } from "@/lib/songs";
import { PrintView } from "./print-view";

export default async function ImprimirCancionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    chords?: string;
    semitones?: string;
    system?: string;
  }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const song = await getSongBySlug(slug);
  if (!song) notFound();

  const showChords = sp.chords === "1";
  const semitones = Number.parseInt(sp.semitones ?? "0", 10) || 0;
  const system =
    sp.system === "latin" || sp.system === "english" ? sp.system : "auto";

  return (
    <PrintView
      slug={slug}
      title={song.title}
      number={song.number}
      author={song.author}
      body={song.body}
      showChords={showChords}
      semitones={semitones}
      system={system}
    />
  );
}
