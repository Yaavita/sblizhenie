import type { GameId, NarratorId } from "./types";

export interface Narrator {
  id: NarratorId;
  name: string;
  role: string;
  description: string;
  quote: string;
  color: string;
  entrance: string;
  /** Relative probability weight; the engine still enforces cooldowns. */
  frequency: number;
  relations: string;
}

export const narrators: Narrator[] = [
  {
    id: "noise",
    name: "Шум",
    role: "Панк-анархист",
    color: "#d1df73",
    entrance: "noise",
    frequency: 1.15,
    description:
      "Подденет красивую фразу, найдёт маленькое лицемерие и проверит ваши правила на прочность. Революцию начинает с неудобного вопроса.",
    quote:
      "Ну что, образцовые граждане. Попробуем сегодня без образцовых ответов?",
    relations:
      "Спорит с Архивариусом о пользе порядка. Прикрывает проделки Случая, пока те не превращаются в инструкцию. Неожиданно бережен с Момо.",
  },
  {
    id: "momo",
    name: "Момо",
    role: "Романтичная провокаторша",
    color: "#e5a3ba",
    entrance: "momo",
    frequency: 0.9,
    description:
      "Устроит нежность с подвохом. Румянец, любопытство и удивительно точный вопрос в тот момент, когда вы уже расслабились.",
    quote: "Я буду вести себя прилично. Но это не обещание, а настроение.",
    relations:
      "С Мадам Нуар собирает заговоры против неловкого молчания. Смеётся над бравадой Шума. Просит Архивариуса не сносить романтику сносками.",
  },
  {
    id: "archivist",
    name: "Архивариус",
    role: "Собиратель противоречий",
    color: "#c7b58c",
    entrance: "archivist",
    frequency: 0.75,
    description:
      "Вежливо разберёт вашу уверенность на предпосылки. Может остановить чужую глупость. Или обнаружить, что глупость была вашей единственной надеждой.",
    quote:
      "Прежде чем искать правильный ответ, уточним: хороший ли у нас вопрос?",
    relations:
      "Считает Случая стихийным бедствием с конферансом. Уважает наблюдательность Нуар. С Шумом спорит так часто, что это уже форма дружбы.",
  },
  {
    id: "chance",
    name: "Господин Случай",
    role: "Распорядитель невозможного",
    color: "#91b6c6",
    entrance: "chance",
    frequency: 1.2,
    description:
      "Продаст билет в реальность с неисправной гравитацией. Подбросит нелепое условие и будет аплодировать вашему способу выкрутиться.",
    quote:
      "Дамы и господа! Всё под контролем. Просто контроль сегодня не пришёл.",
    relations:
      "Выводит Архивариуса из себя с точностью часового механизма. Нанимает Шума в сообщники. Поблажек Нуар побаивается больше, чем её угроз.",
  },
  {
    id: "noir",
    name: "Мадам Нуар",
    role: "Хранительница недосказанного",
    color: "#ca8e75",
    entrance: "noir",
    frequency: 0.8,
    description:
      "Попросит назвать желание, спрятанное за шуткой. Знает цену паузе, замечает недомолвки и редко задаёт вопрос просто так.",
    quote:
      "У каждого секрета есть цена. Посмотрим, что сегодня окажется дороже молчания.",
    relations:
      "Доверяет интуиции Момо и логике Архивариуса. Позволяет Случаю считать себя непредсказуемым. Видит нежность даже под колючками Шума.",
  },
];

export function getNarrator(id: NarratorId): Narrator {
  return narrators.find((narrator) => narrator.id === id) ?? narrators[0];
}

export interface InterruptionContent {
  id: string;
  narrator: NarratorId;
  title: string;
  text: string;
  duration: number;
  priority: number;
  games: GameId[];
  minIntimacy: number;
  /** Only these stages may receive this event; replies inherit the context. */
  contextstageIds?: string[];
  operation?: "add" | "replace" | "cancel" | "comment";
  target?: "latest" | "host";
  reply?: {
    narrator: NarratorId;
    text: string;
    after: number;
    cancelsParent: boolean;
    operation?: "add" | "replace" | "cancel" | "comment";
  };
}

export const interruptionPool: InterruptionContent[] = [
  {
    id: "gravity-strike",
    contextstageIds: ["u-home", "u-cost"],
    operation: "add",
    narrator: "chance",
    title: "Гравитация уволилась",
    duration: 60,
    priority: 1,
    games: ["universes"],
    minIntimacy: 0,
    text: "СТОП! В ваших мирах исчезла гравитация. Придумайте, что теперь удерживает людей рядом, и добавьте это в рисунок. Верёвки допустимы. Чувство долга — подозрительно.",
    reply: {
      operation: "cancel",
      narrator: "archivist",
      text: "Случай, положите гравитацию на место. Ваше условие отменяю. Рисуйте дальше — пол останется там, где был.",
      after: 10,
      cancelsParent: true,
    },
  },
  {
    id: "future-with-flaws",
    contextstageIds: ["u-home", "u-cost"],
    operation: "add",
    narrator: "noise",
    title: "Трещина в открытке",
    duration: 45,
    priority: 1,
    games: ["universes"],
    minIntimacy: 0,
    text: "Слишком гладкое будущее подозрительно напоминает рекламу. Добавьте одну неприятность, с которой вы готовы жить. Чем она лучше неприятности, от которой вы сбежали?",
    reply: {
      operation: "replace",
      narrator: "momo",
      text: "Шум, они рисуют будущее, а не жалобу застройщику. Вместо неприятности нарисуйте что-нибудь такое хорошее, ради чего вы согласны её терпеть.",
      after: 12,
      cancelsParent: false,
    },
  },
  {
    id: "one-chair",
    contextstageIds: ["u-home", "u-guest"],
    operation: "replace",
    target: "latest",
    narrator: "noir",
    title: "Место для другого",
    duration: 45,
    priority: 1,
    games: ["universes"],
    minIntimacy: 0,
    text: "Последнее условие снимаю. Вместо него каждый рисует в своём будущем одно место для неожиданного гостя и одно место только для себя. Объясните разницу, не называя комнаты.",
  },
  {
    id: "small-tuesday",
    contextstageIds: ["u-home", "u-cost"],
    operation: "replace",
    target: "latest",
    narrator: "archivist",
    title: "Проверка вторником",
    duration: 45,
    priority: 2,
    games: ["universes"],
    minIntimacy: 0,
    text: "Заменяю последнее условие проверкой вторником. На остаток этапа рисуйте только обычный вечер: никаких праздников, путешествий и великих достижений. Чем заняты руки, когда жизнь наконец удалась?",
  },
  {
    id: "museum-label",
    contextstageIds: ["u-cost", "u-guest"],
    operation: "replace",
    target: "latest",
    narrator: "chance",
    title: "Вежливая ошибка музея",
    duration: 35,
    priority: 1,
    games: ["universes"],
    minIntimacy: 0,
    text: "Последнее условие отменяется: ваши рисунки уже в музее! Не показывая листа, придумайте к своей работе ужасно серьёзную подпись. Такую, чтобы никто не понял, за что билет стоил две тысячи.",
  },
  {
    id: "future-flirt",
    contextstageIds: ["u-home", "u-cost"],
    operation: "add",
    narrator: "momo",
    title: "Нежность в деталях",
    duration: 40,
    priority: 1,
    games: ["universes"],
    minIntimacy: 1,
    text: "Каждый добавьте в свой мир маленький знак «тебя здесь ждали». Без грандиозных жестов: пусть собеседник попробует понять знак до вашего объяснения.",
    reply: {
      operation: "replace",
      narrator: "noir",
      text: "Момо, с приглашением разобрались. Теперь наоборот: вместо знака «я ждал тебя» нарисуйте знак «сегодня побудь без меня». Чтобы человек понял и не обиделся.",
      after: 15,
      cancelsParent: false,
    },
  },
  {
    id: "god-on-leave",
    contextstageIds: [
      "c-charter",
      "c-heresy",
      "c-human",
      "c-famine",
      "c-treaty",
      "c-after",
    ],
    operation: "add",
    narrator: "chance",
    title: "Божество взяло отпуск",
    duration: 50,
    priority: 1,
    games: ["cult"],
    minIntimacy: 0,
    text: "Ваше божество оставило записку: «До пятницы не беспокоить». Что у вас теперь перестанет работать? Придумайте, чем люди его заменят. Старые заповеди пока остаются — неприятно, понимаю.",
    reply: {
      operation: "replace",
      narrator: "archivist",
      text: "Подождите. Отпуск отменяется, божество на месте. Но ему больше никто не верит. Найдите правило, которое люди всё равно будут соблюдать. Без молний и наказания после смерти.",
      after: 15,
      cancelsParent: false,
    },
  },
  {
    id: "rebel-footnote",
    contextstageIds: ["c-charter", "c-heresy", "c-famine", "c-treaty"],
    operation: "add",
    narrator: "noise",
    title: "Поправка снизу",
    duration: 50,
    priority: 1,
    games: ["cult"],
    minIntimacy: 0,
    text: "Самый тихий человек в вашем обществе спрашивает: «Почему ваши правила удобны именно вам?» Назовите того, кому они мешают, и одну поправку, за которую вы заплатите собственным удобством.",
    reply: {
      operation: "add",
      narrator: "archivist",
      text: "Вопрос Шума сохраняю и добавляю проверку: назовите цену поправки в одной конкретной привилегии основателей. «Мы станем добрее» в смету не принимается.",
      after: 14,
      cancelsParent: false,
    },
  },
  {
    id: "cult-kindness",
    contextstageIds: ["c-charter", "c-heresy", "c-famine", "c-treaty"],
    operation: "replace",
    target: "latest",
    narrator: "momo",
    title: "Один непарадный ритуал",
    duration: 40,
    priority: 1,
    games: ["cult"],
    minIntimacy: 0,
    text: "Нет, давайте посмотрим снизу. Вместо последнего условия: выберите человека, которому от вашего решения хуже всего, и говорите от его лица. Начните с того, что вы ему обычно не дали бы договорить.",
  },
  {
    id: "founder-exemption",
    contextstageIds: ["c-charter", "c-human", "c-treaty"],
    operation: "add",
    narrator: "archivist",
    title: "Привилегия основателей",
    duration: 50,
    priority: 2,
    games: ["cult"],
    minIntimacy: 0,
    text: "Один из основателей нарушил ваш запрет по доброй причине. Если исключение допустимо ему, допустимо ли каждому? Сформулируйте правило так, чтобы оно выдержало ваше отсутствие.",
    reply: {
      operation: "replace",
      narrator: "noise",
      text: "Старик, они сейчас сами себя простят. Меняю проверку: сначала назначьте основателю то же наказание, что всем. И только потом спасайте его добрыми намерениями.",
      after: 15,
      cancelsParent: false,
    },
  },
  {
    id: "cult-unspoken",
    contextstageIds: ["c-charter", "c-heresy", "c-famine", "c-treaty"],
    operation: "replace",
    target: "latest",
    narrator: "noir",
    title: "Неписаный закон",
    duration: 45,
    priority: 1,
    games: ["cult"],
    minIntimacy: 1,
    text: "Последнее условие снимаю. До конца этого решения один из вас защищает желание общины быть любимой, другой — быть правой. Обменяйтесь ролями после первого аргумента: своя позиция слишком удобна.",
  },
  {
    id: "cult-weather",
    contextstageIds: ["c-charter", "c-heresy", "c-famine", "c-treaty"],
    operation: "replace",
    target: "latest",
    narrator: "chance",
    title: "Прогноз: осадки из пророчеств",
    duration: 35,
    priority: 1,
    games: ["cult"],
    minIntimacy: 0,
    text: "Заменяю последнее условие публичным выступлением! Обоснуйте нынешнее решение как рекламу своего культа: ровно один лозунг и одно честное предупреждение мелким шрифтом. Выдуманные чудеса комиссия не оплатит.",
  },
  {
    id: "detective-certainty",
    contextstageIds: ["s-map", "s-check"],
    operation: "add",
    narrator: "archivist",
    title: "Факт или догадка?",
    duration: 45,
    priority: 2,
    games: ["secrets"],
    minIntimacy: 0,
    text: "Добавляю правило обсуждения: каждая версия должна начинаться с конкретной известной улики. «Кажется» и «слишком подозрительно» доказательствами до конца этапа не считаются.",
    reply: {
      operation: "replace",
      narrator: "noise",
      text: "Старик, слишком удобно собирать подтверждения. Заменяю твоё правило: следующую версию начинайте с факта ПРОТИВ неё. Если выдержит собственную критику, сниму наручники.",
      after: 15,
      cancelsParent: false,
    },
  },
  {
    id: "detective-silence",
    contextstageIds: ["s-map", "s-check"],
    operation: "add",
    narrator: "noir",
    title: "Умолчание и ложь",
    duration: 45,
    priority: 1,
    games: ["secrets"],
    minIntimacy: 0,
    text: "До конца этапа сначала обсуждайте, что каждый подозреваемый пытается защитить, и только потом — что мог сделать. Для каждого мотива нужна опора в уже прочитанных сведениях.",
    reply: {
      operation: "replace",
      narrator: "momo",
      text: "Нуар, ты сейчас их всех оправдаешь. Давайте наоборот: сначала кто что сделал и когда. А уж потом будем выяснять, у кого было трудное детство.",
      after: 14,
      cancelsParent: false,
    },
  },
  {
    id: "detective-bad-movie",
    contextstageIds: ["s-map", "s-check"],
    operation: "add",
    narrator: "chance",
    title: "Кастинг отменяется",
    duration: 30,
    priority: 1,
    games: ["secrets"],
    minIntimacy: 0,
    text: "Я временно закрываю отдел серьёзных версий! За тридцать секунд придумайте название ужасной экранизации вашего дела. Все факты остаются прежними, портится только афиша.",
    reply: {
      operation: "cancel",
      narrator: "archivist",
      text: "Название у нас уже есть: «Как Случай всем помешал». Афишу отменяю. Вернитесь к улике, на которой остановились.",
      after: 10,
      cancelsParent: true,
    },
  },
  {
    id: "detective-role-reversal",
    contextstageIds: ["s-map", "s-check"],
    operation: "replace",
    target: "latest",
    narrator: "noise",
    title: "Защита неудобной версии",
    duration: 50,
    priority: 1,
    games: ["secrets"],
    minIntimacy: 0,
    text: "Последнее условие обсуждения отменяю. До конца этапа каждый защищает версию, с которой меньше всего согласен. Только известными уликами; личное обаяние подозреваемого не цитировать.",
  },
  {
    id: "detective-last-question",
    contextstageIds: ["s-map", "s-check"],
    operation: "add",
    narrator: "momo",
    title: "Письмо человеку из истории",
    duration: 40,
    priority: 1,
    games: ["secrets"],
    minIntimacy: 0,
    text: "Кого из этой истории вы сейчас усадили бы на этот стул? И что спросили бы первым? Ответ за него не придумывайте. Мне интересно, в каком месте у вас пока не сходится.",
  },
  {
    id: "gentle-confession",
    contextstageIds: ["u-one", "u-two", "c-human"],
    operation: "add",
    narrator: "noir",
    title: "Маленькая честность",
    duration: 40,
    priority: 1,
    games: ["universes", "cult"],
    minIntimacy: 2,
    text: "Назовите одну черту собеседника, которая неожиданно вас притягивает. Усложняю: слова «красивый», «милый» и «хороший» временно изъяты из обращения. Придётся заметить деталь.",
    reply: {
      operation: "replace",
      narrator: "momo",
      text: "Нуар, верни им прилагательные. Лучше так: вспомните момент, когда заметили эту черту. Что человек тогда делал? Вот это уже интереснее, чем «ты просто хороший».",
      after: 12,
      cancelsParent: false,
    },
  },
  {
    id: "one-sentence-law",
    contextstageIds: [
      "u-one",
      "u-two",
      "c-human",
      "c-heresy",
      "c-famine",
      "c-treaty",
      "s-map",
      "s-check",
    ],
    operation: "replace",
    target: "latest",
    narrator: "noise",
    title: "Бюрократия короткой фразы",
    duration: 25,
    priority: 2,
    games: ["universes", "cult", "secrets"],
    minIntimacy: 0,
    text: "Снимаю последнее условие. Теперь любое объяснение — ровно одно предложение. Собеседник должен пересказать его смысл перед своим ответом. Посмотрим, кто у вас спорил с реальным человеком, а кто с воображаемым.",
    reply: {
      operation: "replace",
      narrator: "archivist",
      text: "Одно предложение отменяю: господин Шум оставил лазейку для бесконечных запятых. Вместо этого — не больше двенадцати слов на объяснение. Пересказ собеседника сохраняется.",
      after: 10,
      cancelsParent: false,
    },
  },
  {
    id: "future-opening-hours",
    narrator: "archivist",
    title: "Приёмные часы",
    games: ["universes"],
    contextstageIds: ["u-guest"],
    minIntimacy: 0,
    duration: 45,
    priority: 1,
    operation: "add",
    text: "На вашей двери должны быть часы приёма. Впишите, когда гостям рады, а когда вы даже хорошим людям не откроете. И где гости узнают, что дело не в них.",
    reply: {
      narrator: "noise",
      after: 12,
      operation: "replace",
      cancelsParent: false,
      text: "Приёмные часы? Он ещё талончик предложит. Часы убираем. Вместо них придумайте пароль, который значит: я рад тебя видеть, но сейчас хочу побыть один.",
    },
  },
  {
    id: "cult-stubborn-relic",
    narrator: "chance",
    title: "Реликвия не участвует",
    games: ["cult"],
    contextstageIds: ["c-commandments"],
    minIntimacy: 0,
    duration: 45,
    priority: 1,
    operation: "add",
    text: "Срочная новость: священный предмет отказывается участвовать в ритуале. Лежит и не двигается. Придумайте ритуал, в котором его нельзя трогать, поднимать и передвигать.",
    reply: {
      narrator: "momo",
      after: 12,
      operation: "add",
      cancelsParent: false,
      text: "Он и раньше лежал. Просто теперь у него позиция. Условие оставляем, но добавьте в ритуал способ попросить у него прощения. Мне кажется, вы его уже утомили.",
    },
  },
  {
    id: "detective-empty-chair",
    narrator: "noir",
    title: "Стул для подозреваемого",
    games: ["secrets"],
    contextstageIds: ["s-check"],
    minIntimacy: 0,
    duration: 45,
    priority: 1,
    operation: "add",
    text: "Представьте, что ваш главный подозреваемый сидит рядом. Назовите одну известную вам улику, которую он попросил бы проверить ещё раз. Не придумывайте ему оправдание — найдите слабое место в своей версии.",
    reply: {
      narrator: "archivist",
      after: 14,
      operation: "replace",
      cancelsParent: false,
      text: "А теперь уберём этого воображаемого адвоката. Вместо его возражений найдите один факт, который окончательно опроверг бы вашу версию. Есть он в материалах дела или вы его просто ждёте?",
    },
  },
];

/** Compact voiced bank, including a separate closing line for each host. */
export const narratorRemarks: Record<NarratorId, readonly string[]> = {
  noise: [
    "Ну что, образцовые граждане. Сегодня попробуем без образцовых ответов.",
    "Если ответ слишком приличный, проверьте: он вообще ваш?",
    "Шутка засчитана. А что вы думаете после неё?",
    "Слишком стройная версия? Оставьте в ней дверь для сомнения.",
    "Передумали? Прекрасно, у идеи появились следы борьбы.",
    "Красивый принцип особенно весёлый, когда наступает на собственный ботинок.",
    "Последний ход. Что из сегодняшнего вы заберёте с собой, а что оставите валяться под столом?",
  ],
  momo: [
    "Я буду вести себя прилично. Но это не обещание, а настроение.",
    "Не спешите с красивым ответом. Мне и живой понравится.",
    "Если вы улыбнулись одному и тому же — я заметила. Просто сообщаю.",
    "Передумать посреди фразы? Очень человеческий сюжетный поворот.",
    "Любопытство сегодня опять село поближе. Я ему место держала.",
    "Смешное и серьёзное вполне могут сидеть за одним столом.",
    "Остался последний разговор. Мне любопытно, что сегодня оказалось совсем не таким, как вы ожидали.",
  ],
  archivist: [
    "Позвольте. Хороший вопрос ещё не означает хороший ответ.",
    "Отделим то, что вы знаете, от того, во что вам удобно верить.",
    "Два разных ответа не всегда противоречат друг другу. Проверьте определения.",
    "Не торопитесь превращать частный случай в универсальный закон.",
    "У мысли уже нашлось двое свидетелей. Осталось найти основания.",
    "Иногда самое точное слово — «пока».",
    "В заключение отделите то, что вы узнали, от того, что только начали понимать.",
  ],
  chance: [
    "Дамы и господа, всё под контролем. Просто контроль сегодня не пришёл.",
    "Прекрасно! На репетиции такого не было. Репетиции тоже не было.",
    "Планы всё ещё работают. Просто теперь они импровизация.",
    "Если возникла нелепая мысль, не выбрасывайте: я коллекционирую первые издания.",
    "Сегодняшний спонсор — удачное недоразумение.",
    "Аплодирую паузе. Какая выдержка, какая режиссура!",
    "Финальный номер! Пока вы подводите итоги, я проверю, вся ли реальность вернулась на место.",
  ],
  noir: [
    "Мне нравятся хорошие истории. Особенно те, в которых рассказчик старательно пропускает самое интересное.",
    "Не заполняйте каждую паузу. В некоторых уже есть ответ.",
    "Интересно не только то, что вы выбрали, но и то, над чем задержались.",
    "Красивый ответ хорош. Точный обычно интереснее.",
    "О желаниях можно говорить тихо. Они от этого не становятся меньше.",
    "Лучшие истории становятся интереснее после слов «на самом деле».",
    "Перед тем как закончить: что из сказанного сегодня вам захочется вспомнить позже?",
  ],
};

type StageMood =
  | "opening"
  | "create"
  | "reflect"
  | "turn"
  | "choose"
  | "evidence"
  | "reveal"
  | "compare"
  | "listen"
  | "closing";

const stageMoods: Record<string, StageMood> = {
  "u-arrive": "opening",
  "u-home": "create",
  "u-one": "reflect",
  "u-two": "reflect",
  "u-cost": "turn",
  "u-guest": "create",
  "u-reveal-one": "reveal",
  "u-reveal-two": "reveal",
  "u-bridge": "compare",
  "u-return": "closing",
  "c-origin": "opening",
  "c-commandments": "create",
  "c-charter": "choose",
  "c-heresy": "turn",
  "c-human": "reflect",
  "c-famine": "turn",
  "c-treaty": "choose",
  "c-after": "compare",
  "c-legacy": "choose",
  "c-finale": "closing",
  "s-opening": "opening",
  "s-roles": "listen",
  "s-map": "evidence",
  "s-public": "listen",
  "s-second": "listen",
  "s-third": "listen",
  "s-check": "evidence",
  "s-verdict": "evidence",
  "s-solution": "reveal",
  "s-after": "closing",
};

/** The order fallback keeps old saved sessions/callers compatible. */
const stageOrder: Partial<Record<GameId, readonly string[]>> = {
  universes: [
    "u-arrive",
    "u-home",
    "u-one",
    "u-two",
    "u-cost",
    "u-guest",
    "u-reveal-one",
    "u-reveal-two",
    "u-bridge",
    "u-return",
  ],
  cult: [
    "c-origin",
    "c-commandments",
    "c-charter",
    "c-heresy",
    "c-human",
    "c-famine",
    "c-treaty",
    "c-after",
    "c-legacy",
    "c-finale",
  ],
  secrets: [
    "s-opening",
    "s-roles",
    "s-map",
    "s-public",
    "s-second",
    "s-third",
    "s-check",
    "s-verdict",
    "s-after",
  ],
};

const moodRemarks: Record<NarratorId, Record<StageMood, readonly number[]>> = {
  noise: {
    opening: [0],
    create: [3],
    reflect: [1],
    turn: [3],
    choose: [5],
    evidence: [3],
    reveal: [3],
    compare: [1],
    listen: [3],
    closing: [6],
  },
  momo: {
    opening: [0],
    create: [5],
    reflect: [1, 4],
    turn: [3],
    choose: [1],
    evidence: [1],
    reveal: [4],
    compare: [2],
    listen: [4],
    closing: [6],
  },
  archivist: {
    opening: [0],
    create: [4],
    reflect: [2],
    turn: [1],
    choose: [3],
    evidence: [1],
    reveal: [2],
    compare: [2],
    listen: [1],
    closing: [6],
  },
  chance: {
    opening: [0],
    create: [3],
    reflect: [3],
    turn: [2],
    choose: [2],
    evidence: [2],
    reveal: [1],
    compare: [2],
    listen: [4],
    closing: [6],
  },
  noir: {
    opening: [0],
    create: [4],
    reflect: [1, 4],
    turn: [2],
    choose: [2],
    evidence: [3],
    reveal: [2],
    compare: [2],
    listen: [1],
    closing: [6],
  },
};

/** Stage-aware remarks never assume a joke, changed mind or yet-unread clue. */
export function stageRemark(
  narrator: NarratorId,
  game: GameId,
  stageIndex: number,
  stageId?: string,
): string {
  const index = Number.isFinite(stageIndex)
    ? Math.max(0, Math.trunc(stageIndex))
    : 0;
  const id = stageId ?? stageOrder[game]?.[index];
  const mood = (id && stageMoods[id]) || (index === 0 ? "opening" : "reflect");
  const choices = moodRemarks[narrator][mood];
  return narratorRemarks[narrator][choices[index % choices.length]];
}
