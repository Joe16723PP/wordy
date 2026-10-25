(async () => {
  const FALLBACK_ANSWERS = [
    'APPLE', 'BEACH', 'BERRY', 'BREAD', 'BRICK', 'BRUSH', 'CANDY', 'CHAIR', 'CHARM', 'CLOUD',
    'CRANE', 'CROWN', 'DANCE', 'DREAM', 'EARTH', 'FLAME', 'FLUTE', 'FRAME', 'FRESH', 'FRUIT',
    'GHOST', 'GRAPE', 'GRASS', 'HEART', 'HONEY', 'HOUSE', 'JUICE', 'LIGHT', 'MANGO', 'MUSIC',
    'NIGHT', 'OCEAN', 'OLIVE', 'PAINT', 'PAPER', 'PEACH', 'PLANT', 'PLATE', 'ROBOT', 'SHINE',
    'SMILE', 'SNAKE', 'SOUND', 'SPACE', 'SPOON', 'STONE', 'STORM', 'SWEET', 'TIGER', 'TRAIN',
    'WATER', 'WHALE', 'WORLD', 'ZEBRA',
  ];
  const ANSWERS = await loadAnswerList();
  const MAX_GUESSES = 6;
  const STORAGE_KEY = 'wordy-demo-v1';
  const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const PRIORITY = { absent: 1, present: 2, correct: 3 };
  const EMOJI = { absent: '⬛', present: '🟨', correct: '🟩' };

  const board = document.querySelector('#board');
  const keyboard = document.querySelector('#keyboard');
  const toast = document.querySelector('#toast');
  const gameCard = document.querySelector('.game-card');
  const helpDialog = document.querySelector('#help-dialog');
  const statsDialog = document.querySelector('#stats-dialog');
  const shareDialog = document.querySelector('#share-dialog');
  const randomDialog = document.querySelector('#random-dialog');
  const hintDialog = document.querySelector('#hint-dialog');
  const hintButton = document.querySelector('#hint-button');
  const rows = [];
  let guesses = [];
  let current = '';
  let finished = false;
  let hintUsed = false;
  let answer = pickRandomAnswer();

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date());
  document.querySelector('#puzzle-date').textContent = today.toUpperCase();

  function pickRandomAnswer(previousAnswer = '') {
    const options = ANSWERS.filter(word => word !== previousAnswer);
    return options[Math.floor(Math.random() * options.length)];
  }

  async function loadAnswerList() {
    try {
      const response = await fetch('./assets/words.jsonl');
      if (!response.ok) throw new Error(`Word list request failed: ${response.status}`);
      const lines = (await response.text()).split(/\r?\n/);
      const words = [];
      const seen = new Set();
      for (const line of lines) {
        if (!line.trim()) continue;
        let record;
        try { record = JSON.parse(line); } catch { continue; }
        const word = record && typeof record.word === 'string' ? record.word.toUpperCase() : '';
        if (!/^[A-Z]{5}$/.test(word) || seen.has(word)) continue;
        seen.add(word);
        words.push(word);
        if (words.length === 1000) break;
      }
      if (words.length === 0) throw new Error('Word list did not contain usable entries');
      return words;
    } catch {
      // A file:// preview cannot fetch neighboring files in many browsers.
      return [...FALLBACK_ANSWERS];
    }
  }

  function readSavedGame() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !Array.isArray(saved.guesses) || saved.guesses.length > MAX_GUESSES) return null;
      if (!saved.guesses.every(word => typeof word === 'string' && /^[A-Z]{5}$/.test(word))) return null;
      if (saved.current && (typeof saved.current !== 'string' || !/^[A-Z]{0,5}$/.test(saved.current))) return null;
      if (saved.finished && saved.guesses.length === 0) return null;
      // Keep rounds created by the previous fixed-answer prototype playable.
      if (!saved.answer && (saved.guesses.length || saved.current)) saved.answer = 'CRANE';
      if (!saved.answer || !ANSWERS.includes(saved.answer)) return null;
      saved.hintUsed = Boolean(saved.hintUsed);
      return saved;
    } catch {
      return null;
    }
  }

  function saveGame() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answer, guesses, current, finished, hintUsed }));
    } catch {
      // The game still works in private browsing or when storage is unavailable.
    }
  }

  function buildBoard() {
    for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex += 1) {
      const row = document.createElement('div');
      row.className = 'row';
      row.setAttribute('role', 'row');
      row.setAttribute('aria-label', `Guess ${rowIndex + 1}`);
      for (let columnIndex = 0; columnIndex < 5; columnIndex += 1) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('role', 'gridcell');
        tile.setAttribute('aria-label', 'Empty');
        row.append(tile);
      }
      board.append(row);
      rows.push(row);
    }
  }

  function makeKey(label, wide = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `key${wide ? ' wide' : ''}`;
    button.textContent = label;
    button.setAttribute('aria-label', label === '⌫' ? 'Delete letter' : label === 'ENTER' ? 'Submit guess' : label);
    button.addEventListener('click', () => press(label));
    return button;
  }

  function buildKeyboard() {
    KEY_ROWS.forEach((letters, rowIndex) => {
      const row = document.createElement('div');
      row.className = 'key-row';
      if (rowIndex === 2) row.append(makeKey('ENTER', true));
      [...letters].forEach(letter => row.append(makeKey(letter)));
      if (rowIndex === 2) row.append(makeKey('⌫', true));
      keyboard.append(row);
    });
  }

  function score(guess) {
    const result = Array(5).fill('absent');
    const remaining = answer.split('');

    // Mark exact matches first so duplicate letters cannot claim the same answer tile twice.
    [...guess].forEach((letter, index) => {
      if (letter === answer[index]) {
        result[index] = 'correct';
        remaining[index] = null;
      }
    });
    [...guess].forEach((letter, index) => {
      if (result[index] === 'correct') return;
      const answerIndex = remaining.indexOf(letter);
      if (answerIndex !== -1) {
        result[index] = 'present';
        remaining[answerIndex] = null;
      }
    });
    return result;
  }

  function renderCurrent() {
    const row = rows[guesses.length];
    if (!row) return;
    [...row.children].forEach((tile, index) => {
      tile.textContent = current[index] || '';
      tile.classList.toggle('filled', Boolean(current[index]));
      tile.setAttribute('aria-label', current[index] ? `${current[index]}, not submitted` : 'Empty');
    });
  }

  function renderGuess(guess, rowIndex, animate = false) {
    const result = score(guess);
    [...rows[rowIndex].children].forEach((tile, index) => {
      tile.textContent = guess[index];
      tile.classList.add(result[index]);
      if (animate) tile.classList.add('reveal');
      tile.setAttribute('aria-label', `${guess[index]}, ${result[index] === 'correct' ? 'correct position' : result[index] === 'present' ? 'in the word, different position' : 'not in the word'}`);
    });
    updateKeyboard(guess, result);
    return result;
  }

  function updateKeyboard(guess, result) {
    [...guess].forEach((letter, index) => {
      const key = [...keyboard.querySelectorAll('.key')].find(button => button.textContent === letter);
      if (!key) return;
      const oldState = ['absent', 'present', 'correct'].find(state => key.classList.contains(state));
      if (!oldState || PRIORITY[result[index]] > PRIORITY[oldState]) {
        key.classList.remove('absent', 'present', 'correct');
        key.classList.add(result[index]);
      }
    });
  }

  function announce(message, extraClass = '') {
    toast.textContent = message;
    toast.className = `toast${extraClass ? ` ${extraClass}` : ''}`;
  }

  function press(key) {
    if (finished || helpDialog.open || statsDialog.open || shareDialog.open || randomDialog.open) return;
    announce('');
    if (key === 'ENTER') return submitGuess();
    if (key === '⌫' || key === 'BACKSPACE') current = current.slice(0, -1);
    else if (/^[A-Z]$/.test(key) && current.length < 5) current += key;
    renderCurrent();
    saveGame();
  }

  function submitGuess() {
    if (current.length !== 5) {
      announce('Add five letters before you guess.', 'notice');
      return;
    }

    const guess = current;
    const rowIndex = guesses.length;
    guesses.push(guess);
    current = '';
    const result = renderGuess(guess, rowIndex, true);

    if (guess === answer) {
      finished = true;
      announce(`Lovely! You found the word in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}.`, 'success');
    } else if (guesses.length === MAX_GUESSES) {
      finished = true;
      announce(`The word was ${answer}. Try another random word when you’re ready.`, 'notice');
    } else {
      const hints = result.map((state, index) => `${guess[index]} ${state.replace('-', ' ')}`).join(', ');
      announce(`Guess ${guesses.length} submitted. ${hints}.`, 'success');
    }

    gameCard.classList.toggle('is-finished', finished);
    document.querySelector('#reset-button').hidden = !finished;
    hintButton.disabled = hintUsed || finished;
    hintButton.querySelector('span').textContent = hintUsed ? 'used' : '1 available';
    renderCurrent();
    saveGame();
  }

  function restoreGame() {
    const saved = readSavedGame();
    if (!saved) return;
    guesses = saved.guesses;
    current = saved.current || '';
    answer = saved.answer;
    hintUsed = saved.hintUsed;
    finished = Boolean(saved.finished || guesses.length >= MAX_GUESSES || guesses.includes(answer));
    guesses.forEach((guess, index) => renderGuess(guess, index));
    renderCurrent();
    gameCard.classList.toggle('is-finished', finished);
    document.querySelector('#reset-button').hidden = !finished;
    hintButton.disabled = hintUsed || finished;
    hintButton.querySelector('span').textContent = hintUsed ? 'used' : '1 available';
    if (guesses.includes(answer)) announce(`Lovely! You found the word in ${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'}.`, 'success');
    else if (guesses.length === MAX_GUESSES) announce(`The word was ${answer}. Try another random word when you’re ready.`, 'notice');
  }

  function emojiGrid() {
    return guesses.map(guess => score(guess).map(state => EMOJI[state]).join('')).join('\n');
  }

  async function shareResult() {
    if (guesses.length === 0) {
      announce('Play a round before sharing your result.', 'notice');
      return;
    }
    const resultText = `Wordy ${guesses.length}/${MAX_GUESSES}${finished && !guesses.includes(answer) ? ' ·' : ''}\n\n${emojiGrid()}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access unavailable');
      await navigator.clipboard.writeText(resultText);
      announce('Your spoiler-free result was copied.', 'success');
    } catch {
      document.querySelector('#share-text').value = resultText;
      shareDialog.showModal();
      const field = document.querySelector('#share-text');
      field.focus();
      field.select();
      announce('Select and copy your result below.', 'notice');
    }
  }

  function setTheme(isDark, persist = true) {
    document.body.classList.toggle('dark', isDark);
    document.querySelector('#theme-button').setAttribute('aria-pressed', String(isDark));
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#202720' : '#f6f5f0';
    if (persist) {
      try { localStorage.setItem('wordy-theme', isDark ? 'dark' : 'light'); } catch { /* Optional preference. */ }
    }
  }

  function initTheme() {
    let savedTheme;
    try { savedTheme = localStorage.getItem('wordy-theme'); } catch { /* Optional preference. */ }
    setTheme(savedTheme === 'dark', false);
  }

  function resetRound(nextAnswer) {
    answer = nextAnswer;
    guesses = [];
    current = '';
    finished = false;
    hintUsed = false;
    rows.forEach(row => [...row.children].forEach(tile => {
      tile.textContent = '';
      tile.className = 'tile';
      tile.setAttribute('aria-label', 'Empty');
    }));
    keyboard.querySelectorAll('.key').forEach(key => key.classList.remove('absent', 'present', 'correct'));
    gameCard.classList.remove('is-finished');
    document.querySelector('#reset-button').hidden = true;
    hintButton.disabled = false;
    hintButton.querySelector('span').textContent = '1 available';
    announce('A new random word is ready.');
    saveGame();
  }

  function requestRandomRound() {
    const hasProgress = guesses.length > 0 || current.length > 0;
    if (hasProgress && !finished) {
      randomDialog.showModal();
      return;
    }
    resetRound(pickRandomAnswer(answer));
  }

  buildBoard();
  buildKeyboard();
  initTheme();
  restoreGame();
  if (!readSavedGame()) saveGame();

  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey || helpDialog.open || statsDialog.open || shareDialog.open || randomDialog.open || hintDialog.open) return;
    const key = event.key.toUpperCase();
    if (key === 'ENTER' || key === 'BACKSPACE' || /^[A-Z]$/.test(key)) {
      event.preventDefault();
      press(key);
    }
  });

  document.querySelector('#help-button').addEventListener('click', () => helpDialog.showModal());
  document.querySelector('#stats-button').addEventListener('click', () => statsDialog.showModal());
  hintButton.addEventListener('click', () => {
    if (hintUsed || finished) return;
    const unrevealed = answer.split('').map((_, index) => index)
      .filter(index => guesses.every(guess => guess[index] !== answer[index]));
    const choices = unrevealed.length ? unrevealed : answer.split('').map((_, index) => index);
    const index = choices[Math.floor(Math.random() * choices.length)];
    const letter = answer[index];
    const ordinal = ['1st', '2nd', '3rd', '4th', '5th'][index];
    const hintResult = document.querySelector('#hint-result');
    const position = document.createElement('strong');
    position.textContent = `The ${ordinal} letter is`;
    const tile = document.createElement('span');
    tile.className = 'tile correct hint-tile';
    tile.textContent = letter;
    tile.setAttribute('aria-label', `${letter}, correct letter`);
    hintResult.replaceChildren(position, tile);
    hintUsed = true;
    hintButton.disabled = true;
    hintButton.querySelector('span').textContent = 'used';
    saveGame();
    hintDialog.showModal();
  });
  document.querySelector('#theme-button').addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
  document.querySelector('#share-button').addEventListener('click', shareResult);
  document.querySelector('#random-button').addEventListener('click', requestRandomRound);
  document.querySelector('#confirm-random').addEventListener('click', () => {
    randomDialog.close();
    resetRound(pickRandomAnswer(answer));
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog').close());
  });
  document.querySelector('#reset-button').addEventListener('click', () => {
    resetRound(pickRandomAnswer(answer));
  });
  document.querySelector('#copy-fallback').addEventListener('click', async () => {
    const field = document.querySelector('#share-text');
    field.focus();
    field.select();
    try {
      await navigator.clipboard.writeText(field.value);
      shareDialog.close();
      announce('Your spoiler-free result was copied.', 'success');
    } catch {
      announce('Press Ctrl+C or ⌘C to copy the selected result.', 'notice');
    }
  });
})();
