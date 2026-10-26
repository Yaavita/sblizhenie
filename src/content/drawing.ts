import { selectDrawingTasks } from "./drawingTasks";
import { legacyDrawingAssignments } from "./drawingTasks/legacy";
import type { DrawingBaseId, DrawingTaskSet } from "./drawingTasks/types";
import type { NarratorId, Stage } from "./types";

export const drawingRules =
  "Все нарисованные вещи остаются частью картины. Добавляйте новые рядом и оставляйте для них свободное место.";
export const drawingFormat =
  "Одна тема на двоих, два отдельных рисунка. Каждый сам решает, как выглядит его картина. Если рисуете здание, покажите его в разрезе: передней стены нет, комнаты и предметы внутри видны. Для улицы, острова или парка рисуйте общий вид, чтобы оставалось место для новых вещей.";
export const drawingFallback =
  "Сначала наметьте всё место крупно, а наполнение добавляйте постепенно. Не закрашивайте большие участки и оставьте свободные комнаты, землю или пол. Новую вещь можно дорисовать рядом с готовой. До финала не объясняйте друг другу свои решения.";
const index = (seed: number, count: number) =>
  ((Math.trunc(seed) % count) + count) % count;
export type DrawingOutlineKind =
  | "island"
  | "house"
  | "city"
  | "garden"
  | "theater"
  | "museum"
  | "station"
  | "machine"
  | "factory"
  | "control"
  | "bureau"
  | "hotel"
  | "market";
interface DrawingTheme {
  id: DrawingBaseId;
  title: string;
  interest: string;
  subject: string;
  first: string;
  outline: DrawingOutlineKind;
}
const themes: Record<
  NarratorId,
  {
    ids: DrawingBaseId[];
    titles: string[];
    starts: string[];
    outlines: DrawingOutlineKind[];
    interest: string;
    subject: string;
  }
> = {
  momo: {
    ids: ["momo-island", "momo-house", "momo-city", "momo-garden"],
    outlines: ["island", "house", "city", "garden"],
    titles: [
      "Остров спокойствия",
      "Дом у воды",
      "Город хорошего дня",
      "Сад внутреннего мира",
    ],
    starts: [
      "Нарисуй остров, на котором тебе было бы хорошо. Наметь берег, тропинку и открытое место для отдыха. Середину острова пока оставь почти пустой.",
      "Нарисуй дом у воды в разрезе: передней стены нет, видны три комнаты и немного берега рядом. Оставь в комнатах место для вещей.",
      "Нарисуй маленький город, в котором тебе было бы хорошо. Наметь три небольших здания, улицу и пустую площадь между ними. Пока без множества жителей и вывесок.",
      "Нарисуй большой сад: дорожку, два дерева и поляну. Оставь между ними место для вещей, которые появятся дальше.",
    ],
    interest:
      "Момо предлагает рисовать места, в которых вам хорошо. Вещи внутри расскажут о вас больше, чем фасад.",
    subject: "своё место спокойствия",
  },
  noir: {
    ids: ["noir-house", "noir-theater", "noir-museum", "noir-station"],
    outlines: ["house", "theater", "museum", "station"],
    titles: [
      "Дом несказанного",
      "Тайный театр",
      "Музей незаметных желаний",
      "Ночной вокзал",
    ],
    starts: [
      "Нарисуй дом в разрезе: передней стены нет, видны три комнаты, двери и пол. Одну комнату сделай маленькой и укромной. Оставь в комнатах много свободного места.",
      "Нарисуй театр из зрительного зала: сцена, занавес и два прохода за кулисы. На сцене пока почти пусто, чтобы дальше было что дорисовывать.",
      "Нарисуй зал музея: стены, дверь, три пустые подставки для экспонатов. Оставь место между ними и свободный угол.",
      "Нарисуй ночной вокзал изнутри: зал ожидания, большое окно и выход на платформу. Пол и большую часть стен пока оставь свободными.",
    ],
    interest:
      "Мадам Нуар собирает места с секретами: на виду одно, а внимательный гость замечает другое.",
    subject: "своё место с секретом",
  },
  archivist: {
    ids: [
      "archivist-machine",
      "archivist-factory",
      "archivist-control",
      "archivist-recharge",
    ],
    outlines: ["machine", "factory", "control", "factory"],
    titles: [
      "Машина обычного дня",
      "Фабрика странных привычек",
      "Комната управления хаосом",
      "Станция подзарядки человека",
    ],
    starts: [
      "Нарисуй большую выдуманную машину в мастерской: три соединённых корпуса, трубу и рычаг. У корпуса и вокруг него оставь свободное место для новых деталей.",
      "Нарисуй фабрику без передней стены: видны пол, три рабочих места и широкие проходы. Станки пока наметь простыми контурами, без мелких деталей.",
      "Нарисуй комнату управления: большой стол, экран и два пустых участка пола по бокам. Оставь на столе место для новых вещей.",
      "Нарисуй станцию, на которой человек мог бы восстановить силы. Покажи помещение без передней стены, три пустых места для оборудования и вход.",
    ],
    interest:
      "Архивариус хочет построить настоящее устройство и выяснить, чем оно помогает вам жить.",
    subject: "своё устройство для жизни",
  },
  noise: {
    ids: ["noise-city", "noise-hq", "noise-park", "noise-square"],
    outlines: ["city", "house", "garden", "city"],
    titles: [
      "Город без «надо»",
      "Штаб маленького бунта",
      "Парк бесполезных удовольствий",
      "Площадь отменённых запретов",
    ],
    starts: [
      "Нарисуй маленький город: три здания, улицу и большую свободную площадь. Это город, в котором можно жить по-своему. Оставь большую часть площади свободной.",
      "Нарисуй свой штаб без передней стены: большая комната, окно, дверь и пустой стол. На полу и стенах оставь место для новых вещей.",
      "Нарисуй парк: дорожку, два дерева и большую свободную поляну. Пока без аттракционов — они появятся дальше.",
      "Нарисуй площадь с тремя зданиями по краям и пустым постаментом в центре. Оставь вокруг него много места для людей и вещей.",
    ],
    interest:
      "Шум строит места для свободы и бесполезной радости. В его заданиях найдётся место маленькому бунту.",
    subject: "своё место свободы",
  },
  chance: {
    ids: ["chance-station", "chance-bureau", "chance-hotel", "chance-market"],
    outlines: ["station", "bureau", "hotel", "market"],
    titles: [
      "Вокзал невозможных маршрутов",
      "Бюро находок из других миров",
      "Отель невозможных гостей",
      "Рынок бесполезных чудес",
    ],
    starts: [
      "Нарисуй вокзал: зал ожидания, две платформы и пути. Сделай общий вид, чтобы было видно, куда потом ставить необычные вещи и гостей. Пока оставь большую часть пространства свободной.",
      "Нарисуй бюро находок без передней стены: стойка, пустые полки и стол для странных находок. Оставь место на полу перед стойкой.",
      "Нарисуй отель в разрезе: передней стены нет, видны холл внизу и несколько комнат на двух этажах. Комнаты заполняй постепенно. По краям листа тоже нужно свободное место.",
      "Нарисуй рынок: три прилавка и проходы между ними. Оставь на прилавках и между ними место для новых вещей.",
    ],
    interest:
      "Господин Случай заселяет обычные места нелепыми вещами и гостями. Каждому игроку достанется своя странная вещь.",
    subject: "своё невозможное место",
  },
};
export function drawingTheme(host: NarratorId, variant: number): DrawingTheme {
  const t = themes[host],
    choice = index(variant, t.titles.length);
  return {
    id: t.ids[choice],
    title: t.titles[choice],
    interest: t.interest,
    subject: t.subject,
    outline: t.outlines[choice],
    first: t.starts[choice],
  };
}
export interface DrawingConfig {
  host: NarratorId;
  variant: number;
  intimacy: number;
}
export function drawingTaskSet(config: DrawingConfig): DrawingTaskSet {
  const theme = drawingTheme(config.host, config.variant);
  return selectDrawingTasks(
    theme.id,
    config.variant,
    [
      config.host,
      ...drawingScenes(config.host, config.variant).map((s) => s.narrator),
    ],
    config.intimacy,
  );
}
/** Preserve exact questions for version-2 sessions started before the scene-specific banks. */
export function legacyDrawingTaskSet(config: DrawingConfig): DrawingTaskSet {
  const ids = [
    { narrator: config.host, taskVariant: config.variant },
    ...drawingScenes(config.host, config.variant),
  ];
  return Object.fromEntries(
    ids.map(({ narrator, taskVariant }) => [
      narrator,
      legacyDrawingAssignments(narrator, taskVariant, config.intimacy).map(
        (text, player) => ({
          id: `legacy-${narrator}-${player}`,
          purpose: `legacy-${narrator}-${player}`,
          text,
        }),
      ),
    ]),
  ) as DrawingTaskSet;
}
function shuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let s = (Math.trunc(seed) | 0) ^ 0x6d2b79f5;
  for (let i = result.length - 1; i > 0; i--) {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const j = (s >>> 0) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
const visits: Record<NarratorId, { title: string; text: string }> = {
  momo: {
    title: "Здесь должно быть хорошо",
    text: "Я бы добавила вещи, ради которых хочется задержаться. У каждого свой ответ — рисуйте его у себя.",
  },
  noir: {
    title: "Кое-что личное",
    text: "В приличной картине должна быть вещь с историей, о которой знают не все. Выбирайте сами и пока не объясняйте друг другу.",
  },
  archivist: {
    title: "Без этого не обойтись",
    text: "Место готово. Проверим, есть ли здесь нужные именно вам вещи. Дорисуйте каждый свою.",
  },
  noise: {
    title: "Место для бесполезной радости",
    text: "Всё для пользы, всё по делу? Скучно. Каждый добавьте то, что нравится вам, даже если никто этого не одобряет.",
  },
  chance: {
    title: "Это точно должно быть здесь?",
    text: "У вашего места появились странные вещи. Каждый придумайте и нарисуйте свою — интересно, догадается ли другой, зачем она вам.",
  },
};
export function drawingScenes(host: NarratorId, variant: number) {
  return shuffle<NarratorId>(
    ["momo", "noir", "archivist", "noise", "chance"].filter(
      (n) => n !== host,
    ) as NarratorId[],
    variant ^ 0x7a31,
  ).map((narrator, i) => ({
    id: `visit-${narrator}`,
    narrator,
    ...visits[narrator],
    taskVariant: variant * 7 + i,
  }));
}
export interface DrawingGuess {
  narrator: NarratorId;
  question: string;
}
export interface DrawingCue {
  id: string;
  chapter: number;
  kind: "main" | "addition" | "gallery";
  narrator: NarratorId;
  title: string;
  text: string;
  seconds: number;
  assignments?: [string, string];
  player?: 0 | 1;
  guesses?: DrawingGuess[];
}
/** Eight minutes for the scene, four eleven-minute additions, six minutes of guessing. */
export function drawingPlan(
  config: DrawingConfig,
  taskSet = drawingTaskSet(config),
): DrawingCue[] {
  const { host, variant } = config,
    theme = drawingTheme(host, variant);
  const plan: DrawingCue[] = [
    {
      id: "d-base",
      chapter: 0,
      kind: "main",
      narrator: host,
      title: theme.title,
      text: theme.first,
      assignments: taskSet[host].map((task) => task.text) as [string, string],
      seconds: 480,
    },
  ];
  drawingScenes(host, variant).forEach((visit, i) =>
    plan.push({
      id: visit.id,
      chapter: i + 1,
      kind: "addition",
      narrator: visit.narrator,
      title: visit.title,
      text: visit.text,
      assignments: taskSet[visit.narrator].map((task) => task.text) as [
        string,
        string,
      ],
      seconds: 660,
    }),
  );
  for (const player of [0, 1] as const)
    plan.push({
      id: `d-gallery-${player}`,
      chapter: 5,
      kind: "gallery",
      narrator: host,
      title: `Игрок ${player + 1} угадывает рисунок игрока ${2 - player}`,
      text: `Игрок ${2 - player}, молча покажи свою картину. Игрок ${player + 1}, выбери три задания из списка ниже. Для каждого найди на рисунке предмет, который, по-твоему, был ответом, и объясни догадку. Сначала догадки, потом автор рассказывает, что он выбрал на самом деле.`,
      seconds: 180,
      player,
      guesses: plan
        .filter((c) => c.assignments)
        .map((c) => ({
          narrator: c.narrator,
          question: c.assignments![1 - player],
        })),
    });
  return plan;
}
export function drawingStages(
  host: NarratorId,
  variant: number,
  intimacy: number,
  taskSet?: DrawingTaskSet,
): Stage[] {
  const plan = drawingPlan({ host, variant, intimacy }, taskSet);
  return plan
    .filter((c) => c.id !== "d-gallery-1")
    .map((c) => ({
      id: c.kind === "gallery" ? "d-gallery" : c.id,
      title: c.title,
      body: c.text,
      notes: c.assignments
        ?.map((task, player) => `Игрок ${player + 1}: ${task}`)
        .join("\n"),
      seconds: c.kind === "gallery" ? 360 : c.seconds,
      kind: "drawing",
      target: "both",
    }));
}
