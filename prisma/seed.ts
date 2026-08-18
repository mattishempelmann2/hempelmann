import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PALETTES: [string, string][] = [
  ["#1d4ed8", "#0ea5e9"],
  ["#b91c1c", "#f97316"],
  ["#15803d", "#84cc16"],
  ["#7c3aed", "#db2777"],
  ["#0f172a", "#334155"],
  ["#ca8a04", "#eab308"],
];

function placeholderImage(label: string, seedIndex: number) {
  const [c1, c2] = PALETTES[seedIndex % PALETTES.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="800" height="1000" fill="url(#g)"/>
    <text x="50%" y="50%" fill="white" font-family="sans-serif" font-size="36"
      font-weight="700" text-anchor="middle" opacity="0.85">${label}</text>
  </svg>`;
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

async function main() {
  const existing = await prisma.trip.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} trip(s), skipping seed.`);
    return;
  }

  const trips = [
    {
      title: "Iceland Road Trip",
      slug: "iceland-road-trip",
      category: "Trips",
      date: new Date("2025-02-10"),
      endDate: new Date("2025-02-18"),
      description: "A week driving the ring road, replace with your own photos.",
      photoCount: 5,
      onTimeline: 3,
    },
    {
      title: "Spring in Kyoto",
      slug: "spring-in-kyoto",
      category: "Trips",
      date: new Date("2025-04-02"),
      endDate: new Date("2025-04-09"),
      description: "Cherry blossoms and temples.",
      photoCount: 4,
      onTimeline: 2,
    },
    {
      title: "Mira's Birthday",
      slug: "miras-birthday",
      category: "Friends",
      date: new Date("2025-06-21"),
      endDate: null,
      description: "",
      photoCount: 3,
      onTimeline: 2,
    },
    {
      title: "Portugal Coastline",
      slug: "portugal-coastline",
      category: "Trips",
      date: new Date("2025-09-05"),
      endDate: new Date("2025-09-14"),
      description: "Surf towns and cliffside sunsets.",
      photoCount: 5,
      onTimeline: 3,
    },
    {
      title: "Berlin Weekend",
      slug: "berlin-weekend",
      category: "City breaks",
      date: new Date("2025-11-22"),
      endDate: null,
      description: "",
      photoCount: 3,
      onTimeline: 1,
    },
  ];

  let paletteIndex = 0;

  for (const t of trips) {
    const trip = await prisma.trip.create({
      data: {
        title: t.title,
        slug: t.slug,
        category: t.category,
        date: t.date,
        endDate: t.endDate,
        description: t.description || null,
      },
    });

    for (let i = 0; i < t.photoCount; i++) {
      await prisma.photo.create({
        data: {
          tripId: trip.id,
          url: placeholderImage(`${t.title} #${i + 1}`, paletteIndex),
          order: i,
          showOnTimeline: i < t.onTimeline,
        },
      });
      paletteIndex++;
    }
  }

  console.log(`Seeded ${trips.length} trips with placeholder photos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
