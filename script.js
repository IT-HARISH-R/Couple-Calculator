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
            .replace(/plus|add|addition/gi, "+")
            .replace(/minus|subtract|subtraction|less/gi, "-")
            .replace(/times|into|multiply|multiplication|product/gi, "*")
            .replace(/divide|by|division|over/gi, "/")
            .replace(/கூட்டு|கூட்டல்|சேர்த்து|பிளஸ்|ஆட்|சம்மேச்சு/gi, "+")
            .replace(/கழி|கழித்தல்|மைனஸ்|குறைத்தல்|கம்மி|கழிச்சு/gi, "-")
            .replace(/பெருக்கு|மடக்கு|இன்டு|மடங்காக|ப்ராடக்ட்|பெருக்கல்/gi, "*")
            .replace(/வகுத்து|வகுத்தல்|வகுக்க|டிவைடட்|பங்கிட்டு|பகுத்தல்/gi, "/");

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
                const utter = new SpeechSynthesisUtterance(`The answer is ${ans}`);
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
