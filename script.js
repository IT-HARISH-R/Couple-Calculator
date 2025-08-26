// script.js
const startBtn = document.getElementById("startBtn");
const btnText = document.querySelector(".btn-text");
const listeningText = document.querySelector(".listening-text");
const micIndicator = document.getElementById("mic-indicator");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

// -----------------------
// Number & word mapping
// -----------------------
const numberMap = {
  // Tamil + english basic numbers (single-words)
  "பூஜ்ஜியம்": "0", "zero": "0",
  "ஒன்று": "1", "ஒன்": "1", "one": "1",
  "இரண்டு": "2", "டூ": "2", "two": "2",
  "மூன்று": "3", "த்ரீ": "3", "three": "3",
  "நான்கு": "4", "ஃபோர்": "4", "four": "4",
  "ஐந்து": "5", "ஃபைவ்": "5", "five": "5",
  "ஆறு": "6", "சிக்ஸ்": "6", "six": "6",
  "ஏழு": "7", "செவன்": "7", "seven": "7",
  "எட்டு": "8", "ஏய்ட்": "8", "eight": "8",
  "ஒன்பது": "9", "நைன்": "9", "nine": "9",
  "பத்து": "10", "டென்": "10", "ten": "10"
};

// Tamil numeral characters (U+0BE6 .. U+0BEF)
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

  // normalize
  let exp = text.toString().toLowerCase();

  // 1) convert Tamil numerals to ascii digits (e.g. ௯ -> 9)
  exp = exp.replace(/[௦-௯]/g, (m) => tamilDigitMap[m] ?? m);

  // 2) replace mapped words from numberMap (word boundaries)
  for (const [word, digit] of Object.entries(numberMap)) {
    const re = new RegExp("\\b" + escapeRegExp(word) + "\\b", "gi");
    exp = exp.replace(re, digit);
  }

  // 3) operator words -> symbols (English)
  exp = exp
    .replace(/\b(plus|add|addition|sum|increase|increment|and)\b/gi, "+")
    .replace(/\b(minus|subtract|subtraction|less|deduct|decrease|reduce|take away|difference)\b/gi, "-")
    .replace(/\b(times|into|multiply|multiplication|product|multiplied by|x)\b/gi, "*")
    .replace(/\b(divide|by|division|over|divided by|quotient|per)\b/gi, "/");

  // 4) operator words -> symbols (Tamil)
  exp = exp
    .replace(/கூட்டு|கூட்டல்|சேர்த்து|பிளஸ்|ஆட்|சம்மேச்சு/gi, "+")
    .replace(/கழி|கழித்தல்|மைனஸ்|குறைத்தல்|கம்மி|கழிச்சு/gi, "-")
    .replace(/பெருக்கு|மடக்கு|இன்டு|மடங்காக|பெருக்கல்/gi, "*")
    .replace(/வகுத்து|வகுத்தல்|வகுக்க|பகுத்தல்|டிவைடு|டிவைடட்/gi, "/");

  // 5) remove "answer/result" words and trailing "is equal to" phrases
  exp = exp.replace(/\b(equal to|is equal to|answer|result|என்பது|சமம்|விடை)\b/gi, "");

  // 6) remove thousands separators & weird whitespace (commas, Arabic thousands '٬', NBSP, ZERO-WIDTH)
  exp = exp.replace(/[,٬\u00A0\u200B]/g, "");

  // 7) collapse whitespace and normalize spaces around operators
  exp = exp.replace(/\s+/g, " ").trim();
  // remove spaces around math operators to produce a compact safe string for validation
  exp = exp.replace(/\s*([+\-*/()])\s*/g, "$1");

  // 8) remove leading/trailing operators (if user said "+ five" etc.)
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
  recognition.lang = "ta-IN"; // mixed Tamil + English
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.start();

  console.log("🎤 Listening...");

  // UI: listening state
  btnText.style.opacity = "0";
  listeningText.style.opacity = "1";
  micIndicator.classList.remove("hidden", "speaking");
  micIndicator.classList.add("listening");

  recognition.onresult = (event) => {
    let voiceText = event.results[0][0].transcript || "";
    voiceText = voiceText.trim();
    console.log("🗣 Voice Input:", voiceText);

    // remove common filler words early
    voiceText = voiceText.replace(/அப்புறம்|பிறகு|என்று|சொன்னேன்|then|after/gi, "").trim();

    // convert to math expression
    let exp = convertToMathExpression(voiceText);
    console.log("🔁 Normalized expression:", exp);
    expressionEl.textContent = `Expression: ${exp || "(not recognized)"}`;

    // final validation: only digits, operators, dot, parens allowed
    const finalValid = /^[0-9+\-*/().]+$/;
    if (!exp || !finalValid.test(exp)) {
      console.warn("⚠ Invalid string detected (after normalization).");
      resultEl.textContent = "❌ Invalid Expression";
      return;
    }

    try {
      // evaluate safely (still using eval for simplicity; ensure validated above)
      const ans = eval(exp);
      resultEl.textContent = `Result: ${ans}`;

      // speaking animation
      micIndicator.classList.remove("listening");
      micIndicator.classList.add("speaking");

      // Speak answer (Tamil voice locale; numbers read numerically)
      const synth = window.speechSynthesis;
      const utter = new SpeechSynthesisUtterance(String(ans));
      // choose language: if original had Tamil letters prefer ta-IN, else en-US
      const hasTamilChars = /[^\u0000-\u007f]/.test(voiceText); // simple check
      utter.lang = hasTamilChars ? "ta-IN" : "en-US";
      synth.speak(utter);

      utter.onend = () => {
        console.log("✅ Finished speaking");
        micIndicator.classList.remove("speaking");
        micIndicator.classList.add("hidden");
      };
    } catch (err) {
      console.error("💥 Error evaluating:", err);
      resultEl.textContent = "⚠ Error in calculation";
    }
  };

  recognition.onerror = (ev) => {
    console.error("Speech recognition error:", ev.error);
    resultEl.textContent = "⚠ Speech recognition error";
  };

  recognition.onend = () => {
    console.log("🛑 Stopped listening");
    // reset UI if not speaking
    btnText.style.opacity = "1";
    listeningText.style.opacity = "0";
    if (!micIndicator.classList.contains("speaking")) {
      micIndicator.classList.add("hidden");
    }
  };
});
