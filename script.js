let words = [];
let currentWord;
let score = 0;
let questionNumber = 1;
let synth = window.speechSynthesis;
let voices = [];
let recognition;

document.addEventListener('DOMContentLoaded', function() {
    loadVocabulary();
    initializeSpeechRecognition();
    populateVoiceList();

    // Populate voice list when voices change
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
            }).filter(word => word.correct); // Ensure valid entries
            if (words.length === 0) {
                console.error('No vocabulary words found.');
                alert('No vocabulary data found. Please check the CSV file.');
                return;
            }
            nextWord();
        })
        .catch(error => {
            console.error('Error loading vocabulary:', error);
            alert('Failed to load vocabulary. Please try again later.');
        });
}

function nextWord() {
    if (words.length === 0) {
        console.error('No words loaded');
        return;
    }

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
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function checkAnswer(button) {
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
        speakWord(currentWord.correct, 3);
    } else {
        resultElement.textContent = '틀렸습니다. 다시 시도하세요.';
        resultElement.style.color = 'red';
        score = Math.max(0, score - 2);
        playAudio('incorrect-audio');
        return;
    }
    updateScore();
    // Disable choices after answer
    buttons.forEach(btn => btn.disabled = true);

    // Proceed to the next word after a delay
    setTimeout(() => {
        questionNumber++;
        nextWord();
    }, 2000);
}

function updateScore() {
    const scoreDisplay = document.getElementById('score-display');
    const scoreFill = document.getElementById('score-fill');
    scoreDisplay.textContent = `Score: ${score}`;
    scoreFill.style.width = `${score}%`;
}

function speakWord(word, times) {
    let count = 0;
    function speak() {
        if (count < times) {
            const utterance = new SpeechSynthesisUtterance(word);
            const selectedVoice = document.getElementById('voice-select').selectedOptions[0]?.getAttribute('data-name');
            utterance.voice = voices.find(voice => voice.name === selectedVoice) || voices[0];
            utterance.rate = parseFloat(document.getElementById('rate').value);

            utterance.onerror = function(event) {
                console.error('SpeechSynthesisUtterance.onerror', event);
            };

            utterance.onend = function() {
                count++;
                speak(); // Repeat until count is reached
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
        recognition.continuous = false;  // Stop after each result
        recognition.interimResults = true;

        recognition.onresult = function(event) {
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

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
        };

        recognition.onend = function() {
            console.log('Speech recognition ended.');
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

    // Set default voice if not selected
    if (voiceSelect.options.length > 0) {
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

document.getElementById('rate').addEventListener('input', function() {
    document.getElementById('rate-value').textContent = this.value;
});
