let words = [];
let currentWord;
let score = 0;
let questionNumber = 1;
let synth = window.speechSynthesis;
let voices = [];
let recognition;
let speaking = false; // Flag to track if speaking is in progress

document.addEventListener('DOMContentLoaded', function () {
    loadVocabulary();
    initializeSpeechRecognition();

    // Ensure voices are loaded and populate the list
    populateVoiceList();
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }
});

function loadVocabulary() {
    fetch('vocabulary.csv')
        .then(response => response.text())
        .then(data => {
            words = data.split('\n').slice(1).map(line => {
                const [korean, correct, wrong, wrongKorean] = line.split(',');
                return { korean, correct, wrong, wrongKorean };
            });
            nextWord();
        })
        .catch(error => {
            console.error('Error loading vocabulary:', error);
            alert('Failed to load vocabulary. Please try again later.');
        });
}

function nextWord() {
    if (score >= 100) {
        endGame();
        return;
    }
    currentWord = words[Math.floor(Math.random() * words.length)];
    const wordCard = document.getElementById('word-card');
    const choices = [currentWord.correct, currentWord.wrong];
    shuffleArray(choices);

    wordCard.innerHTML = `
        <p class="korean-word">${currentWord.korean}</p>
        <button class="choice" onclick="checkAnswer(this)">${choices[0]}</button>
        <button class="choice" onclick="checkAnswer(this)">${choices[1]}</button>
    `;
    document.getElementById('result').textContent = '';
    document.getElementById('voice-input-box').innerHTML = '<p>정답을 말해보세요</p>';
    document.getElementById('question-number').textContent = `Question ${questionNumber}`;
    startSpeechRecognition();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function checkAnswer(button) {
    if (speaking) return; // Prevent interaction if speaking is ongoing

    const isCorrect = button.textContent.toLowerCase() === currentWord.correct.toLowerCase();
    const resultElement = document.getElementById('result');
    const buttons = document.querySelectorAll('.choice');

    buttons.forEach(btn => {
        if (btn.textContent.toLowerCase() === currentWord.correct.toLowerCase()) {
            btn.style.backgroundColor = '#4caf50';
        } else {
            btn.style.backgroundColor = '#f44336';
        }
    });

    if (isCorrect) {
        resultElement.textContent = '정답입니다!';
        resultElement.style.color = 'green';
        score += 2;
        playAudio('correct-audio');
        speakWordNTimes(currentWord.correct, 3); // Call the new function with precise control
    } else {
        resultElement.textContent = '틀렸습니다. 다시 시도하세요.';
        resultElement.style.color = 'red';
        score = Math.max(0, score - 2);
        playAudio('incorrect-audio');
        // 틀린 경우 버튼을 다시 활성화
        buttons.forEach(btn => btn.disabled = false);
        return; // 틀린 경우 함수를 여기서 종료
    }
    updateScore();
}

function updateScore() {
    const scoreDisplay = document.getElementById('score-display');
    const scoreFill = document.getElementById('score-fill');
    scoreDisplay.textContent = `Score: ${score}`;
    scoreFill.style.width = `${score}%`;
}

function speakWordNTimes(word, times) {
    let count = 0;
    speaking = true; // Set the flag to indicate speaking is in progress

    function speak() {
        if (count < times) {
            const utterance = new SpeechSynthesisUtterance(word);
            const selectedVoice = document.getElementById('voice-select').selectedOptions[0]?.getAttribute('data-name');
            // Choose the selected voice or default to the first voice
            utterance.voice = voices.find(voice => voice.name === selectedVoice) || voices[0];
            utterance.rate = parseFloat(document.getElementById('rate').value);

            utterance.onerror = function (event) {
                console.error('SpeechSynthesisUtterance.onerror', event);
                speaking = false; // Reset flag on error
            };

            utterance.onend = function () {
                count++;
                if (count < times) {
                    speak(); // Continue speaking until the count is reached
                } else {
                    // Ensure we move to the next question after all repetitions are done
                    setTimeout(() => {
                        speaking = false; // Reset the speaking flag
                        questionNumber++;
                        nextWord();
                    }, 1000); // Small delay to transition smoothly
                }
            };

            synth.speak(utterance);
        }
    }
    speak();
}

function initializeSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = function (event) {
            const voiceInputBox = document.getElementById('voice-input-box');
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            voiceInputBox.innerHTML = finalTranscript + '<i style="color:#999">' + interimTranscript + '</i>';

            if (finalTranscript.toLowerCase().includes(currentWord.correct.toLowerCase())) {
                checkAnswer({ textContent: currentWord.correct });
                recognition.stop();
            }
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error', event.error);
        };

        recognition.onend = function () {
            console.log('Speech recognition ended. Restarting...');
            startSpeechRecognition();
        };
    } else {
        console.error('Speech recognition is not supported in this browser.');
    }
}

function startSpeechRecognition() {
    if (recognition) {
        recognition.start();
        console.log('Speech recognition started');
    } else {
        console.error('Speech recognition instance not initialized.');
    }
}

function populateVoiceList() {
    voices = synth.getVoices();
    const voiceSelect = document.getElementById('voice-select');
    voiceSelect.innerHTML = ''; // Clear previous options

    // Add US English voices
    voices.forEach((voice) => {
        if (voice.lang === 'en-US') {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);
        }
    });

    // Log available voices for debugging
    console.log('Available voices:', voices);

    // Set default voice if not selected
    if (!voiceSelect.value && voices.length > 0) {
        voiceSelect.selectedIndex = 0;
    }
}

function endGame() {
    const wordCard = document.getElementById('word-card');
    wordCard.innerHTML = '<h2>축하합니다! 학습을 완료했습니다.</h2>';
    document.getElementById('voice-input-box').style.display = 'none';
    document.getElementById('voice-input-btn').style.display = 'none';
}

function playAudio(id) {
    const audio = document.getElementById(id);
    audio.play();
}

document.getElementById('voice-input-btn').addEventListener('click', () => {
    if (!synth.speaking) {
        startSpeechRecognition();
    }
});

document.getElementById('rate').addEventListener('input', function () {
    document.getElementById('rate-value').textContent = this.value;
});
