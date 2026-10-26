import type { NarratorId } from "../types";
import type { DrawingTask } from "./types";

export const noirDrawingTasks: Record<
  string,
  Record<NarratorId, readonly DrawingTask[]>
> = {
  "noir-house": {
    momo: [
      {
        id: "noir-house-momo-warm-clothing",
        purpose: "warm-clothing",
        text: "Дорисуй в укромной комнате тёплую вещь из одежды, в которую тебе приятно закутаться холодным вечером.",
      },
      {
        id: "noir-house-momo-warm-drink",
        purpose: "warm-drink",
        text: "Дорисуй у стены одной из комнат одну вещь, с помощью которой ты готовишь любимый горячий напиток для тихого домашнего вечера.",
      },
      {
        id: "noir-house-momo-welcome-food",
        purpose: "welcome-food",
        text: "Дорисуй у двери дома одно угощение, которое тебе хотелось бы предложить близкому человеку. Сам выбери, чем его порадовать.",
      },
      {
        id: "noir-house-momo-shared-pastime",
        purpose: "shared-pastime",
        text: "Дорисуй в большой комнате одну вещь для спокойного занятия вдвоём, которым тебе приятно делиться с близким человеком.",
      },
      {
        id: "noir-house-momo-restful-light",
        purpose: "restful-light",
        text: "Дорисуй в углу укромной комнаты один предмет, дающий свет, при котором тебе легче отдыхать. Сам выбери, от чего будет исходить свет.",
      },
      {
        id: "noir-house-momo-pleasant-scent",
        purpose: "pleasant-scent",
        text: "Дорисуй у стены дома один предмет с запахом, который делает помещение уютным именно для тебя.",
      },
      {
        id: "noir-house-momo-soothing-sound",
        purpose: "soothing-sound",
        text: "Дорисуй в одной из комнат небольшой источник звука, под который тебе было бы спокойно засыпать.",
      },
      {
        id: "noir-house-momo-plant-care",
        purpose: "plant-care",
        text: "Дорисуй в свободном углу дома растение в горшке, за которым тебе хотелось бы заботливо ухаживать.",
      },
    ],
    noir: [
      {
        id: "noir-house-noir-childhood-keepsake",
        purpose: "childhood-keepsake",
        text: "Дорисуй в укромной комнате маленькую вещь из своего детства, которую тебе хотелось бы сохранить в этом доме.",
      },
      {
        id: "noir-house-noir-private-ritual",
        purpose: "private-ritual",
        text: "Дорисуй у стены укромной комнаты предмет для привычного занятия, которому ты предаёшься только наедине с собой.",
      },
      {
        id: "noir-house-noir-unspoken-message",
        purpose: "unspoken-message",
        text: "Дорисуй у двери комнаты одну вещь, которую ты оставил бы близкому человеку вместо признания, на которое пока не решаешься. Сам выбери предмет; надписей не нужно.",
      },
      {
        id: "noir-house-noir-guarded-possession",
        purpose: "guarded-possession",
        text: "Дорисуй в глубине одной из комнат личную вещь, которую ты разрешил бы брать только человеку, которому очень доверяешь.",
      },
      {
        id: "noir-house-noir-secret-fear",
        purpose: "secret-fear",
        text: "Дорисуй в дальнем углу дома небольшой предмет, который пугает тебя сильнее, чем можно подумать по его виду.",
      },
      {
        id: "noir-house-noir-deferred-ambition",
        purpose: "deferred-ambition",
        text: "Дорисуй в пустой комнате один предмет для умения, которому ты давно хочешь научиться, но пока откладываешь.",
      },
      {
        id: "noir-house-noir-regretted-purchase",
        purpose: "regretted-purchase",
        text: "Дорисуй у стены дома небольшую покупку, о которой ты жалеешь, хотя когда-то очень хотел её сделать.",
      },
      {
        id: "noir-house-noir-unadvertised-achievement",
        purpose: "unadvertised-achievement",
        text: "Дорисуй в одной из комнат маленькую вещь, связанную с твоим достижением, которым ты редко хвастаешься.",
      },
    ],
    archivist: [
      {
        id: "noir-house-archivist-repair-tool",
        purpose: "repair-tool",
        text: "Дорисуй у стены комнаты один инструмент для домашней поломки, которую ты предпочёл бы исправить самостоятельно.",
      },
      {
        id: "noir-house-archivist-cleaning-tool",
        purpose: "cleaning-tool",
        text: "Дорисуй у двери дома небольшой предмет для уборки той грязи, которая больше всего раздражает тебя в быту.",
      },
      {
        id: "noir-house-archivist-timekeeping",
        purpose: "timekeeping",
        text: "Дорисуй на стене одной из комнат прибор для отсчёта времени: выбери тот, с которым тебе удобнее соблюдать свой распорядок.",
      },
      {
        id: "noir-house-archivist-spare-consumable",
        purpose: "spare-consumable",
        text: "Дорисуй в углу комнаты одну запасную расходную вещь, которая у тебя обычно заканчивается в самый неподходящий момент.",
      },
      {
        id: "noir-house-archivist-measuring-tool",
        purpose: "measuring-tool",
        text: "Дорисуй на полу комнаты один измерительный инструмент для величины, которую тебе чаще всего приходится проверять дома.",
      },
      {
        id: "noir-house-archivist-small-item-storage",
        purpose: "small-item-storage",
        text: "Дорисуй у стены дома маленький органайзер для тех мелочей, которые ты постоянно ищешь. Сам выбери вид хранилища.",
      },
      {
        id: "noir-house-archivist-task-recording",
        purpose: "task-recording",
        text: "Дорисуй в одной из комнат небольшой предмет, в котором тебе удобно записывать домашние дела. Сами записи рисовать не нужно.",
      },
      {
        id: "noir-house-archivist-distraction-blocking",
        purpose: "distraction-blocking",
        text: "Дорисуй в укромной комнате одну небольшую вещь, которая помогла бы тебе не отвлекаться на шум во время работы.",
      },
    ],
    noise: [
      {
        id: "noir-house-noise-forbidden-toy",
        purpose: "forbidden-toy",
        text: "Дорисуй на полу одной из комнат игрушку, которую тебе запрещали иметь в детстве. Здесь ты сам решаешь, чему быть в доме.",
      },
      {
        id: "noir-house-noise-useless-collection",
        purpose: "useless-collection",
        text: "Дорисуй у стены комнаты один маленький экземпляр коллекции, которую тебе было бы весело собирать без всякой пользы.",
      },
      {
        id: "noir-house-noise-messy-play",
        purpose: "messy-play",
        text: "Дорисуй на полу большой комнаты один материал для развлечения, ради которого ты готов потом отмывать весь дом.",
      },
      {
        id: "noir-house-noise-playful-repurpose",
        purpose: "playful-repurpose",
        text: "Дорисуй у двери комнаты обычный бытовой предмет, которым тебе нравится играть вместо того, чтобы применять его по назначению.",
      },
      {
        id: "noir-house-noise-bold-accessory",
        purpose: "bold-accessory",
        text: "Дорисуй на стене комнаты один броский аксессуар, который тебе хотелось бы носить, даже если окружающие считают его нелепым.",
      },
      {
        id: "noir-house-noise-silly-prank",
        purpose: "silly-prank",
        text: "Дорисуй у входа в комнату маленькую вещь для безобидного розыгрыша, над которым тебе самому было бы смешно.",
      },
      {
        id: "noir-house-noise-rule-free-snack",
        purpose: "rule-free-snack",
        text: "Дорисуй в укромной комнате одну порцию еды, которую тебе хотелось бы есть в странное время, несмотря на правила приличного питания.",
      },
      {
        id: "noir-house-noise-spontaneous-escape",
        purpose: "spontaneous-escape",
        text: "Дорисуй возле двери дома небольшую вещь, которую ты схватил бы для внезапной прогулки, когда сидеть дома больше не хочется.",
      },
    ],
    chance: [
      {
        id: "noir-house-chance-gravity-free",
        purpose: "gravity-free",
        text: "Дорисуй посреди комнаты предмет, который парит чуть выше пола. Выбери вещь, которую тебе обычно тяжело поднимать, и нарисуй её небольшой.",
      },
      {
        id: "noir-house-chance-pocket-size",
        purpose: "pocket-size",
        text: "Дорисуй у стены комнаты огромную в обычной жизни вещь, уменьшенную до размера ладони. Выбери то, чем тебе хотелось бы любоваться дома в миниатюре.",
      },
      {
        id: "noir-house-chance-edible-material",
        purpose: "edible-material",
        text: "Дорисуй на полу комнаты маленький бытовой предмет, целиком сделанный из твоей любимой еды. Выбери, какой предмет было бы забавно съесть.",
      },
      {
        id: "noir-house-chance-self-replenishing",
        purpose: "self-replenishing",
        text: "Дорисуй в углу дома предмет с расходуемым содержимым, которое тебе надоело покупать. Пусть из него растёт веточка, на которой созревают новые порции именно этого содержимого.",
      },
      {
        id: "noir-house-chance-reverse-aging",
        purpose: "reverse-aging",
        text: "Дорисуй в укромной комнате многоразовый предмет, износ которого тебя огорчает. Покажи, как он сбрасывает старую потёртую оболочку, словно змеиную кожу, а под ней уже видна новая поверхность.",
      },
      {
        id: "noir-house-chance-bottled-weather",
        purpose: "bottled-weather",
        text: "Дорисуй у стены дома прозрачный сосуд с погодой внутри. Сам выбери погоду, которую тебе хотелось бы иметь под рукой в любой сезон.",
      },
      {
        id: "noir-house-chance-animal-voice",
        purpose: "animal-voice",
        text: "Дорисуй у двери комнаты небольшой предмет с торчащей из него живой мордочкой животного. Сам выбери вещь и животное, чьему голосу ты обрадовался бы при каждом касании.",
      },
      {
        id: "noir-house-chance-mood-color",
        purpose: "mood-color",
        text: "Дорисуй в одной из комнат вещь, перекрашивающую себя под твоё настроение. Выбери предмет и цвет; нарисуй растущее прямо из вещи маленькое облачко, которое поливает её краской этого цвета.",
      },
    ],
  },
  "noir-theater": {
    momo: [
      {
        id: "noir-theater-momo-warm-clothing",
        purpose: "warm-clothing",
        text: "Дорисуй у края сцены тёплую вещь из одежды, которую тебе хотелось бы накинуть на плечи во время прохладного представления.",
      },
      {
        id: "noir-theater-momo-warm-drink",
        purpose: "warm-drink",
        text: "Дорисуй на полу сцены возле занавеса одну вещь, с помощью которой ты приготовил бы себе согревающий напиток перед выступлением.",
      },
      {
        id: "noir-theater-momo-welcome-food",
        purpose: "welcome-food",
        text: "Дорисуй у одного прохода за кулисы одно угощение, которым тебе хотелось бы порадовать близкого человека после спектакля. Сам выбери еду.",
      },
      {
        id: "noir-theater-momo-shared-pastime",
        purpose: "shared-pastime",
        text: "Дорисуй на краю сцены одну вещь для тихого занятия вдвоём, которым тебе было бы приятно заняться между репетициями.",
      },
      {
        id: "noir-theater-momo-restful-light",
        purpose: "restful-light",
        text: "Дорисуй сбоку сцены один предмет, дающий свет, при котором тебе спокойно побыть после представления. Сам выбери источник света.",
      },
      {
        id: "noir-theater-momo-pleasant-scent",
        purpose: "pleasant-scent",
        text: "Дорисуй возле занавеса один предмет с запахом, который помог бы тебе почувствовать себя в этом театре уютно.",
      },
      {
        id: "noir-theater-momo-soothing-sound",
        purpose: "soothing-sound",
        text: "Дорисуй у прохода за кулисы маленький источник звука, который успокоил бы тебя перед первым выходом на сцену.",
      },
      {
        id: "noir-theater-momo-plant-care",
        purpose: "plant-care",
        text: "Дорисуй в свободном углу сцены растение в горшке, о котором тебе было бы приятно заботиться между спектаклями.",
      },
    ],
    noir: [
      {
        id: "noir-theater-noir-childhood-keepsake",
        purpose: "childhood-keepsake",
        text: "Дорисуй возле занавеса маленькую вещь из своего детства, которую ты согласился бы показать на сцене как личный экспонат.",
      },
      {
        id: "noir-theater-noir-private-ritual",
        purpose: "private-ritual",
        text: "Дорисуй у одного прохода за кулисы предмет для своего занятия наедине, ради которого тебе захотелось бы ненадолго скрыться со сцены.",
      },
      {
        id: "noir-theater-noir-unspoken-message",
        purpose: "unspoken-message",
        text: "Дорисуй на краю сцены одну вещь, которую ты вручил бы близкому человеку вместо слов, которые трудно произнести. Сам выбери предмет; надписей не нужно.",
      },
      {
        id: "noir-theater-noir-guarded-possession",
        purpose: "guarded-possession",
        text: "Дорисуй у занавеса личную вещь, которую ты доверил бы подержать за кулисами только очень близкому человеку.",
      },
      {
        id: "noir-theater-noir-secret-fear",
        purpose: "secret-fear",
        text: "Дорисуй в дальнем углу сцены небольшой предмет, чьё появление в спектакле напугало бы тебя сильнее, чем окружающих.",
      },
      {
        id: "noir-theater-noir-deferred-ambition",
        purpose: "deferred-ambition",
        text: "Дорисуй посреди сцены один предмет для умения, которому ты давно хочешь научиться, прежде чем решишься выступить с ним.",
      },
      {
        id: "noir-theater-noir-regretted-purchase",
        purpose: "regretted-purchase",
        text: "Дорисуй у прохода за кулисы свою неудачную небольшую покупку, которую было бы не жалко отдать театру как реквизит.",
      },
      {
        id: "noir-theater-noir-unadvertised-achievement",
        purpose: "unadvertised-achievement",
        text: "Дорисуй на краю сцены маленькую вещь, связанную с твоим достижением, за которое ты редко принимаешь аплодисменты.",
      },
    ],
    archivist: [
      {
        id: "noir-theater-archivist-repair-tool",
        purpose: "repair-tool",
        text: "Дорисуй у прохода за кулисы один инструмент, которым ты сумел бы починить сломанный реквизит. Выбери знакомый тебе инструмент.",
      },
      {
        id: "noir-theater-archivist-cleaning-tool",
        purpose: "cleaning-tool",
        text: "Дорисуй сбоку сцены небольшой предмет для уборки той грязи, которую тебе неприятнее всего было бы увидеть перед спектаклем.",
      },
      {
        id: "noir-theater-archivist-timekeeping",
        purpose: "timekeeping",
        text: "Дорисуй возле занавеса прибор для отсчёта времени, по которому тебе было бы удобно следить за длительностью репетиции.",
      },
      {
        id: "noir-theater-archivist-spare-consumable",
        purpose: "spare-consumable",
        text: "Дорисуй у прохода за кулисы один запасной расходный материал, который ты предпочёл бы иметь для своей работы над спектаклем.",
      },
      {
        id: "noir-theater-archivist-measuring-tool",
        purpose: "measuring-tool",
        text: "Дорисуй на полу сцены один измерительный инструмент для величины, которую тебе хотелось бы точно знать при подготовке спектакля.",
      },
      {
        id: "noir-theater-archivist-small-item-storage",
        purpose: "small-item-storage",
        text: "Дорисуй рядом с занавесом маленький органайзер для тех мелочей, которые ты боялся бы потерять за кулисами. Сам выбери его вид.",
      },
      {
        id: "noir-theater-archivist-task-recording",
        purpose: "task-recording",
        text: "Дорисуй у края сцены небольшой предмет, в котором тебе было бы удобно записывать задачи перед представлением. Записи не нужны.",
      },
      {
        id: "noir-theater-archivist-distraction-blocking",
        purpose: "distraction-blocking",
        text: "Дорисуй возле одного прохода за кулисы небольшую вещь, с которой тебе легче сосредоточиться, когда вокруг репетируют и шумят.",
      },
    ],
    noise: [
      {
        id: "noir-theater-noise-forbidden-toy",
        purpose: "forbidden-toy",
        text: "Дорисуй посреди сцены игрушку, которую тебе запрещали в детстве. Пусть именно она получит здесь почётное место.",
      },
      {
        id: "noir-theater-noise-useless-collection",
        purpose: "useless-collection",
        text: "Дорисуй у занавеса один маленький экземпляр бесполезной коллекции, которую тебе захотелось бы выставить на сцене просто для радости.",
      },
      {
        id: "noir-theater-noise-messy-play",
        purpose: "messy-play",
        text: "Дорисуй на краю сцены один материал для развлечения, после которого придётся долго убираться, но тебе всё равно хочется попробовать.",
      },
      {
        id: "noir-theater-noise-playful-repurpose",
        purpose: "playful-repurpose",
        text: "Дорисуй посреди сцены обычный бытовой предмет, который ты использовал бы в смешном номере совсем не по назначению.",
      },
      {
        id: "noir-theater-noise-bold-accessory",
        purpose: "bold-accessory",
        text: "Дорисуй у прохода за кулисы один дерзкий аксессуар, в котором тебе хотелось бы выйти на сцену без оглядки на чужой вкус.",
      },
      {
        id: "noir-theater-noise-silly-prank",
        purpose: "silly-prank",
        text: "Дорисуй у края занавеса маленькую вещь для безобидного розыгрыша, который тебе было бы весело устроить в этом театре.",
      },
      {
        id: "noir-theater-noise-rule-free-snack",
        purpose: "rule-free-snack",
        text: "Дорисуй на краю сцены одну порцию еды, которую тебе хотелось бы жевать прямо во время выступления, наплевав на театральный этикет.",
      },
      {
        id: "noir-theater-noise-spontaneous-escape",
        purpose: "spontaneous-escape",
        text: "Дорисуй у прохода за кулисы маленькую вещь, которую ты взял бы для внезапной прогулки, если репетиция наскучит.",
      },
    ],
    chance: [
      {
        id: "noir-theater-chance-gravity-free",
        purpose: "gravity-free",
        text: "Дорисуй над полом сцены парящий предмет. Выбери вещь, которую тебе особенно не нравится таскать из-за её веса, и изобрази её небольшой.",
      },
      {
        id: "noir-theater-chance-pocket-size",
        purpose: "pocket-size",
        text: "Дорисуй у занавеса вещь, которая обычно огромна, но здесь помещается на ладони. Выбери то, чем тебе хотелось бы любоваться как крошечным театральным чудом.",
      },
      {
        id: "noir-theater-chance-edible-material",
        purpose: "edible-material",
        text: "Дорисуй у края сцены небольшой предмет реквизита, сделанный из твоей любимой еды. Сам выбери, какой реквизит захотелось бы попробовать.",
      },
      {
        id: "noir-theater-chance-self-replenishing",
        purpose: "self-replenishing",
        text: "Дорисуй возле прохода за кулисы предмет с расходуемым содержимым, запас которого ты не хочешь пополнять перед каждым спектаклем. Нарисуй растущую из предмета веточку с новыми порциями содержимого.",
      },
      {
        id: "noir-theater-chance-reverse-aging",
        purpose: "reverse-aging",
        text: "Дорисуй у занавеса многоразовый предмет, который тебе жалко изнашивать. Покажи, как он сбрасывает потёртую оболочку, словно змеиную кожу, а под ней уже видна новая поверхность.",
      },
      {
        id: "noir-theater-chance-bottled-weather",
        purpose: "bottled-weather",
        text: "Дорисуй на краю сцены прозрачный сосуд с погодой для твоего идеального спектакля. Сам выбери, какую погоду в нём держать.",
      },
      {
        id: "noir-theater-chance-animal-voice",
        purpose: "animal-voice",
        text: "Дорисуй у прохода за кулисы небольшой предмет с торчащей из него живой мордочкой животного. Выбери вещь и животное, чьим голосом тебе хотелось бы озвучить спектакль при касании предмета.",
      },
      {
        id: "noir-theater-chance-mood-color",
        purpose: "mood-color",
        text: "Дорисуй возле занавеса вещь, перекрашивающую себя под твоё настроение перед выступлением. Выбери предмет и цвет; покажи растущее прямо из вещи маленькое облачко, которое поливает её краской этого цвета.",
      },
    ],
  },
  "noir-museum": {
    momo: [
      {
        id: "noir-museum-momo-warm-clothing",
        purpose: "warm-clothing",
        text: "Дорисуй на одной подставке тёплую вещь из одежды, в которую тебе приятно укутаться. Здесь можно выставить и такую домашнюю ценность.",
      },
      {
        id: "noir-museum-momo-warm-drink",
        purpose: "warm-drink",
        text: "Дорисуй на полу у стены музея одну вещь для приготовления горячего напитка, которым тебе приятно согреваться во время долгого отдыха.",
      },
      {
        id: "noir-museum-momo-welcome-food",
        purpose: "welcome-food",
        text: "Дорисуй у двери музея одно угощение, которым тебе хотелось бы встретить дорогого человека на своей выставке. Сам выбери еду.",
      },
      {
        id: "noir-museum-momo-shared-pastime",
        purpose: "shared-pastime",
        text: "Дорисуй в свободном углу зала одну вещь для спокойного занятия вдвоём, ради которого тебе хотелось бы задержаться здесь с близким человеком.",
      },
      {
        id: "noir-museum-momo-restful-light",
        purpose: "restful-light",
        text: "Дорисуй у стены музейного зала один предмет, дающий свет для приятного тебе спокойного отдыха. Сам выбери, от чего этот свет будет исходить.",
      },
      {
        id: "noir-museum-momo-pleasant-scent",
        purpose: "pleasant-scent",
        text: "Дорисуй на одной подставке предмет с запахом, который тебе хотелось бы сделать частью уютной атмосферы музея.",
      },
      {
        id: "noir-museum-momo-soothing-sound",
        purpose: "soothing-sound",
        text: "Дорисуй в свободном углу музея маленький источник звука, который помог бы тебе успокоиться после насыщенного дня.",
      },
      {
        id: "noir-museum-momo-plant-care",
        purpose: "plant-care",
        text: "Дорисуй у стены зала растение в горшке, за которым тебе хотелось бы ухаживать, даже если никто не назовёт его искусством.",
      },
    ],
    noir: [
      {
        id: "noir-museum-noir-childhood-keepsake",
        purpose: "childhood-keepsake",
        text: "Дорисуй на одной подставке маленькую вещь из своего детства, которую ты считаешь достойной отдельного места в личном музее.",
      },
      {
        id: "noir-museum-noir-private-ritual",
        purpose: "private-ritual",
        text: "Дорисуй в свободном углу музея один предмет для занятия, которому ты обычно предаёшься, когда никто не видит.",
      },
      {
        id: "noir-museum-noir-unspoken-message",
        purpose: "unspoken-message",
        text: "Дорисуй на подставке одну вещь, которую ты подарил бы близкому человеку вместо трудного признания. Сам выбери предмет, способный передать твои чувства без надписей.",
      },
      {
        id: "noir-museum-noir-guarded-possession",
        purpose: "guarded-possession",
        text: "Дорисуй на одной подставке личную вещь, которую ты разрешил бы взять в руки только человеку, которому полностью доверяешь.",
      },
      {
        id: "noir-museum-noir-secret-fear",
        purpose: "secret-fear",
        text: "Дорисуй у дальней стены музейного зала небольшой предмет, который вызывает у тебя страх, хотя другие могли бы спокойно пройти мимо.",
      },
      {
        id: "noir-museum-noir-deferred-ambition",
        purpose: "deferred-ambition",
        text: "Дорисуй на одной подставке предмет для умения, которым ты давно мечтаешь овладеть, но до сих пор не начал учиться.",
      },
      {
        id: "noir-museum-noir-regretted-purchase",
        purpose: "regretted-purchase",
        text: "Дорисуй на полу у стены музея небольшую покупку, о которой ты жалеешь: здесь она хотя бы станет экспонатом.",
      },
      {
        id: "noir-museum-noir-unadvertised-achievement",
        purpose: "unadvertised-achievement",
        text: "Дорисуй на подставке маленькую вещь, связанную с твоим достижением, о котором знают немногие. Сам выбери, что заслуживает места в музее.",
      },
    ],
    archivist: [
      {
        id: "noir-museum-archivist-repair-tool",
        purpose: "repair-tool",
        text: "Дорисуй на полу у стены музея один знакомый тебе инструмент, которым ты взялся бы починить повреждённый экспонат.",
      },
      {
        id: "noir-museum-archivist-cleaning-tool",
        purpose: "cleaning-tool",
        text: "Дорисуй у двери музея небольшой предмет для уборки загрязнения, которое тебе труднее всего терпеть в помещении.",
      },
      {
        id: "noir-museum-archivist-timekeeping",
        purpose: "timekeeping",
        text: "Дорисуй на стене музея прибор для отсчёта времени, по которому тебе было бы удобнее следить, когда пора заканчивать осмотр.",
      },
      {
        id: "noir-museum-archivist-spare-consumable",
        purpose: "spare-consumable",
        text: "Дорисуй в свободном углу музея один запасной расходный материал, который ты непременно держал бы для ухода за своей выставкой.",
      },
      {
        id: "noir-museum-archivist-measuring-tool",
        purpose: "measuring-tool",
        text: "Дорисуй возле одной подставки измерительный инструмент: выбери величину, которую тебе хотелось бы точно проверить перед размещением экспонатов.",
      },
      {
        id: "noir-museum-archivist-small-item-storage",
        purpose: "small-item-storage",
        text: "Дорисуй у стены музея маленький органайзер для тех мелочей, которые ты боялся бы растерять при подготовке выставки. Сам выбери его вид.",
      },
      {
        id: "noir-museum-archivist-task-recording",
        purpose: "task-recording",
        text: "Дорисуй у двери зала небольшой предмет, в котором тебе удобно записывать дела по музею. Содержимое записей не нужно.",
      },
      {
        id: "noir-museum-archivist-distraction-blocking",
        purpose: "distraction-blocking",
        text: "Дорисуй в свободном углу музея небольшую вещь, которая помогла бы тебе сосредоточиться на работе, несмотря на разговоры в зале.",
      },
    ],
    noise: [
      {
        id: "noir-museum-noise-forbidden-toy",
        purpose: "forbidden-toy",
        text: "Дорисуй на одной подставке игрушку, которую тебе не разрешали иметь в детстве. Теперь ей можно занять место музейной ценности.",
      },
      {
        id: "noir-museum-noise-useless-collection",
        purpose: "useless-collection",
        text: "Дорисуй на подставке один маленький экземпляр коллекции, которую тебе хотелось бы собирать, даже если никто не понимает зачем.",
      },
      {
        id: "noir-museum-noise-messy-play",
        purpose: "messy-play",
        text: "Дорисуй на полу свободного угла один материал для игры, ради которой тебе было бы не жалко испачкать строгий музейный зал.",
      },
      {
        id: "noir-museum-noise-playful-repurpose",
        purpose: "playful-repurpose",
        text: "Дорисуй на подставке бытовой предмет, которым тебе нравится пользоваться для забавы совсем не по назначению.",
      },
      {
        id: "noir-museum-noise-bold-accessory",
        purpose: "bold-accessory",
        text: "Дорисуй у стены музейного зала один вызывающий аксессуар, который ты с удовольствием надел бы на торжественное открытие, невзирая на чужие взгляды.",
      },
      {
        id: "noir-museum-noise-silly-prank",
        purpose: "silly-prank",
        text: "Дорисуй у двери музея маленькую вещь для безобидного розыгрыша, который тебе хотелось бы устроить среди этой серьёзности.",
      },
      {
        id: "noir-museum-noise-rule-free-snack",
        purpose: "rule-free-snack",
        text: "Дорисуй возле подставки одну порцию еды, которую тебе хотелось бы есть во время осмотра, даже если приличные посетители так не делают.",
      },
      {
        id: "noir-museum-noise-spontaneous-escape",
        purpose: "spontaneous-escape",
        text: "Дорисуй у двери зала небольшую вещь для внезапной прогулки, на которую ты охотнее отправился бы, чем досматривал скучную выставку.",
      },
    ],
    chance: [
      {
        id: "noir-museum-chance-gravity-free",
        purpose: "gravity-free",
        text: "Дорисуй над одной подставкой парящую вещь, которую тебе тяжело поднимать в обычной жизни. Изобрази её небольшим музейным экспонатом.",
      },
      {
        id: "noir-museum-chance-pocket-size",
        purpose: "pocket-size",
        text: "Дорисуй на подставке огромную в обычной жизни вещь, уменьшенную до размера ладони. Выбери то, что тебе любопытно рассмотреть целиком совсем близко.",
      },
      {
        id: "noir-museum-chance-edible-material",
        purpose: "edible-material",
        text: "Дорисуй на одной подставке небольшой обычный предмет, сделанный из твоей любимой еды: какой экспонат тебе захотелось бы попробовать?",
      },
      {
        id: "noir-museum-chance-self-replenishing",
        purpose: "self-replenishing",
        text: "Дорисуй в свободном углу музея предмет с расходуемым содержимым, которое тебе досадно постоянно покупать. Пусть из предмета растёт веточка, на которой созревают новые порции этого содержимого.",
      },
      {
        id: "noir-museum-chance-reverse-aging",
        purpose: "reverse-aging",
        text: "Дорисуй на подставке многоразовый предмет, который тебе хотелось бы уберечь от износа. Пусть он сбрасывает старую потёртую оболочку, словно змеиную кожу; под ней уже видна новая поверхность.",
      },
      {
        id: "noir-museum-chance-bottled-weather",
        purpose: "bottled-weather",
        text: "Дорисуй на одной подставке прозрачный сосуд с погодой, которую тебе хотелось бы сохранить для любого сезона. Сам выбери эту погоду.",
      },
      {
        id: "noir-museum-chance-animal-voice",
        purpose: "animal-voice",
        text: "Дорисуй на подставке небольшой предмет с торчащей из него живой мордочкой животного. Сам выбери экспонат и животное, чьему голосу тебе было бы приятно удивиться при касании.",
      },
      {
        id: "noir-museum-chance-mood-color",
        purpose: "mood-color",
        text: "Дорисуй у стены музея вещь, перекрашивающую себя под твоё настроение. Сам выбери предмет и цвет; нарисуй растущее прямо из вещи маленькое облачко, которое поливает её краской этого цвета.",
      },
    ],
  },
  "noir-station": {
    momo: [
      {
        id: "noir-station-momo-warm-clothing",
        purpose: "warm-clothing",
        text: "Дорисуй на полу у окна вокзала тёплую вещь из одежды, которую тебе приятно накинуть во время долгого ночного ожидания.",
      },
      {
        id: "noir-station-momo-warm-drink",
        purpose: "warm-drink",
        text: "Дорисуй у стены зала ожидания одну вещь для приготовления горячего напитка твоим любимым способом: что согрело бы тебя перед ночной дорогой?",
      },
      {
        id: "noir-station-momo-welcome-food",
        purpose: "welcome-food",
        text: "Дорисуй у выхода на платформу маленькое угощение, с которым ты встретил бы близкого человека после долгой поездки.",
      },
      {
        id: "noir-station-momo-shared-pastime",
        purpose: "shared-pastime",
        text: "Дорисуй на свободном полу зала ожидания одну вещь для тихого занятия вдвоём, с которым тебе было бы приятно ждать поезда рядом с близким.",
      },
      {
        id: "noir-station-momo-restful-light",
        purpose: "restful-light",
        text: "Дорисуй у стены зала ожидания один предмет, дающий свет, при котором тебе спокойно переждать ночь. Сам выбери источник света.",
      },
      {
        id: "noir-station-momo-pleasant-scent",
        purpose: "pleasant-scent",
        text: "Дорисуй у окна вокзала небольшой предмет с запахом, который сделал бы ночное ожидание уютнее именно для тебя.",
      },
      {
        id: "noir-station-momo-soothing-sound",
        purpose: "soothing-sound",
        text: "Дорисуй в углу зала ожидания маленький источник звука, который успокоил бы тебя перед дальней поездкой.",
      },
      {
        id: "noir-station-momo-plant-care",
        purpose: "plant-care",
        text: "Дорисуй у окна вокзала растение в горшке, о котором тебе хотелось бы заботиться, если бы ты часто бывал на этой станции.",
      },
    ],
    noir: [
      {
        id: "noir-station-noir-childhood-keepsake",
        purpose: "childhood-keepsake",
        text: "Дорисуй у стены зала ожидания маленькую вещь из своего детства, с которой тебе хотелось бы отправиться в эту ночную поездку.",
      },
      {
        id: "noir-station-noir-private-ritual",
        purpose: "private-ritual",
        text: "Дорисуй в дальнем углу зала один предмет для своего привычного занятия наедине, которому ты предался бы в тихие часы ожидания.",
      },
      {
        id: "noir-station-noir-unspoken-message",
        purpose: "unspoken-message",
        text: "Дорисуй у выхода на платформу одну вещь, которую ты оставил бы близкому человеку вместо слов, которые трудно сказать перед отъездом. Сам выбери предмет; надписей не нужно.",
      },
      {
        id: "noir-station-noir-guarded-possession",
        purpose: "guarded-possession",
        text: "Дорисуй у стены вокзала личную вещь, которую ты оставил бы на время поездки только человеку, которому очень доверяешь.",
      },
      {
        id: "noir-station-noir-secret-fear",
        purpose: "secret-fear",
        text: "Дорисуй в углу зала ожидания небольшой предмет, которого тебе было бы страшно коснуться, хотя со стороны он выглядит безобидно.",
      },
      {
        id: "noir-station-noir-deferred-ambition",
        purpose: "deferred-ambition",
        text: "Дорисуй на полу у окна вокзала один предмет для умения, которому ты давно собираешься научиться и на которое надеешься найти время в поездке.",
      },
      {
        id: "noir-station-noir-regretted-purchase",
        purpose: "regretted-purchase",
        text: "Дорисуй у стены зала ожидания небольшую вещь, которую ты когда-то зря купил и теперь жалеешь, что повёз с собой.",
      },
      {
        id: "noir-station-noir-unadvertised-achievement",
        purpose: "unadvertised-achievement",
        text: "Дорисуй у окна вокзала маленькую вещь, связанную с твоим достижением, о котором ты вряд ли станешь рассказывать попутчикам.",
      },
    ],
    archivist: [
      {
        id: "noir-station-archivist-repair-tool",
        purpose: "repair-tool",
        text: "Дорисуй у стены вокзала один небольшой инструмент, которым ты сумел бы сам устранить неприятную поломку в дороге.",
      },
      {
        id: "noir-station-archivist-cleaning-tool",
        purpose: "cleaning-tool",
        text: "Дорисуй у выхода на платформу небольшой предмет для уборки загрязнения, с которым тебе меньше всего хотелось бы столкнуться в поездке.",
      },
      {
        id: "noir-station-archivist-timekeeping",
        purpose: "timekeeping",
        text: "Дорисуй на стене зала ожидания прибор для отсчёта времени, с которым тебе было бы удобнее не пропустить отправление.",
      },
      {
        id: "noir-station-archivist-spare-consumable",
        purpose: "spare-consumable",
        text: "Дорисуй у стены зала ожидания одну запасную расходную вещь, без которой тебе особенно досадно остаться в дальней дороге.",
      },
      {
        id: "noir-station-archivist-measuring-tool",
        purpose: "measuring-tool",
        text: "Дорисуй на полу у окна вокзала один измерительный инструмент для величины, которую тебе хотелось бы проверить перед дальней поездкой.",
      },
      {
        id: "noir-station-archivist-small-item-storage",
        purpose: "small-item-storage",
        text: "Дорисуй возле выхода на платформу маленький органайзер для мелочей, которые тебе труднее всего найти в дороге. Сам выбери его вид.",
      },
      {
        id: "noir-station-archivist-task-recording",
        purpose: "task-recording",
        text: "Дорисуй у стены вокзала небольшой предмет, в котором тебе было бы удобно записывать дела перед отправлением. Сами записи не нужны.",
      },
      {
        id: "noir-station-archivist-distraction-blocking",
        purpose: "distraction-blocking",
        text: "Дорисуй в углу зала ожидания одну небольшую вещь, с которой тебе легче сосредоточиться на деле среди вокзального шума.",
      },
    ],
    noise: [
      {
        id: "noir-station-noise-forbidden-toy",
        purpose: "forbidden-toy",
        text: "Дорисуй на полу зала ожидания игрушку, которую тебе запрещали в детстве. Теперь ты можешь взять её даже в серьёзную взрослую поездку.",
      },
      {
        id: "noir-station-noise-useless-collection",
        purpose: "useless-collection",
        text: "Дорисуй у окна вокзала один маленький экземпляр бесполезной коллекции, которую тебе было бы весело пополнять в поездках.",
      },
      {
        id: "noir-station-noise-messy-play",
        purpose: "messy-play",
        text: "Дорисуй в свободном углу зала один материал для игры, ради которой тебе было бы не жалко испачкаться прямо перед поездом.",
      },
      {
        id: "noir-station-noise-playful-repurpose",
        purpose: "playful-repurpose",
        text: "Дорисуй на полу у стены вокзала обычный предмет, которым ты забавлялся бы в ожидании поезда, используя его не по назначению.",
      },
      {
        id: "noir-station-noise-bold-accessory",
        purpose: "bold-accessory",
        text: "Дорисуй у окна зала один броский аксессуар, который тебе хотелось бы носить в дороге без оглядки на взгляды незнакомцев.",
      },
      {
        id: "noir-station-noise-silly-prank",
        purpose: "silly-prank",
        text: "Дорисуй у выхода на платформу маленькую вещь для безобидного розыгрыша, который тебе хотелось бы устроить во время ожидания.",
      },
      {
        id: "noir-station-noise-rule-free-snack",
        purpose: "rule-free-snack",
        text: "Дорисуй у стены зала одну порцию еды, которую тебе хочется съесть среди ночи, даже если по всем правилам для неё неподходящее время.",
      },
      {
        id: "noir-station-noise-spontaneous-escape",
        purpose: "spontaneous-escape",
        text: "Дорисуй у выхода на платформу небольшую вещь для спонтанной прогулки, ради которой ты охотно вышел бы из вокзала, пока есть время.",
      },
    ],
    chance: [
      {
        id: "noir-station-chance-gravity-free",
        purpose: "gravity-free",
        text: "Дорисуй над полом зала ожидания парящую вещь, которую тебе тяжело носить в дороге. Нарисуй её небольшой: здесь её вес больше не мешает.",
      },
      {
        id: "noir-station-chance-pocket-size",
        purpose: "pocket-size",
        text: "Дорисуй у окна вокзала огромную в обычной жизни вещь, уменьшенную до размера ладони. Выбери то, что тебе было бы интересно подолгу разглядывать в ожидании.",
      },
      {
        id: "noir-station-chance-edible-material",
        purpose: "edible-material",
        text: "Дорисуй у стены вокзала небольшой дорожный предмет, сделанный из твоей любимой еды. Сам выбери вещь, которую было бы забавно съесть в пути.",
      },
      {
        id: "noir-station-chance-self-replenishing",
        purpose: "self-replenishing",
        text: "Дорисуй у окна зала предмет с расходуемым содержимым, запас которого тебе неудобно пополнять в дороге. Нарисуй растущую из предмета веточку с новыми порциями именно этого содержимого.",
      },
      {
        id: "noir-station-chance-reverse-aging",
        purpose: "reverse-aging",
        text: "Дорисуй у стены зала многоразовый предмет, который тебе жалко изнашивать в поездках. Покажи, как он сбрасывает потёртую оболочку, словно змеиную кожу, а под ней уже видна новая поверхность.",
      },
      {
        id: "noir-station-chance-bottled-weather",
        purpose: "bottled-weather",
        text: "Дорисуй у окна вокзала прозрачный сосуд с погодой, которую тебе хотелось бы привезти в место назначения. Сам выбери эту погоду.",
      },
      {
        id: "noir-station-chance-animal-voice",
        purpose: "animal-voice",
        text: "Дорисуй у выхода на платформу небольшой дорожный предмет с торчащей из него живой мордочкой животного. Сам выбери вещь и животное, чьим голосом она развеселила бы тебя при касании.",
      },
      {
        id: "noir-station-chance-mood-color",
        purpose: "mood-color",
        text: "Дорисуй у стены вокзала вещь, перекрашивающую себя под твоё настроение перед поездкой. Выбери предмет и цвет; покажи растущее прямо из вещи маленькое облачко, которое поливает её краской этого цвета.",
      },
    ],
  },
};
