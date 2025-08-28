// script.js
const startBtn = document.getElementById("startBtn");
const btnText = document.querySelector(".btn-text");
const listeningText = document.querySelector(".listening-text");
const micIndicator = document.getElementById("mic-indicator");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

// -----------------------
// Number & word mapping (Tamil + English + phonetic)
// -----------------------
const numberMap = {
  "பூஜ்ஜியம்": "0", "zero": "0",

  "ஒன்று": "1", "ஒன்": "1", "1னு": "1", "ஒன்னு": "1",
  "one": "1",

  "இரண்டு": "2", "ரெண்டு": "2", "ரண்டு": "2", "டூ": "2", "two": "2",

  "மூன்று": "3", "மூனு": "3", "மூணு": "3", "த்ரீ": "3", "three": "3",

  "நான்கு": "4", "நாலு": "4", "ஃபோர்": "4", "four": "4",

  "ஐந்து": "5", "அஞ்சு": "5", "அயின்து": "5", "ஃபைவ்": "5", "five": "5",

  "ஆறு": "6", "ஆரு": "6", "சிக்ஸ்": "6", "six": "6",

  "ஏழு": "7", "எழு": "7", "செவன்": "7", "seven": "7",

  "எட்டு": "8", "எட்டு": "8", "ஏய்ட்": "8", "eight": "8",

  "ஒன்பது": "9", "ஒம்பது": "9", "1பது": "9", "1 பது": "9", "நைன்": "9", "nine": "9",

  "பத்து": "10", "டென்": "10", "ten": "10"
};

// Tamil numerals (U+0BE6..U+0BEF)
const tamilDigitMap = {
  "௦": "0", "௧": "1", "௨": "2", "௩": "3", "௪": "4",
  "௫": "5", "௬": "6", "௭": "7", "௮": "8", "௯": "9"
};

// escape regexp helper
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// -----------------------
// Convert spoken text -> math expression
// -----------------------
function convertToMathExpression(text) {
  if (!text) return "";

  let exp = text.toString().toLowerCase();

  // 1) Tamil numerals -> ascii
  exp = exp.replace(/[௦-௯]/g, (m) => tamilDigitMap[m] ?? m);

  // 2) Ensure digits and Tamil/English words are separated
  exp = exp.replace(/(\d)([^\d\s])/g, "$1 $2");
  exp = exp.replace(/([^\d\s])(\d)/g, "$1 $2");

  // 3) Map Tamil/English number words
  for (const [word, digit] of Object.entries(numberMap)) {
    const re = /[^\u0000-\u007f]/.test(word)
      ? new RegExp(escapeRegExp(word), "gi")
      : new RegExp("\\b" + escapeRegExp(word) + "\\b", "gi");
    exp = exp.replace(re, digit);
  }

  // 4) English operator words
  exp = exp
    .replace(/\b(plus|add|addition|sum|increase|increment|and)\b/gi, "+")
    .replace(/\b(minus|subtract|subtraction|less|deduct|decrease|reduce|take away|difference)\b/gi, "-")
    .replace(/\b(times|into|multiply|multiplication|product|multiplied by|x)\b/gi, "*")
    .replace(/\b(divide|by|division|over|divided by|quotient|per)\b/gi, "/");

  // 5) Tamil operator words
  exp = exp
    .replace(/கூட்டு|கூட்டல்|சேர்த்து|ப்ளஸ்|பிளஸ்|ஆட்|சம்மேச்சு/gi, "+")
    .replace(/கழி|கழித்தல்|மைனஸ்|குறைத்தல்|கம்மி|கழிச்சு/gi, "-")
    .replace(/பெருக்கு|மடக்கு|இன்டு|மடங்காக|பெருக்கல்|டைம்ஸ்|மல்டிபிள்/gi, "*")
    .replace(/வகுத்து|வகுத்தல்|வகுக்க|பகுத்தல்|டிவைடு|டிவைடட்|டிவைடர்|டிவைட்|பை/gi, "/");

  // 6) Remove filler words like "equal to", "answer"
  exp = exp.replace(/\b(equal to|is equal to|answer|result|என்பது|சமம்|விடை)\b/gi, "");

  // 7) Remove separators & weird whitespace
  exp = exp.replace(/[,٬\u00A0\u200B]/g, "");

  // 8) Normalize whitespace
  exp = exp.replace(/\s+/g, " ").trim();
  exp = exp.replace(/\s*([+\-*/()])\s*/g, "$1");

  // 9) Remove stray operators at start/end
  exp = exp.replace(/^[+\-*/]+/, "");
  exp = exp.replace(/[+\-*/]+$/, "");

  return exp;
}

// -----------------------
// Start listening & evaluate
// -----------------------
startBtn.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("SpeechRecognition not supported in this browser.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "ta-IN"; // Tamil + English mix
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  console.log("Listening...");

  // UI: listening state
  btnText.style.opacity = "0";
  listeningText.style.opacity = "1";
  micIndicator.classList.remove("hidden", "speaking");
  micIndicator.classList.add("listening");

  recognition.onresult = (event) => {
    let voiceText = event.results[0][0].transcript || "";
    voiceText = voiceText.trim();
    console.log("Voice Input:", voiceText);

    // strip filler words
    voiceText = voiceText.replace(/அப்புறம்|பிறகு|என்று|சொன்னேன்|then|after/gi, "").trim();

    // normalize
    let exp = convertToMathExpression(voiceText);
    console.log("Normalized expression:", exp);

    expressionEl.textContent = `Expression: ${exp || "(not recognized)"}`;

    // validate
    const finalValid = /^[0-9+\-*/().]+$/;
    if (!exp || !finalValid.test(exp)) {
      console.warn("⚠ Invalid string detected (after normalization).");
      resultEl.textContent = "Invalid Expression";
      return;
    }

    try {
      const ans = eval(exp); // safe after validation
      resultEl.textContent = `Result: ${ans}`;

      // speaking animation
      micIndicator.classList.remove("listening");
      micIndicator.classList.add("speaking");

      // Speak answer
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(String(ans));
      const hasTamilChars = /[^\u0000-\u007f]/.test(voiceText);
      utter.lang = hasTamilChars ? "ta-IN" : "en-US";
      synth.speak(utter);

      utter.onend = () => {
        console.log("Finished speaking");
        micIndicator.classList.remove("speaking");
        micIndicator.classList.add("hidden");
      };
    } catch (err) {
      console.error("Error evaluating:", err);
      resultEl.textContent = "⚠ Error in calculation";
    }
  };

  recognition.onerror = (ev) => {
    console.error("Speech recognition error:", ev.error);
    resultEl.textContent = "Speech recognition error";
  };

  recognition.onend = () => {
    console.log("Stopped listening");
    btnText.style.opacity = "1";
    listeningText.style.opacity = "0";
    if (!micIndicator.classList.contains("speaking")) {
      micIndicator.classList.add("hidden");
    }
  };
});
