let current = '0';
let previous = null;
let operator = null;
let overwrite = true;
let lastOperand = null;
let lastOperator = null;
let history = [];

const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const keypad = document.getElementById('keypad');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('clearHistory');

function formatNumber(value) {
  if (!isFinite(value)) return 'Error';
  if (Number.isNaN(value)) return 'Error';

  const rounded = Math.round(value * 1e10) / 1e10;

  if (Math.abs(rounded) >= 1e12 || (rounded !== 0 && Math.abs(rounded) < 1e-6)) {
    return rounded.toExponential(6).replace(/e\+?/, 'e');
  }

  const sign = rounded < 0 ? '-' : '';
  const [intPart, decPart] = String(Math.abs(rounded)).split('.');
  const withCommas = Number(intPart).toLocaleString('en-US');
  return sign + (decPart !== undefined ? `${withCommas}.${decPart}` : withCommas);
}

function clearDisplayNumber(str) {
  return str.replace(/,/g, '');
}

function updateResult() {
  resultEl.textContent = formatNumber(Number(current));
  resultEl.classList.add('bump');
  setTimeout(() => resultEl.classList.remove('bump'), 120);
}

function updateExpression() {
  if (previous !== null && operator) {
    expressionEl.textContent = `${formatNumber(previous)} ${operator}`;
  } else {
    expressionEl.textContent = '\u00A0';
  }
}

function compute(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    default: return b;
  }
}

function inputNumber(digit) {
  if (overwrite) {
    current = digit;
    overwrite = false;
  } else {
    current = current === '0' ? digit : current + digit;
  }
}

function inputDecimal() {
  if (overwrite) {
    current = '0.';
    overwrite = false;
    return;
  }
  if (!current.includes('.')) current += '.';
}

function chooseOperator(op) {
  if (operator && !overwrite) {

    const result = compute(Number(previous), operator, Number(clearDisplayNumber(current)));
    previous = result;
    current = String(result);
  } else {
    previous = Number(clearDisplayNumber(current));
  }
  operator = op;
  overwrite = true;
  lastOperator = null;

  highlightOperator(op);
  updateResult();
  updateExpression();
}

function equals() {
  if (operator === null) {

    if (lastOperator !== null && lastOperand !== null) {
      const result = compute(Number(clearDisplayNumber(current)), lastOperator, lastOperand);
      pushHistory(`${formatNumber(Number(clearDisplayNumber(current)))} ${lastOperator} ${formatNumber(lastOperand)}`, result);
      current = String(result);
      updateResult();
    }
    return;
  }

  const a = previous;
  const b = Number(clearDisplayNumber(current));
  const result = compute(a, operator, b);

  pushHistory(`${formatNumber(a)} ${operator} ${formatNumber(b)}`, result);

  lastOperator = operator;
  lastOperand = b;

  current = String(result);
  previous = null;
  operator = null;
  overwrite = true;

  highlightOperator(null);
  expressionEl.textContent = '\u00A0';
  updateResult();
}

function clearAll() {
  current = '0';
  previous = null;
  operator = null;
  overwrite = true;
  lastOperator = null;
  lastOperand = null;
  highlightOperator(null);
  expressionEl.textContent = '\u00A0';
  resultEl.textContent = '0';
}

function deleteLast() {
  if (overwrite) return;
  current = current.length > 1 ? current.slice(0, -1) : '0';
  if (current === '-') current = '0';
  updateResult();
}

function toggleSign() {
  if (current === '0') return;
  current = current.startsWith('-') ? current.slice(1) : '-' + current;
  updateResult();
}

function percent() {
  current = String(Number(clearDisplayNumber(current)) / 100);
  overwrite = true;
  updateResult();
}

function highlightOperator(op) {
  document.querySelectorAll('.key.op').forEach((btn) => {
    btn.classList.toggle('active', op !== null && btn.dataset.op === op);
  });
}

function pushHistory(expression, result) {
  history.unshift({ expression, result: formatNumber(result) });
  if (history.length > 30) history.pop();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  historyEmpty.hidden = history.length !== 0;

  history.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="h-expr">${item.expression}</span><span class="h-res">${item.result}</span>`;
    li.addEventListener('click', () => {
      current = item.result.replace(/,/g, '');
      overwrite = true;
      updateResult();
    });
    historyList.appendChild(li);
  });
}

const actions = {
  clear: clearAll,
  equals,
  decimal: inputDecimal,
  sign: toggleSign,
  percent,
};

keypad.addEventListener('click', (e) => {
  const key = e.target.closest('.key');
  if (!key) return;

  if (key.dataset.number !== undefined) {
    inputNumber(key.dataset.number);
    updateResult();
  } else if (key.dataset.action === 'operator') {
    chooseOperator(key.dataset.op);
  } else {
    const fn = actions[key.dataset.action];
    if (fn) fn();
  }
});

const KEY_MAP = {
  '+': '+',
  '-': '−',
  '*': '×',
  'x': '×',
  'X': '×',
  '/': '÷',
};

document.addEventListener('keydown', (e) => {
  const k = e.key;
  let selector = null;

  if (/^[0-9]$/.test(k)) {
    inputNumber(k);
    updateResult();
    selector = `[data-number="${k}"]`;
  } else if (k === '.' || k === ',') {
    inputDecimal();
    updateResult();
    selector = '[data-action="decimal"]';
  } else if (KEY_MAP[k]) {
    const op = KEY_MAP[k];
    chooseOperator(op);
    selector = `[data-op="${op}"]`;
  } else if (k === 'Enter' || k === '=') {
    e.preventDefault();
    equals();
    selector = '[data-action="equals"]';
  } else if (k === 'Backspace') {
    deleteLast();
    selector = null;
  } else if (k === 'Escape' || k.toLowerCase() === 'c') {
    clearAll();
    selector = '[data-action="clear"]';
  } else if (k === '%') {
    percent();
    selector = '[data-action="percent"]';
  }

  if (selector) {
    const btn = keypad.querySelector(selector);
    if (btn) {
      btn.classList.add('press');
      setTimeout(() => btn.classList.remove('press'), 110);
    }
  }
});

historyToggle.addEventListener('click', () => {
  historyPanel.hidden = !historyPanel.hidden;
  historyToggle.classList.toggle('active', !historyPanel.hidden);
});

clearHistoryBtn.addEventListener('click', () => {
  history = [];
  renderHistory();
});

renderHistory();
