const startBtn = document.getElementById("startBtn");
const btnText = document.querySelector(".btn-text");
const listeningText = document.querySelector(".listening-text");
const micIndicator = document.getElementById("mic-indicator");
const expressionEl = document.getElementById("expression");
const resultEl = document.getElementById("result");

startBtn.addEventListener("click", () => {
    const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ta-IN"; // Tamil + English recognition
    recognition.start();

    console.log(" Listening...");

    // Switch to listening animation
    btnText.style.opacity = "0";
    listeningText.style.opacity = "1";
    micIndicator.classList.remove("hidden", "speaking"); // remove speaking
    micIndicator.classList.add("listening"); // waves active

    recognition.onend = () => {
        console.log(" Stopped listening");
        btnText.style.opacity = "1";
        listeningText.style.opacity = "0";
        // If not speaking, hide
        if (!micIndicator.classList.contains("speaking")) {
            micIndicator.classList.add("hidden");
        }
    };

    recognition.onresult = (event) => {
        let voiceText = event.results[0][0].transcript.toLowerCase();
        console.log(" Voice Input:", voiceText);

        // Clean filler words
        voiceText = voiceText
            .replace(/அப்புறம்|பிறகு|என்று|சொன்னேன்|விடை|answer|then|after/gi, "")
            .trim();

        // Convert to math expression
        let exp = voiceText
            // English + symbols
            .replace(/\b(plus|add|addition|sum|increase|increment|and)\b/gi, "+")
            .replace(/\b(minus|subtract|subtraction|less|deduct|decrease|reduce|difference|take away)\b/gi, "-")
            .replace(/\b(times|into|multiply|multiplication|product|multiplied by|x)\b/gi, "*")
            .replace(/\b(divide|by|division|over|divided by|quotient|per)\b/gi, "/")

            // Tamil + synonyms
            .replace(/(கூட்டு|கூட்டல்|சேர்த்து|பிளஸ்|பளஸ்|ஆட்|சம்மேச்சு|மேலும்|இணை)/gi, "+")
            .replace(/(கழி|கழித்தல்|மைனஸ்|குறைத்தல்|கம்மி|கழிச்சு|குறை|வெறுமை)/gi, "-")
            .replace(/(பெருக்கு|மடக்கு|இன்டு|மடங்காக|ப்ராடக்ட்|பெருக்கல்|எதிரொலி|x)/gi, "*")
            .replace(/(வகுத்து|வகுத்தல்|வகுக்க|டிவைடட்|டிவைட் பை|டிவைடட் பை|பங்கிட்டு|பகுத்தல்|பிரித்தல்|பிரித்து|பங்கிடு)/gi, "/")

            // Extra human-friendly replacements
            .replace(/\bequal to|is equal to|answer|result|என்பது|சமம்|விடை/gi, "=")
            .replace(/\band\b/gi, "+")  // sometimes people say "two and three"
            .replace(/×/g, "*")         // symbol support
            .replace(/÷/g, "/");        // symbol support

        expressionEl.textContent = `Expression ${exp}`;

        try {
            const validPattern = /^[0-9+\-*/().\s]+$/;
            if (validPattern.test(exp)) {
                const ans = eval(exp);
                resultEl.textContent = `Result: ${ans}`;

                //  Switch to speaking animation
                micIndicator.classList.remove("listening");
                micIndicator.classList.add("speaking");

                // Speak result
                const synth = window.speechSynthesis;
                const utter = new SpeechSynthesisUtterance(` ${ans}`);
                utter.lang = "ta-IN";
                synth.speak(utter);

                utter.onend = () => {
                    console.log(" Finished speaking");
                    micIndicator.classList.remove("speaking");
                    micIndicator.classList.add("hidden"); // hide after speaking
                };
            } else {
                console.warn(" Invalid string detected...");
                resultEl.textContent = " Invalid Expression";
            }
        } catch (error) {
            console.error(" Error evaluating:", error);
            resultEl.textContent = " Error in calculation";
        }
    };
});
