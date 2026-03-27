const QUESTIONS = [
    // Historia
    { category: "Historia", question: "Berlinmuren föll", answer: 1989, hint: "Kalla krigets slut närmade sig" },
    { category: "Historia", question: "Franska revolutionen började", answer: 1789, hint: "Stormningen av Bastiljen" },
    { category: "Historia", question: "Titanic sjönk", answer: 1912, hint: "Det 'osänkbara' skeppet" },
    { category: "Historia", question: "Första världskriget slutade", answer: 1918, hint: "Den 11:e timmen, den 11:e dagen, den 11:e månaden" },
    { category: "Historia", question: "Neil Armstrong gick på månen", answer: 1969, hint: "Ett litet steg för en människa..." },
    { category: "Historia", question: "Amerikas förenta stater grundades", answer: 1776, hint: "Independence Day" },
    { category: "Historia", question: "Andra världskriget slutade", answer: 1945, hint: "Atombomber över Japan" },
    { category: "Historia", question: "Kristofer Columbus nådde Amerika", answer: 1492, hint: "Han trodde han var i Indien" },
    { category: "Historia", question: "Stockholms blodbad ägde rum", answer: 1520, hint: "Kristian II avrättade svenska adelsmän" },
    { category: "Historia", question: "Gustav Vasa blev kung av Sverige", answer: 1523, hint: "Sveriges nationaldag firas till hans ära" },
    { category: "Historia", question: "Mordet på Martin Luther King Jr.", answer: 1968, hint: "I have a dream" },
    { category: "Historia", question: "Napoleon Bonaparte blev kejsare av Frankrike", answer: 1804, hint: "Han krönte sig själv" },
    { category: "Historia", question: "Den stora branden i London", answer: 1666, hint: "Började i ett bageri" },

    // Vetenskap & Teknik
    { category: "Vetenskap", question: "Den första iPhonen lanserades", answer: 2007, hint: "Steve Jobs stod på scenen" },
    { category: "Vetenskap", question: "World Wide Web uppfanns", answer: 1989, hint: "Tim Berners-Lee vid CERN" },
    { category: "Vetenskap", question: "DNA-strukturen upptäcktes", answer: 1953, hint: "Watson och Crick" },
    { category: "Vetenskap", question: "Första e-postmeddelandet skickades", answer: 1971, hint: "Ray Tomlinson använde @-tecknet" },
    { category: "Vetenskap", question: "Google grundades", answer: 1998, hint: "Startade i ett garage i Kalifornien" },
    { category: "Vetenskap", question: "Penicillin upptäcktes", answer: 1928, hint: "Alexander Fleming glömde en petriskål" },
    { category: "Vetenskap", question: "Facebook lanserades", answer: 2004, hint: "Mark Zuckerberg var på Harvard" },
    { category: "Vetenskap", question: "Glödlampan uppfanns", answer: 1879, hint: "Thomas Edison" },
    { category: "Vetenskap", question: "Första kommersiella mobiltelefonen såldes", answer: 1983, hint: "Motorola DynaTAC, vägde nästan 1 kg" },
    { category: "Vetenskap", question: "Wikipedia grundades", answer: 2001, hint: "Fri kunskap för alla" },
    { category: "Vetenskap", question: "Spotify lanserades", answer: 2008, hint: "Svenskt musikföretag" },
    { category: "Vetenskap", question: "Dynamit uppfanns", answer: 1867, hint: "Alfred Nobel" },

    // Sport
    { category: "Sport", question: "Sverige vann OS-guld i fotboll", answer: 1948, hint: "Sommar-OS i London" },
    { category: "Sport", question: "Björn Borg vann sin första Wimbledon-titel", answer: 1976, hint: "Svensk tennislegend" },
    { category: "Sport", question: "Zlatan Ibrahimovic debuterade i landslaget", answer: 2001, hint: "Mot Färöarna" },
    { category: "Sport", question: "Första moderna olympiska spelen hölls", answer: 1896, hint: "I Aten, Grekland" },
    { category: "Sport", question: "Sverige blev VM-tvåa i fotboll på hemmaplan", answer: 1958, hint: "Brasilien vann med Pelé" },
    { category: "Sport", question: "Ingemar Stenmark vann sina OS-guld", answer: 1980, hint: "Lake Placid" },
    { category: "Sport", question: "Tre Kronor vann OS-guld i ishockey för första gången", answer: 1994, hint: "Lillehammer, Norge" },
    { category: "Sport", question: "Usain Bolt satte världsrekord på 100 meter", answer: 2009, hint: "9,58 sekunder i Berlin" },
    { category: "Sport", question: "Första Super Bowl spelades", answer: 1967, hint: "Green Bay Packers vann" },
    { category: "Sport", question: "Carolina Klüft vann OS-guld i sjukamp", answer: 2004, hint: "Aten, Grekland" },

    // Kultur & Nöje
    { category: "Kultur", question: "ABBA vann Eurovision Song Contest", answer: 1974, hint: "Waterloo!" },
    { category: "Kultur", question: "Första Star Wars-filmen hade premiär", answer: 1977, hint: "A long time ago in a galaxy far, far away..." },
    { category: "Kultur", question: "Minecraft släpptes", answer: 2011, hint: "Markus 'Notch' Persson" },
    { category: "Kultur", question: "Beatles splittrades", answer: 1970, hint: "Let It Be var deras sista album" },
    { category: "Kultur", question: "Första Harry Potter-boken publicerades", answer: 1997, hint: "J.K. Rowling" },
    { category: "Kultur", question: "Astrid Lindgren publicerade Pippi Långstrump", answer: 1945, hint: "Världens starkaste flicka" },
    { category: "Kultur", question: "Netflix startade sin streamingtjänst", answer: 2007, hint: "Från DVD-uthyrning till streaming" },
    { category: "Kultur", question: "Första Melodifestivalen i Sverige hölls", answer: 1959, hint: "Svensk musiktradition" },
    { category: "Kultur", question: "Mona Lisa stals från Louvren", answer: 1911, hint: "En italiensk hantverkare tog den" },
    { category: "Kultur", question: "TikTok lanserades internationellt", answer: 2017, hint: "Kort videoformat från Kina" },
    { category: "Kultur", question: "Hobbit av J.R.R. Tolkien publicerades", answer: 1937, hint: "I ett hål i marken bodde en hobbit" },

    // Sverige
    { category: "Sverige", question: "Sverige gick med i EU", answer: 1995, hint: "Folkomröstning året innan" },
    { category: "Sverige", question: "Mordet på Olof Palme", answer: 1986, hint: "På Sveavägen i Stockholm" },
    { category: "Sverige", question: "Kvinnor fick rösträtt i Sverige", answer: 1921, hint: "Första valet med kvinnlig rösträtt" },
    { category: "Sverige", question: "Sverige bytte till högertrafik", answer: 1967, hint: "Dagen H - den 3 september" },
    { category: "Sverige", question: "Tsunamikatastrofen som drabbade svenskar", answer: 2004, hint: "Sydostasien, annandag jul" },
    { category: "Sverige", question: "Kronprinsessan Victoria gifte sig", answer: 2010, hint: "Med Daniel Westling" },
    { category: "Sverige", question: "IKEA grundades", answer: 1943, hint: "Ingvar Kamprad var 17 år" },
    { category: "Sverige", question: "Regalskeppet Vasa sjönk", answer: 1628, hint: "På sin jungfruresa i Stockholms hamn" },
    { category: "Sverige", question: "Alfred Nobel instiftade Nobelpriset i sitt testamente", answer: 1895, hint: "Året innan han dog" },
    { category: "Sverige", question: "Öresundsbron invigdes", answer: 2000, hint: "Förbinder Sverige och Danmark" },
    { category: "Sverige", question: "Estonia-katastrofen", answer: 1994, hint: "Färjan sjönk på Östersjön" },
    { category: "Sverige", question: "Volvo grundades i Göteborg", answer: 1927, hint: "Säkerhet i fokus" }
];

const CATEGORIES = [...new Set(QUESTIONS.map(q => q.category))];
