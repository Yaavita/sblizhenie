import type { DrawingOutlineKind } from "../content/drawing";

/** Empty scene references explain viewpoint; players supply the objects and their meaning. */
export function DrawingOutline({ kind }: { kind: DrawingOutlineKind }) {
  const room = (
    <path d="M65 195V55h360v140M65 55l55-30h255l50 30M65 195h360M65 55l36 28h288l36-28" />
  );
  const house = (
    <>
      <path d="M55 200V75l190-45 190 45v125H55M55 75h380M140 75v125M310 75v125M40 200h410" />
    </>
  );
  const images: Record<DrawingOutlineKind, React.ReactNode> = {
    house,
    hotel: (
      <>
        {house}
        <path d="M55 137h380M80 55v-20h25v14M205 137v63M338 137v63" />
      </>
    ),
    island: (
      <>
        <path d="M80 164q-35-58 38-92t116-32q85-13 137 23t44 83q-15 45-90 51t-133 0q-80-2-112-33Z" />
        <path d="M63 183q45 40 162 35t206-31M169 180q-35-58 33-106M179 184q-31-55 33-106" />
      </>
    ),
    city: (
      <>
        <path d="M45 140V75l48-30 48 30v65M45 75h96M200 120V58l45-26 45 26v62M200 58h90M350 140V75l48-30 47 30v65M350 75h95M30 148h430M185 155l-45 65M305 155l45 65" />
      </>
    ),
    garden: (
      <>
        <path d="M40 202q160-24 410 0M225 205q-45-66 11-118M265 205q-45-66 11-118M80 164v-55m-18-2q-38-29-6-52 8-39 40-20 44-5 35 40 23 31-24 40M390 162v-55m-17 0q-38-28-7-52 9-39 40-20 45-5 35 40 24 32-24 40" />
      </>
    ),
    theater: (
      <>
        <path d="M55 180V40h380v140H55M80 180V65h330v115M55 40q80 70 55 110M435 40q-80 70-55 110M40 180h410v17H40M65 225h360M100 210h290" />
      </>
    ),
    museum: (
      <>
        {room}
        <path d="M130 180v-35h50v35m80 0v-35h50v35m50 0v-35h35v35" />
      </>
    ),
    station: (
      <>
        <path d="M50 168V55h390v113M50 55l80-25h230l80 25M85 130V75h105v55H85M235 130V75h155v55H235M30 168h430M30 185h430M30 205h430M65 185l-8 20m70-20-6 20m70-20-4 20m70-20-2 20m70-20v20m70-20 2 20" />
      </>
    ),
    machine: (
      <>
        <path d="M40 205h410M80 195v-95h100v95H80M200 195v-130h95v130h-95M315 195v-85h100v85H315M180 125h20m95 0h20M115 100V60h132v5M340 85V50h45v35M80 180h335" />
      </>
    ),
    factory: (
      <>
        {room}
        <path d="M100 180v-55h60v55m55 0v-55h60v55m55 0v-55h60v55M90 205h310" />
      </>
    ),
    control: (
      <>
        {room}
        <path d="M115 155h260v15H115v-15m10 15v27m240-27v27M180 135V80h120v55h-120M240 135v20" />
      </>
    ),
    bureau: (
      <>
        {room}
        <path d="M115 160h260v36H115v-36M140 150V80h210v70M140 105h210m-210 25h210m-140-50v70" />
      </>
    ),
    market: (
      <>
        <path d="M30 205h430M50 110V65h100v45H50M50 65l15-25h70l15 25M50 110v65m100-65v65M50 150h100M195 110V65h100v45H195M195 65l15-25h70l15 25M195 110v65m100-65v65M195 150h100M340 110V65h100v45H340M340 65l15-25h70l15 25M340 110v65m100-65v65M340 150h100" />
      </>
    ),
  };
  return (
    <figure className="drawing-outline">
      <svg
        viewBox="0 0 490 240"
        role="img"
        aria-label="Пример пустой основы рисунка"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {images[kind]}
        </g>
      </svg>
      <figcaption>
        Пример ракурса и пустого пространства. Планировку и все предметы
        придумайте сами.
      </figcaption>
    </figure>
  );
}
