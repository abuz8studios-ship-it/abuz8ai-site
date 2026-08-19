/* ABUZ8 — shared site i18n engine (single source of truth).
   Include on any page: <script src="/assets/js/site-i18n.js" defer></script>
   Tag translatable elements with data-i18n="key". The script auto-injects a
   language <select> into the page's nav (reuses #langSelect if it already exists),
   translates tagged elements, sets <html lang/dir> (rtl for ar/he), persists the
   choice, and auto-detects the visitor's browser language on first visit.
   Translations are AI drafts — native review welcome. */
(function () {
  var SUPPORTED = ["en", "ar", "bs", "es", "la", "fr", "de", "he", "zh", "ja", "hi", "ur"];
  var LABELS = { en: "English", ar: "العربية", bs: "Bosanski", es: "Español", la: "Latina", fr: "Français", de: "Deutsch", he: "עברית", zh: "中文", ja: "日本語", hi: "हिन्दी", ur: "اردو" };

  var I18N = {
    ur: { "nav.home":"ہوم","nav.trending":"ٹرینڈنگ","nav.tools":"ٹولز","nav.blog":"بلاگ",
      "hero.eyebrow":"<span class='dot'></span> AI خبریں · ٹرینڈنگ کوڈ · مفت ٹولز",
      "hero.h1":"جانیں AI کی دنیا میں کیا ہو رہا ہے۔<br>سب سے <span class='highlight'>پہلے</span>۔",
      "hero.sub":"ہم پوری AI دنیا پر نظر رکھتے ہیں تاکہ آپ کو نہ رکھنی پڑے — تازہ ترین خبریں، تیزی سے بڑھتے اوپن سورس پروجیکٹس، اور آپ کے وقت کے لائق مفت ٹولز۔ نہ کوئی فیس، نہ کوئی اشتہار۔ صرف کام کی بات۔",
      "hero.cta1":"ابھی کیا ٹرینڈ میں ہے","hero.cta2":"AI Daily پڑھیں",
      "trend.tag":"GitHub سے براہِ راست","trend.h2":"وہ کوڈ جسے دنیا ستارے دے رہی ہے<br>اسی وقت","trend.seeall":"تمام 20 دیکھیں ←",
      "free.tag":"سب مفت","free.h2":"ہم سب کچھ بانٹتے ہیں۔<br>کوئی شرط نہیں۔",
      "f1.h3":"AI Daily — پورا میدان، ایک فیڈ میں","f2.h3":"ایجنٹ بورڈ","f3.h3":"مفت ٹولز جو بس کام کرتے ہیں",
      "quote.text":"سب سے پہلے جانیں۔ آزادی سے بانٹیں۔","nl.h2":"AI سگنل اپنے ان باکس میں پائیں۔","nl.btn":"مجھے باخبر رکھیں",
      "foot.tagline":"مفت AI خبریں، ٹرینڈنگ اوپن سورس، اور ٹولز — تاکہ آپ ہمیشہ سب سے پہلے جانیں۔","foot.free":"مفت","foot.read":"پڑھیں","foot.legal":"قانونی" },
    en: { "nav.home":"Home","nav.trending":"Trending","nav.tools":"Tools","nav.blog":"Blog",
      "hero.eyebrow":"<span class='dot'></span> AI news · trending code · free tools",
      "hero.h1":"Know what's happening in AI.<br>Before <span class='highlight'>everyone</span> else.",
      "hero.sub":"We track the whole AI world so you don't have to — the news as it breaks, the fastest-growing open-source projects, and free tools worth your time. No paywall. No pitch. Just the signal.",
      "hero.cta1":"What's trending now","hero.cta2":"Read AI Daily",
      "trend.tag":"Live from GitHub","trend.h2":"The code the world is starring<br>right now","trend.seeall":"See all 20 →",
      "free.tag":"All Free","free.h2":"We share everything.<br>No catch.",
      "f1.h3":"AI Daily — the whole field, one feed","f2.h3":"The Agent Board","f3.h3":"Free tools that just work",
      "quote.text":"Be first to know. Free to share.","nl.h2":"Get the AI signal in your inbox.","nl.btn":"Keep me posted",
      "foot.tagline":"Free AI news, trending open-source, and tools — so you're always first to know.","foot.free":"Free","foot.read":"Read","foot.legal":"Legal" },
    ar: { "nav.home":"الرئيسية","nav.trending":"الأكثر رواجًا","nav.tools":"أدوات","nav.blog":"المدونة",
      "hero.eyebrow":"<span class='dot'></span> أخبار الذكاء الاصطناعي · أكواد رائجة · أدوات مجانية",
      "hero.h1":"اعرف ما يحدث في عالم الذكاء الاصطناعي.<br>قبل <span class='highlight'>الجميع</span>.",
      "hero.sub":"نتابع عالم الذكاء الاصطناعي بأكمله نيابةً عنك — الأخبار فور وقوعها، وأسرع المشاريع مفتوحة المصدر نموًا، وأدوات مجانية تستحق وقتك. بلا اشتراك. بلا تسويق. فقط ما يهم.",
      "hero.cta1":"الأكثر رواجًا الآن","hero.cta2":"اقرأ AI Daily",
      "trend.tag":"مباشر من GitHub","trend.h2":"الأكواد التي يتابعها العالم<br>الآن","trend.seeall":"شاهد الـ20 جميعها ←",
      "free.tag":"كل شيء مجاني","free.h2":"نشارك كل شيء.<br>دون مقابل.",
      "f1.h3":"AI Daily — المجال كله في موجز واحد","f2.h3":"لوحة الوكلاء","f3.h3":"أدوات مجانية تعمل ببساطة",
      "quote.text":"كن أول من يعرف. وشارك بحرية.","nl.h2":"احصل على إشارة الذكاء الاصطناعي في بريدك.","nl.btn":"أبقني على اطلاع",
      "foot.tagline":"أخبار ذكاء اصطناعي مجانية، ومشاريع مفتوحة المصدر رائجة، وأدوات — لتكون دائمًا أول من يعرف.","foot.free":"مجاني","foot.read":"اقرأ","foot.legal":"قانوني" },
    bs: { "nav.home":"Početna","nav.trending":"U trendu","nav.tools":"Alati","nav.blog":"Blog",
      "hero.eyebrow":"<span class='dot'></span> AI vijesti · kod u trendu · besplatni alati",
      "hero.h1":"Saznaj šta se dešava u AI svijetu.<br>Prije <span class='highlight'>svih</span> ostalih.",
      "hero.sub":"Pratimo cijeli svijet vještačke inteligencije umjesto tebe — vijesti čim se dogode, najbrže rastuće open-source projekte i besplatne alate vrijedne tvog vremena. Bez plaćanja. Bez reklama. Samo ono bitno.",
      "hero.cta1":"Šta je u trendu sada","hero.cta2":"Čitaj AI Daily",
      "trend.tag":"Uživo sa GitHub-a","trend.h2":"Kod koji svijet zvjezdicama prati<br>upravo sada","trend.seeall":"Pogledaj svih 20 →",
      "free.tag":"Sve besplatno","free.h2":"Dijelimo sve.<br>Bez kvake.",
      "f1.h3":"AI Daily — cijelo polje u jednom feedu","f2.h3":"Tabla agenata","f3.h3":"Besplatni alati koji jednostavno rade",
      "quote.text":"Budi prvi koji zna. Slobodan da dijeliš.","nl.h2":"Primaj AI signal u svoj inbox.","nl.btn":"Obavijesti me",
      "foot.tagline":"Besplatne AI vijesti, open-source u trendu i alati — da uvijek prvi znaš.","foot.free":"Besplatno","foot.read":"Čitaj","foot.legal":"Pravno" },
    es: { "nav.home":"Inicio","nav.trending":"Tendencias","nav.tools":"Herramientas","nav.blog":"Blog",
      "hero.eyebrow":"<span class='dot'></span> Noticias de IA · código en tendencia · herramientas gratis",
      "hero.h1":"Entérate de lo que pasa en la IA.<br>Antes que <span class='highlight'>todos</span> los demás.",
      "hero.sub":"Seguimos todo el mundo de la IA por ti — las noticias al instante, los proyectos open-source que más crecen y herramientas gratuitas que valen tu tiempo. Sin muros de pago. Sin promesas. Solo la señal.",
      "hero.cta1":"Qué es tendencia ahora","hero.cta2":"Leer AI Daily",
      "trend.tag":"En vivo desde GitHub","trend.h2":"El código al que el mundo da estrellas<br>ahora mismo","trend.seeall":"Ver los 20 →",
      "free.tag":"Todo gratis","free.h2":"Lo compartimos todo.<br>Sin trampa.",
      "f1.h3":"AI Daily — todo el campo en un solo feed","f2.h3":"El Tablero de Agentes","f3.h3":"Herramientas gratis que simplemente funcionan",
      "quote.text":"Sé el primero en saber. Libre para compartir.","nl.h2":"Recibe la señal de la IA en tu correo.","nl.btn":"Mantenme al día",
      "foot.tagline":"Noticias de IA gratis, open-source en tendencia y herramientas — para que siempre seas el primero en saber.","foot.free":"Gratis","foot.read":"Leer","foot.legal":"Legal" },
    la: { "nav.home":"Domus","nav.trending":"Crescentia","nav.tools":"Instrumenta","nav.blog":"Diarium",
      "hero.eyebrow":"<span class='dot'></span> Nuntii AI · codex crescens · instrumenta gratuita",
      "hero.h1":"Scito quid in arte intellegentiae fiat.<br>Ante <span class='highlight'>omnes</span> ceteros.",
      "hero.sub":"Totum mundum intellegentiae artificialis pro te observamus — nuntios dum accidunt, incepta fontis aperti celerrime crescentia, et instrumenta gratuita tempore tuo digna. Sine pretio. Sine venditione. Tantum signum.",
      "hero.cta1":"Quid nunc crescit","hero.cta2":"Lege AI Daily",
      "trend.tag":"Vivo ex GitHub","trend.h2":"Codex quem mundus stellis notat<br>nunc","trend.seeall":"Vide omnes XX →",
      "free.tag":"Omnia Gratuita","free.h2":"Omnia communicamus.<br>Sine dolo.",
      "f1.h3":"AI Daily — totus campus, unus fons","f2.h3":"Tabula Agentium","f3.h3":"Instrumenta gratuita quae simpliciter operantur",
      "quote.text":"Primus scito. Liber ad communicandum.","nl.h2":"Accipe signum AI in cistam tuam.","nl.btn":"Certiorem me fac",
      "foot.tagline":"Nuntii AI gratuiti, fons apertus crescens, et instrumenta — ut semper primus scias.","foot.free":"Gratuitum","foot.read":"Lege","foot.legal":"Legitima" },
    fr: { "nav.home":"Accueil","nav.trending":"Tendances","nav.tools":"Outils","nav.blog":"Blog",
      "hero.eyebrow":"<span class='dot'></span> Actus IA · code en tendance · outils gratuits",
      "hero.h1":"Sachez ce qui se passe dans l'IA.<br>Avant <span class='highlight'>tout le monde</span>.",
      "hero.sub":"Nous suivons tout l'univers de l'IA pour vous — l'actualité en temps réel, les projets open-source qui montent le plus vite, et des outils gratuits qui valent votre temps. Sans péage. Sans baratin. Juste le signal.",
      "hero.cta1":"Les tendances du moment","hero.cta2":"Lire AI Daily",
      "trend.tag":"En direct de GitHub","trend.h2":"Le code que le monde étoile<br>en ce moment","trend.seeall":"Voir les 20 →",
      "free.tag":"Tout gratuit","free.h2":"On partage tout.<br>Sans piège.",
      "f1.h3":"AI Daily — tout le domaine, un seul fil","f2.h3":"Le Tableau des Agents","f3.h3":"Des outils gratuits qui marchent, tout simplement",
      "quote.text":"Soyez le premier informé. Libre de partager.","nl.h2":"Recevez le signal IA dans votre boîte mail.","nl.btn":"Tenez-moi au courant",
      "foot.tagline":"Actus IA gratuites, open-source en tendance et outils — pour toujours être le premier informé.","foot.free":"Gratuit","foot.read":"Lire","foot.legal":"Mentions légales" },
    de: { "nav.home":"Startseite","nav.trending":"Im Trend","nav.tools":"Tools","nav.blog":"Blog",
      "hero.eyebrow":"<span class='dot'></span> KI-News · angesagter Code · kostenlose Tools",
      "hero.h1":"Wisse, was in der KI passiert.<br>Vor <span class='highlight'>allen</span> anderen.",
      "hero.sub":"Wir behalten die ganze KI-Welt für dich im Blick — Neuigkeiten in dem Moment, in dem sie passieren, die am schnellsten wachsenden Open-Source-Projekte und kostenlose Tools, die deine Zeit wert sind. Keine Paywall. Kein Verkaufsgerede. Nur das Signal.",
      "hero.cta1":"Was gerade im Trend liegt","hero.cta2":"AI Daily lesen",
      "trend.tag":"Live von GitHub","trend.h2":"Der Code, dem die Welt Sterne gibt<br>genau jetzt","trend.seeall":"Alle 20 ansehen →",
      "free.tag":"Alles kostenlos","free.h2":"Wir teilen alles.<br>Ohne Haken.",
      "f1.h3":"AI Daily — das ganze Feld, ein Feed","f2.h3":"Das Agenten-Board","f3.h3":"Kostenlose Tools, die einfach funktionieren",
      "quote.text":"Sei der Erste, der es weiß. Frei zu teilen.","nl.h2":"Hol dir das KI-Signal in dein Postfach.","nl.btn":"Halt mich auf dem Laufenden",
      "foot.tagline":"Kostenlose KI-News, angesagtes Open Source und Tools — damit du immer als Erster Bescheid weißt.","foot.free":"Kostenlos","foot.read":"Lesen","foot.legal":"Rechtliches" },
    he: { "nav.home":"בית","nav.trending":"במגמת עלייה","nav.tools":"כלים","nav.blog":"בלוג",
      "hero.eyebrow":"<span class='dot'></span> חדשות AI · קוד חם · כלים חינמיים",
      "hero.h1":"דעו מה קורה בעולם ה-AI.<br>לפני <span class='highlight'>כולם</span>.",
      "hero.sub":"אנחנו עוקבים אחרי כל עולם ה-AI במקומכם — החדשות ברגע שהן קורות, פרויקטי הקוד הפתוח הצומחים הכי מהר, וכלים חינמיים ששווים את זמנכם. בלי תשלום. בלי מכירה. רק האות החשוב.",
      "hero.cta1":"מה חם עכשיו","hero.cta2":"קראו את AI Daily",
      "trend.tag":"בשידור חי מ-GitHub","trend.h2":"הקוד שהעולם מסמן בכוכב<br>ממש עכשיו","trend.seeall":"ראו את כל ה-20 ←",
      "free.tag":"הכול חינם","free.h2":"אנחנו חולקים הכול.<br>בלי קאץ'.",
      "f1.h3":"AI Daily — כל התחום, פיד אחד","f2.h3":"לוח הסוכנים","f3.h3":"כלים חינמיים שפשוט עובדים",
      "quote.text":"היו הראשונים לדעת. חופשיים לשתף.","nl.h2":"קבלו את אות ה-AI לתיבת הדואר שלכם.","nl.btn":"עדכנו אותי",
      "foot.tagline":"חדשות AI חינמיות, קוד פתוח חם וכלים — כדי שתמיד תהיו הראשונים לדעת.","foot.free":"חינם","foot.read":"קריאה","foot.legal":"משפטי" },
    zh: { "nav.home":"首页","nav.trending":"热门趋势","nav.tools":"工具","nav.blog":"博客",
      "hero.eyebrow":"<span class='dot'></span> AI 新闻 · 热门代码 · 免费工具",
      "hero.h1":"抢先了解 AI 的最新动态。<br><span class='highlight'>先人一步</span>。",
      "hero.sub":"我们替你追踪整个 AI 世界——突发新闻、增长最快的开源项目，以及值得你花时间的免费工具。没有付费墙，没有推销，只有真正重要的信息。",
      "hero.cta1":"查看当前热门","hero.cta2":"阅读 AI Daily",
      "trend.tag":"来自 GitHub 的实时数据","trend.h2":"全世界正在加星的代码<br>此刻","trend.seeall":"查看全部 20 个 →",
      "free.tag":"全部免费","free.h2":"我们分享一切。<br>毫无套路。",
      "f1.h3":"AI Daily —— 整个领域，一个信息流","f2.h3":"智能体榜单","f3.h3":"真正好用的免费工具",
      "quote.text":"抢先知道，自由分享。","nl.h2":"把 AI 信号送到你的邮箱。","nl.btn":"通知我",
      "foot.tagline":"免费的 AI 新闻、热门开源项目和工具——让你永远先人一步。","foot.free":"免费","foot.read":"阅读","foot.legal":"法律" },
    ja: { "nav.home":"ホーム","nav.trending":"トレンド","nav.tools":"ツール","nav.blog":"ブログ",
      "hero.eyebrow":"<span class='dot'></span> AIニュース · 話題のコード · 無料ツール",
      "hero.h1":"AIの「今」を知ろう。<br><span class='highlight'>誰よりも</span>早く。",
      "hero.sub":"AIの世界すべてを私たちが追いかけます——速報ニュース、急成長中のオープンソースプロジェクト、そして時間をかける価値のある無料ツール。課金なし、売り込みなし。届けるのはシグナルだけ。",
      "hero.cta1":"今のトレンドを見る","hero.cta2":"AI Daily を読む",
      "trend.tag":"GitHub からのライブ","trend.h2":"世界が今スターを付けている<br>コード","trend.seeall":"20件すべて見る →",
      "free.tag":"すべて無料","free.h2":"すべて共有します。<br>裏はありません。",
      "f1.h3":"AI Daily —— 分野まるごと、ひとつのフィードに","f2.h3":"エージェント・ボード","f3.h3":"ちゃんと使える無料ツール",
      "quote.text":"誰よりも早く知る。自由に共有する。","nl.h2":"AIのシグナルをあなたの受信箱へ。","nl.btn":"知らせを受け取る",
      "foot.tagline":"無料のAIニュース、話題のオープンソース、そしてツール——いつでも誰よりも早く。","foot.free":"無料","foot.read":"読む","foot.legal":"法的事項" },
    hi: { "nav.home":"होम","nav.trending":"ट्रेंडिंग","nav.tools":"टूल्स","nav.blog":"ब्लॉग",
      "hero.eyebrow":"<span class='dot'></span> AI समाचार · ट्रेंडिंग कोड · मुफ़्त टूल्स",
      "hero.h1":"जानिए AI में क्या हो रहा है।<br><span class='highlight'>सबसे</span> पहले।",
      "hero.sub":"हम पूरी AI दुनिया पर आपके लिए नज़र रखते हैं — ताज़ा खबरें जैसे ही होती हैं, सबसे तेज़ी से बढ़ते ओपन-सोर्स प्रोजेक्ट, और आपके समय के लायक मुफ़्त टूल्स। कोई पेवॉल नहीं। कोई बिक्री नहीं। सिर्फ़ काम की बात।",
      "hero.cta1":"अभी क्या ट्रेंडिंग है","hero.cta2":"AI Daily पढ़ें",
      "trend.tag":"GitHub से लाइव","trend.h2":"जिस कोड को दुनिया स्टार दे रही है<br>अभी","trend.seeall":"सभी 20 देखें →",
      "free.tag":"सब कुछ मुफ़्त","free.h2":"हम सब कुछ साझा करते हैं।<br>कोई शर्त नहीं।",
      "f1.h3":"AI Daily — पूरा क्षेत्र, एक ही फ़ीड","f2.h3":"एजेंट बोर्ड","f3.h3":"मुफ़्त टूल्स जो वाकई काम करते हैं",
      "quote.text":"सबसे पहले जानें। खुलकर साझा करें।","nl.h2":"AI सिग्नल अपने इनबॉक्स में पाएं।","nl.btn":"मुझे सूचित रखें",
      "foot.tagline":"मुफ़्त AI समाचार, ट्रेंडिंग ओपन-सोर्स और टूल्स — ताकि आप हमेशा सबसे पहले जानें।","foot.free":"मुफ़्त","foot.read":"पढ़ें","foot.legal":"कानूनी" }
  };

  // Page-specific strings (Trending page), merged into the main dictionary.
  var PAGES = {
    en: { "t.eyebrow":"Trending This Week · Live from GitHub","t.h1":"The 20 repos <span class='g'>exploding</span> on GitHub<br>this week — and <span class='g'>why</span>.","t.sub":"Ranked by GitHub's own trending signal — star velocity, not raw totals. Each card tells you, in plain words, why it's blowing up: a brand-new breakout, a fast riser, or a heavyweight surging. See what's catching fire before everyone else.","t.tabWeek":"This Week","t.tabMonth":"This Month","t.shareList":"Share the list","t.capH3":"Never miss a breakout","t.capSub":"Join the list for the weekly trending drop — the 20 fastest-growing repos and the “why” behind each, in your inbox. We’ll email you when it launches.","t.capBtn":"Join the list" },
    ar: { "t.eyebrow":"الأكثر رواجًا هذا الأسبوع · مباشر من GitHub","t.h1":"الـ20 مشروعًا <span class='g'>المنفجرة</span> على GitHub<br>هذا الأسبوع — و<span class='g'>لماذا</span>.","t.sub":"مرتّبة وفق إشارة GitHub نفسها — سرعة نمو النجوم، لا الأعداد الإجمالية. كل بطاقة تخبرك بكلمات بسيطة لماذا ينفجر هذا المشروع: انطلاقة جديدة، أو صاعد سريع، أو عملاق يتصاعد. شاهد ما يشتعل قبل الجميع.","t.tabWeek":"هذا الأسبوع","t.tabMonth":"هذا الشهر","t.shareList":"شارك القائمة","t.capH3":"لا تفوّت أي انطلاقة","t.capSub":"انضم إلى القائمة لتصلك نشرة الرواج الأسبوعية — أسرع 20 مشروعًا نموًا وسبب رواج كلٍّ منها، في بريدك. سنراسلك عند الإطلاق.","t.capBtn":"انضم إلى القائمة" },
    bs: { "t.eyebrow":"U trendu ove sedmice · Uživo sa GitHub-a","t.h1":"20 repozitorija koji <span class='g'>eksplodiraju</span> na GitHub-u<br>ove sedmice — i <span class='g'>zašto</span>.","t.sub":"Rangirano po GitHub-ovom vlastitom signalu — brzini rasta zvjezdica, ne ukupnom broju. Svaka kartica ti jednostavno kaže zašto raste: potpuno novi proboj, brzi uspon ili težak igrač u naletu. Vidi šta gori prije svih.","t.tabWeek":"Ova sedmica","t.tabMonth":"Ovaj mjesec","t.shareList":"Podijeli listu","t.capH3":"Ne propusti nijedan proboj","t.capSub":"Pridruži se listi za sedmični trending pregled — 20 najbrže rastućih repozitorija i razlog iza svakog, u tvom inboxu. Javit ćemo ti kad krene.","t.capBtn":"Pridruži se" },
    es: { "t.eyebrow":"Tendencias de esta semana · En vivo desde GitHub","t.h1":"Los 20 repos que <span class='g'>explotan</span> en GitHub<br>esta semana — y <span class='g'>por qué</span>.","t.sub":"Clasificados por la propia señal de GitHub — velocidad de estrellas, no totales. Cada tarjeta te dice, en palabras simples, por qué está despegando: un debut explosivo, un ascenso rápido o un peso pesado en alza. Mira qué arde antes que nadie.","t.tabWeek":"Esta semana","t.tabMonth":"Este mes","t.shareList":"Compartir la lista","t.capH3":"No te pierdas ningún despegue","t.capSub":"Únete a la lista del resumen semanal de tendencias — los 20 repos que más crecen y el porqué de cada uno, en tu correo. Te avisaremos cuando se lance.","t.capBtn":"Unirme a la lista" },
    la: { "t.eyebrow":"Crescentia hac hebdomade · Vivo ex GitHub","t.h1":"XX incepta quae in GitHub <span class='g'>erumpunt</span><br>hac hebdomade — et <span class='g'>cur</span>.","t.sub":"Ordinata signo ipsius GitHub — celeritate stellarum, non summa. Quaeque charta tibi simplicibus verbis dicit cur crescat: eruptio nova, ascensus celer, aut magnum inceptum surgens. Vide quid ardeat ante omnes.","t.tabWeek":"Haec hebdomas","t.tabMonth":"Hic mensis","t.shareList":"Communica indicem","t.capH3":"Ne ullam eruptionem omittas","t.capSub":"Adde te indici nuntii hebdomadalis — XX incepta celerrime crescentia et cur quodque, in cista tua. Te certiorem faciemus cum incipiet.","t.capBtn":"Adde te indici" },
    fr: { "t.eyebrow":"Tendances de la semaine · En direct de GitHub","t.h1":"Les 20 repos qui <span class='g'>explosent</span> sur GitHub<br>cette semaine — et <span class='g'>pourquoi</span>.","t.sub":"Classés par le signal de tendance de GitHub — la vitesse des étoiles, pas les totaux. Chaque carte vous dit, en mots simples, pourquoi il décolle : une percée toute neuve, une montée rapide ou un poids lourd en plein essor. Voyez ce qui s'enflamme avant tout le monde.","t.tabWeek":"Cette semaine","t.tabMonth":"Ce mois-ci","t.shareList":"Partager la liste","t.capH3":"Ne ratez aucune percée","t.capSub":"Rejoignez la liste du récap hebdo des tendances — les 20 repos qui montent le plus vite et le pourquoi de chacun, dans votre boîte mail. On vous prévient au lancement.","t.capBtn":"Rejoindre la liste" },
    de: { "t.eyebrow":"Diese Woche im Trend · Live von GitHub","t.h1":"Die 20 Repos, die auf GitHub <span class='g'>explodieren</span><br>diese Woche — und <span class='g'>warum</span>.","t.sub":"Sortiert nach GitHubs eigenem Trend-Signal — Stern-Geschwindigkeit, nicht Gesamtzahl. Jede Karte sagt dir in einfachen Worten, warum es durchstartet: ein brandneuer Durchbruch, ein schneller Aufsteiger oder ein Schwergewicht im Höhenflug. Sieh, was brennt, vor allen anderen.","t.tabWeek":"Diese Woche","t.tabMonth":"Dieser Monat","t.shareList":"Liste teilen","t.capH3":"Verpasse keinen Durchbruch","t.capSub":"Trag dich für den wöchentlichen Trend-Drop ein — die 20 am schnellsten wachsenden Repos und das Warum dahinter, in deinem Postfach. Wir melden uns zum Start.","t.capBtn":"Eintragen" },
    he: { "t.eyebrow":"במגמת עלייה השבוע · בשידור חי מ-GitHub","t.h1":"20 המאגרים <span class='g'>שמתפוצצים</span> ב-GitHub<br>השבוע — ו<span class='g'>למה</span>.","t.sub":"מדורגים לפי אות המגמה של GitHub עצמו — מהירות הכוכבים, לא הסך הכולל. כל כרטיס אומר לכם, במילים פשוטות, למה הוא ממריא: פריצה חדשה לגמרי, עלייה מהירה, או ענק שמזנק. ראו מה בוער לפני כולם.","t.tabWeek":"השבוע","t.tabMonth":"החודש","t.shareList":"שתפו את הרשימה","t.capH3":"אל תפספסו אף פריצה","t.capSub":"הצטרפו לרשימה לעדכון המגמות השבועי — 20 המאגרים הצומחים הכי מהר והסיבה לכל אחד, לתיבת הדואר שלכם. נעדכן אתכם בהשקה.","t.capBtn":"הצטרפו לרשימה" },
    zh: { "t.eyebrow":"本周热门 · 来自 GitHub 的实时数据","t.h1":"本周在 GitHub 上<span class='g'>爆火</span>的 20 个仓库<br>——以及<span class='g'>原因</span>。","t.sub":"依据 GitHub 自身的热门信号排名——看的是加星速度，而非总量。每张卡片用简单的话告诉你它为何爆发：全新黑马、快速攀升，还是重量级项目强势上扬。抢在所有人之前看清什么正在燃烧。","t.tabWeek":"本周","t.tabMonth":"本月","t.shareList":"分享榜单","t.capH3":"不错过任何一次爆发","t.capSub":"订阅每周热门速递——增长最快的 20 个仓库及其爆发原因，直达你的邮箱。上线时我们会通知你。","t.capBtn":"加入名单" },
    ja: { "t.eyebrow":"今週のトレンド · GitHub からのライブ","t.h1":"今週 GitHub で<span class='g'>急騰</span>している 20 のリポジトリ<br>——その<span class='g'>理由</span>も。","t.sub":"GitHub 自身のトレンド信号でランキング——総数ではなく、スターの伸び速度で。各カードが、なぜ急上昇しているのかを平易な言葉で教えます：まったく新しいブレイク、急上昇株、あるいは大物の急騰。何が燃えているか、誰よりも早く。","t.tabWeek":"今週","t.tabMonth":"今月","t.shareList":"リストを共有","t.capH3":"ブレイクを見逃さない","t.capSub":"毎週のトレンド配信に登録——急成長中の 20 リポジトリとその理由を、あなたの受信箱へ。開始したらお知らせします。","t.capBtn":"リストに登録" },
    hi: { "t.eyebrow":"इस हफ़्ते ट्रेंडिंग · GitHub से लाइव","t.h1":"इस हफ़्ते GitHub पर <span class='g'>धमाका</span> करने वाले 20 रिपो<br>— और <span class='g'>क्यों</span>।","t.sub":"GitHub के अपने ट्रेंडिंग सिग्नल से रैंक — कुल संख्या नहीं, स्टार बढ़ने की रफ़्तार। हर कार्ड आसान शब्दों में बताता है कि यह क्यों छा रहा है: बिल्कुल नया ब्रेकआउट, तेज़ी से उठता प्रोजेक्ट, या ज़ोर पकड़ता दिग्गज। सबसे पहले देखें कि क्या आग पकड़ रहा है।","t.tabWeek":"इस हफ़्ते","t.tabMonth":"इस महीने","t.shareList":"सूची साझा करें","t.capH3":"कोई ब्रेकआउट न चूकें","t.capSub":"साप्ताहिक ट्रेंडिंग ड्रॉप के लिए सूची में जुड़ें — सबसे तेज़ बढ़ते 20 रिपो और हर एक की वजह, आपके इनबॉक्स में। लॉन्च होने पर हम आपको बताएंगे।","t.capBtn":"सूची में जुड़ें" }
  };
  for (var L in PAGES) { if (I18N[L]) { for (var K in PAGES[L]) I18N[L][K] = PAGES[L][K]; } }

  // Page-specific strings (Agent Board + Tools), merged into the main dictionary.
  var PAGES2 = {
    en: { "ab.eyebrow":"The Agent Board · Live from GitHub","ab.h1":"The systems making people money.<br><span class='g'>Honestly aggregated.</span>","ab.sub":"The top open-source agentic AI projects on GitHub — ranked by live star count. For each one: what it actually does, how people are making money with it, and the cheapest realistic way to replicate the idea and launch in 72 hours.","tl.eyebrow":"The Toolbox","tl.h1":"Real tools.<br><span class='g'>Honest value.</span> No gate.","tl.sub":"Every tool here is something we actually built and use. The image and video studio runs on our own local GPUs. The utilities run right in your browser. Pick one and go.","tl.count":"87 free tools · no signup" },
    ar: { "ab.eyebrow":"لوحة الوكلاء · مباشر من GitHub","ab.h1":"الأنظمة التي تُكسِب الناس المال.<br><span class='g'>مُجمَّعة بأمانة.</span>","ab.sub":"أبرز مشاريع الذكاء الاصطناعي الوكيلة مفتوحة المصدر على GitHub — مرتّبة وفق عدد النجوم المباشر. ولكلٍّ منها: ما الذي يفعله فعلًا، وكيف يجني الناس المال منه، وأرخص طريقة واقعية لاستنساخ الفكرة وإطلاقها خلال 72 ساعة.","tl.eyebrow":"صندوق الأدوات","tl.h1":"أدوات حقيقية.<br><span class='g'>قيمة صادقة.</span> دون قيود.","tl.sub":"كل أداة هنا شيء بنيناه ونستخدمه فعلًا. استوديو الصور والفيديو يعمل على وحدات معالجة الرسوم المحلية لدينا. وأدوات الويب تعمل مباشرة في متصفحك. اختر واحدة وابدأ.","tl.count":"87 أداة مجانية · دون تسجيل" },
    bs: { "ab.eyebrow":"Tabla agenata · Uživo sa GitHub-a","ab.h1":"Sistemi koji ljudima donose novac.<br><span class='g'>Pošteno agregirano.</span>","ab.sub":"Najbolji open-source agentni AI projekti na GitHub-u — rangirani po broju zvjezdica uživo. Za svaki: šta zaista radi, kako ljudi na njemu zarađuju i najjeftiniji realan način da repliciraš ideju i pokreneš je za 72 sata.","tl.eyebrow":"Alatnica","tl.h1":"Pravi alati.<br><span class='g'>Poštena vrijednost.</span> Bez prepreka.","tl.sub":"Svaki alat ovdje je nešto što smo zaista napravili i koristimo. Studio za slike i video radi na našim vlastitim lokalnim GPU-ovima. Pomoćni alati rade direktno u tvom pregledniku. Izaberi jedan i kreni.","tl.count":"87 besplatnih alata · bez registracije" },
    es: { "ab.eyebrow":"El Tablero de Agentes · En vivo desde GitHub","ab.h1":"Los sistemas con los que la gente gana dinero.<br><span class='g'>Agregado con honestidad.</span>","ab.sub":"Los mejores proyectos de IA agéntica open-source en GitHub — clasificados por estrellas en vivo. De cada uno: qué hace realmente, cómo la gente gana dinero con él y la forma realista más barata de replicar la idea y lanzarla en 72 horas.","tl.eyebrow":"La caja de herramientas","tl.h1":"Herramientas de verdad.<br><span class='g'>Valor honesto.</span> Sin barreras.","tl.sub":"Cada herramienta aquí es algo que realmente construimos y usamos. El estudio de imagen y video corre en nuestras propias GPU locales. Las utilidades funcionan directamente en tu navegador. Elige una y empieza.","tl.count":"87 herramientas gratis · sin registro" },
    la: { "ab.eyebrow":"Tabula Agentium · Vivo ex GitHub","ab.h1":"Systemata quae hominibus pecuniam pariunt.<br><span class='g'>Honeste collecta.</span>","ab.sub":"Optima incepta AI agentica fontis aperti in GitHub — ordinata numero stellarum vivo. Pro quoque: quid revera faciat, quomodo homines ex eo lucrentur, et via realis vilissima ad ideam imitandam et intra 72 horas emittendam.","tl.eyebrow":"Arca Instrumentorum","tl.h1":"Vera instrumenta.<br><span class='g'>Honestum pretium.</span> Sine portis.","tl.sub":"Omne instrumentum hic est aliquid quod revera fecimus et adhibemus. Studium imaginum et pellicularum in nostris GPU localibus currit. Instrumenta minora directe in navigatro tuo operantur. Elige unum et incipe.","tl.count":"87 instrumenta gratuita · sine inscriptione" },
    fr: { "ab.eyebrow":"Le Tableau des Agents · En direct de GitHub","ab.h1":"Les systèmes qui font gagner de l'argent.<br><span class='g'>Agrégés honnêtement.</span>","ab.sub":"Les meilleurs projets d'IA agentique open-source sur GitHub — classés par étoiles en direct. Pour chacun : ce qu'il fait vraiment, comment les gens en tirent de l'argent, et la façon réaliste la moins chère de répliquer l'idée et de lancer en 72 heures.","tl.eyebrow":"La boîte à outils","tl.h1":"De vrais outils.<br><span class='g'>Une valeur honnête.</span> Sans barrière.","tl.sub":"Chaque outil ici est quelque chose que nous avons vraiment construit et que nous utilisons. Le studio image et vidéo tourne sur nos propres GPU locaux. Les utilitaires fonctionnent directement dans votre navigateur. Choisissez-en un et lancez-vous.","tl.count":"87 outils gratuits · sans inscription" },
    de: { "ab.eyebrow":"Das Agenten-Board · Live von GitHub","ab.h1":"Die Systeme, mit denen Menschen Geld verdienen.<br><span class='g'>Ehrlich zusammengestellt.</span>","ab.sub":"Die besten quelloffenen agentischen KI-Projekte auf GitHub — nach Live-Sternen sortiert. Zu jedem: was es wirklich macht, wie Menschen damit Geld verdienen und der günstigste realistische Weg, die Idee nachzubauen und in 72 Stunden zu starten.","tl.eyebrow":"Der Werkzeugkasten","tl.h1":"Echte Tools.<br><span class='g'>Ehrlicher Mehrwert.</span> Ohne Hürde.","tl.sub":"Jedes Tool hier ist etwas, das wir wirklich gebaut haben und nutzen. Das Bild- und Videostudio läuft auf unseren eigenen lokalen GPUs. Die Helfer laufen direkt in deinem Browser. Wähl eins und leg los.","tl.count":"87 kostenlose Tools · ohne Anmeldung" },
    he: { "ab.eyebrow":"לוח הסוכנים · בשידור חי מ-GitHub","ab.h1":"המערכות שמכניסות לאנשים כסף.<br><span class='g'>נאספו ביושר.</span>","ab.sub":"פרויקטי ה-AI הסוכניים מהקוד הפתוח המובילים ב-GitHub — מדורגים לפי כוכבים בשידור חי. לכל אחד: מה הוא באמת עושה, איך אנשים מרוויחים ממנו, והדרך הריאלית הזולה ביותר לשכפל את הרעיון ולהשיק תוך 72 שעות.","tl.eyebrow":"ארגז הכלים","tl.h1":"כלים אמיתיים.<br><span class='g'>ערך כן.</span> בלי מחסום.","tl.sub":"כל כלי כאן הוא משהו שבאמת בנינו ומשתמשים בו. סטודיו התמונות והווידאו רץ על ה-GPU המקומיים שלנו. כלי העזר רצים ישירות בדפדפן שלכם. בחרו אחד וצאו לדרך.","tl.count":"87 כלים חינמיים · בלי הרשמה" },
    zh: { "ab.eyebrow":"智能体榜单 · 来自 GitHub 的实时数据","ab.h1":"让人们赚到钱的系统。<br><span class='g'>诚实汇总。</span>","ab.sub":"GitHub 上最顶尖的开源智能体 AI 项目——按实时星标数排名。每个项目都附上：它到底能做什么、人们如何用它赚钱，以及复刻这个点子、在 72 小时内上线的最低成本可行方案。","tl.eyebrow":"工具箱","tl.h1":"真正的工具。<br><span class='g'>诚实的价值。</span>没有门槛。","tl.sub":"这里的每个工具都是我们亲手打造并在用的。图像与视频工作室运行在我们自己的本地 GPU 上，实用小工具直接在你的浏览器里运行。挑一个，开始吧。","tl.count":"87 个免费工具 · 无需注册" },
    ja: { "ab.eyebrow":"エージェント・ボード · GitHub からのライブ","ab.h1":"人々が稼いでいるシステム。<br><span class='g'>正直に集約。</span>","ab.sub":"GitHub で最も注目されるオープンソースのエージェント型 AI プロジェクト——ライブのスター数でランキング。各プロジェクトについて：実際に何ができるのか、人々はどう収益化しているのか、そしてアイデアを複製して 72 時間でローンチする最も安く現実的な方法。","tl.eyebrow":"ツールボックス","tl.h1":"本物のツール。<br><span class='g'>正直な価値。</span>制限なし。","tl.sub":"ここにあるツールはすべて、私たちが実際に作って使っているものです。画像・動画スタジオは自前のローカル GPU で動き、ユーティリティはブラウザ内で直接動作します。ひとつ選んで始めましょう。","tl.count":"無料ツール 87 個 · 登録不要" },
    hi: { "ab.eyebrow":"एजेंट बोर्ड · GitHub से लाइव","ab.h1":"वे सिस्टम जिनसे लोग पैसे कमा रहे हैं।<br><span class='g'>ईमानदारी से संकलित।</span>","ab.sub":"GitHub पर शीर्ष ओपन-सोर्स एजेंटिक AI प्रोजेक्ट — लाइव स्टार गिनती से रैंक। हर एक के लिए: यह असल में क्या करता है, लोग इससे पैसे कैसे कमा रहे हैं, और इस आइडिया को दोहराकर 72 घंटे में लॉन्च करने का सबसे सस्ता व्यावहारिक तरीका।","tl.eyebrow":"टूलबॉक्स","tl.h1":"असली टूल्स।<br><span class='g'>ईमानदार मूल्य।</span> कोई रोक नहीं।","tl.sub":"यहाँ हर टूल वह है जिसे हमने सच में बनाया और इस्तेमाल किया है। इमेज और वीडियो स्टूडियो हमारे अपने लोकल GPU पर चलता है। यूटिलिटीज़ सीधे आपके ब्राउज़र में चलती हैं। एक चुनें और शुरू करें।","tl.count":"87 मुफ़्त टूल्स · बिना साइन-अप" }
  };
  for (var L3 in PAGES2) { if (I18N[L3]) { for (var K3 in PAGES2[L3]) I18N[L3][K3] = PAGES2[L3][K3]; } }

  // Trending-card chrome (JS-rendered labels). The descriptive "why" sentence stays EN for now.
  var PAGES3 = {
    en: { "m.breakout":"BREAKOUT","m.riser":"FAST RISER","m.surge":"SURGING","m.heavy":"HEAVYWEIGHT","m.trending":"TRENDING","c.why":"Why it's trending","c.starsWeek":"stars this week","c.stars30":"stars · 30-day","c.total":"total","c.forks":"forks","c.view":"↗ View & credit on GitHub","c.share":"Share ↗","c.tagWeek":"this week","c.tag30":"30-day riser" },
    ar: { "m.breakout":"انطلاقة","m.riser":"صاعد سريع","m.surge":"في تصاعد","m.heavy":"وزن ثقيل","m.trending":"رائج","c.why":"لماذا يتصدّر","c.starsWeek":"نجوم هذا الأسبوع","c.stars30":"نجوم · 30 يومًا","c.total":"الإجمالي","c.forks":"تفرّعات","c.view":"↗ اعرض وانسب على GitHub","c.share":"شارك ↗","c.tagWeek":"هذا الأسبوع","c.tag30":"صاعد خلال 30 يومًا" },
    bs: { "m.breakout":"PROBOJ","m.riser":"BRZI USPON","m.surge":"U NALETU","m.heavy":"TEŠKAŠ","m.trending":"U TRENDU","c.why":"Zašto je u trendu","c.starsWeek":"zvjezdica ove sedmice","c.stars30":"zvjezdica · 30 dana","c.total":"ukupno","c.forks":"forkova","c.view":"↗ Pogledaj i odaj na GitHub-u","c.share":"Podijeli ↗","c.tagWeek":"ova sedmica","c.tag30":"30-dnevni uspon" },
    es: { "m.breakout":"DESPEGUE","m.riser":"ASCENSO RÁPIDO","m.surge":"EN ALZA","m.heavy":"PESO PESADO","m.trending":"TENDENCIA","c.why":"Por qué es tendencia","c.starsWeek":"estrellas esta semana","c.stars30":"estrellas · 30 días","c.total":"total","c.forks":"forks","c.view":"↗ Ver y dar crédito en GitHub","c.share":"Compartir ↗","c.tagWeek":"esta semana","c.tag30":"ascenso de 30 días" },
    la: { "m.breakout":"ERUPTIO","m.riser":"ASCENSUS CELER","m.surge":"SURGENS","m.heavy":"GRAVIS","m.trending":"CRESCENS","c.why":"Cur crescit","c.starsWeek":"stellae hac hebdomade","c.stars30":"stellae · 30 dies","c.total":"summa","c.forks":"furcae","c.view":"↗ Vide et lauda in GitHub","c.share":"Communica ↗","c.tagWeek":"haec hebdomas","c.tag30":"ascensus 30 dierum" },
    fr: { "m.breakout":"PERCÉE","m.riser":"MONTÉE RAPIDE","m.surge":"EN PLEIN ESSOR","m.heavy":"POIDS LOURD","m.trending":"TENDANCE","c.why":"Pourquoi c'est tendance","c.starsWeek":"étoiles cette semaine","c.stars30":"étoiles · 30 jours","c.total":"total","c.forks":"forks","c.view":"↗ Voir et créditer sur GitHub","c.share":"Partager ↗","c.tagWeek":"cette semaine","c.tag30":"montée sur 30 jours" },
    de: { "m.breakout":"DURCHBRUCH","m.riser":"SCHNELLER AUFSTEIGER","m.surge":"IM HÖHENFLUG","m.heavy":"SCHWERGEWICHT","m.trending":"IM TREND","c.why":"Warum es im Trend liegt","c.starsWeek":"Sterne diese Woche","c.stars30":"Sterne · 30 Tage","c.total":"gesamt","c.forks":"Forks","c.view":"↗ Auf GitHub ansehen & würdigen","c.share":"Teilen ↗","c.tagWeek":"diese Woche","c.tag30":"30-Tage-Aufsteiger" },
    he: { "m.breakout":"פריצה","m.riser":"עלייה מהירה","m.surge":"בזינוק","m.heavy":"משקל כבד","m.trending":"במגמה","c.why":"למה זה במגמת עלייה","c.starsWeek":"כוכבים השבוע","c.stars30":"כוכבים · 30 יום","c.total":"סך הכול","c.forks":"פיצולים","c.view":"↗ צפו וקרדטו ב-GitHub","c.share":"שתפו ↗","c.tagWeek":"השבוע","c.tag30":"עולה ב-30 יום" },
    zh: { "m.breakout":"爆发","m.riser":"快速攀升","m.surge":"强势上扬","m.heavy":"重量级","m.trending":"热门","c.why":"为何上榜","c.starsWeek":"本周星标","c.stars30":"星标 · 30天","c.total":"总计","c.forks":"复刻","c.view":"↗ 在 GitHub 查看并致谢","c.share":"分享 ↗","c.tagWeek":"本周","c.tag30":"30天上升" },
    ja: { "m.breakout":"ブレイク","m.riser":"急上昇","m.surge":"急騰","m.heavy":"大物","m.trending":"トレンド","c.why":"なぜ伸びている","c.starsWeek":"今週のスター","c.stars30":"スター · 30日","c.total":"合計","c.forks":"フォーク","c.view":"↗ GitHub で見る・クレジット","c.share":"共有 ↗","c.tagWeek":"今週","c.tag30":"30日の急上昇" },
    hi: { "m.breakout":"ब्रेकआउट","m.riser":"तेज़ उछाल","m.surge":"ज़ोर पकड़ता","m.heavy":"दिग्गज","m.trending":"ट्रेंडिंग","c.why":"यह क्यों ट्रेंडिंग है","c.starsWeek":"इस हफ़्ते स्टार","c.stars30":"स्टार · 30-दिन","c.total":"कुल","c.forks":"फोर्क","c.view":"↗ GitHub पर देखें और श्रेय दें","c.share":"साझा करें ↗","c.tagWeek":"इस हफ़्ते","c.tag30":"30-दिन का उभार" }
  };
  for (var L4 in PAGES3) { if (I18N[L4]) { for (var K4 in PAGES3[L4]) I18N[L4][K4] = PAGES3[L4][K4]; } }

  function injectCss() {
    if (document.getElementById("abuz8-i18n-css")) return;
    var css = ".lang-select{background:rgba(10,22,40,.65);color:#f5f0e8;border:1px solid rgba(201,168,76,.28);border-radius:8px;font-family:inherit;font-size:12px;padding:6px 8px;cursor:pointer;margin-left:14px;vertical-align:middle;}.lang-select:focus{outline:none;border-color:#c9a84c;}.lang-select option{background:#0d1a30;color:#f5f0e8;}";
    var st = document.createElement("style"); st.id = "abuz8-i18n-css"; st.textContent = css; document.head.appendChild(st);
  }

  function ensureSelect() {
    var sel = document.getElementById("langSelect");
    if (sel) return sel;
    var navLinks = document.querySelector(".nav-links");
    var host = navLinks || document.querySelector("nav .nav-inner") || document.querySelector("nav");
    if (!host) return null;
    sel = document.createElement("select");
    sel.id = "langSelect"; sel.className = "lang-select"; sel.setAttribute("aria-label", "Language");
    for (var i = 0; i < SUPPORTED.length; i++) {
      var o = document.createElement("option");
      o.value = SUPPORTED[i]; o.textContent = LABELS[SUPPORTED[i]];
      sel.appendChild(o);
    }
    if (navLinks && navLinks.parentNode) navLinks.parentNode.insertBefore(sel, navLinks.nextSibling);
    else host.appendChild(sel);
    return sel;
  }

  var CURRENT = "en";
  function apply(lang) {
    CURRENT = lang;
    var d = I18N[lang] || I18N.en;
    var els = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < els.length; i++) {
      var k = els[i].getAttribute("data-i18n");
      if (d[k] != null) els[i].innerHTML = d[k];
    }
    var rtl = (lang === "ar" || lang === "he" || lang === "ur");
    var h = document.documentElement;
    h.lang = lang; h.dir = rtl ? "rtl" : "ltr";
    try { localStorage.setItem("abuz8_lang", lang); } catch (e) {}
    var s = document.getElementById("langSelect"); if (s) s.value = lang;
    // Notify page scripts (e.g. JS-rendered lists) so they can re-render in the new language.
    try { document.dispatchEvent(new CustomEvent("abuz8:i18n", { detail: { lang: lang } })); } catch (e) {}
  }
  // Public API for page JS that renders content dynamically.
  window.ABUZ8I18N = {
    t: function (k) { var dd = I18N[CURRENT] || I18N.en; return (dd[k] != null) ? dd[k] : (I18N.en[k] != null ? I18N.en[k] : k); },
    lang: function () { return CURRENT; }
  };

  function init() {
    injectCss();
    var sel = ensureSelect();
    var saved = null; try { saved = localStorage.getItem("abuz8_lang"); } catch (e) {}
    var nl = (navigator.language || "en").slice(0, 2).toLowerCase();
    var lang = (saved && SUPPORTED.indexOf(saved) >= 0) ? saved : (SUPPORTED.indexOf(nl) >= 0 ? nl : "en");
    if (sel) sel.addEventListener("change", function () { apply(this.value); });
    apply(lang);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
