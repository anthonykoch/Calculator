/*
Design credit goes to Jaroslav Getman
https://dribbble.com/shots/2334270-004-Calculator

Hello codepen people! I think the js part of the calculator is finally working!

The parsing for the mathematical expressions is not really efficient. I imagine there's some other extremely efficient parsing algorithm that could have been used, but this was the easiest for me to understand and make. Let me know if anything is off. Thanks!

Keybindings:
- Backspace: Clears the last digit in the current operand
- Delete: Sets the current operand to 0
- Numberpad: They keys of a standard numpad will work.
- Parens: Shift + ( or Shift + )

Bugs:
- Fix leading zero display error when a 0 is negated and subsequently appended onto.
- Fix issue where the current operand and current operator are added every time a new operator is selected (fixed?)
- Not sure what should happen after a closing paren is added right after an opening paren. At the moment it just adds the current operand.
- Fix bug where an operator will replace a paren

Todo:
- Make functions pure, so that the only function that modifies the state is check
- When a keybinding is pressed, make the keypad show the key that was pressed
- Use the total as the current operand when the current total is negated or when there is no previous operand (done?)
- Rename "state.expressions" to "state.expressionParts"
- Maybe auto add closing parens
- How should expression overflow off the left side of the screen be shown? The shadow looks weird.
- Vertical align operators and operands in expression list display

*/



const classes = {
	buttons: '.js-calculator-button',
	equals: '.js-calculator-equals',
	header: '.js-calculator-header',
	expressionsDisplay: '.js-calculator-expressions-display',
	expressionOverflow: '.js-calculator-expressions-overflow',
	currentOperand: '.js-current-operand',
};

// Shows the current operator
const $currentOperator = $(classes.currentOperator);
// Displays the current operand
const $currentOperand = $(classes.currentOperand);
// Display for exprawdaw
const $expressionsDisplay = $(classes.expressionsDisplay);
// The calculator header which shows the current operand and expression display
const $header = $(classes.header);
const $expressionOverflow = $(classes.expressionOverflow);

$$(classes.buttons)
	.filter(button => ! button.classList.contains('empty'))
	.forEach(function (button) {
		button.addEventListener('click', function onButtonClick(e) {
			check(e.target.textContent.trim());
		});
	});

$(classes.equals)
	.addEventListener('click', () => check('\n'));



// Mode show total causes the total to be displayed in the current operand display
const MODE_SHOW_TOTAL     = 1 << 1;
// Mode insert operand causes the current operand to be overwritten. After the first character has been written, the mode should go to mode append operand
const MODE_INSERT_OPERAND = 1 << 2;
// Mode append operand causes any operand parts to be appended to the current operand
const MODE_APPEND_OPERAND = 1 << 3;

// The maximum number of digits the current operand may be
const MAX_NUMBER_LENGTH = Number.MAX_SAFE_INTEGER.toString().length;

const RE_PAREN = /^[()]$/;
const RE_OPERAND_PART = /^[0-9.]$/;
const RE_OPERATOR = /^[/*\-+%√]$/;
const RE_DIGIT = /[0-9]+/;

const CALCULATOR_ERROR = 'Error';

let state = {
	expressions: ['5', '+', '7', '-', '45', '+', '3', '+', '177', '-'],
	currentOperand: '147',
	currentOperator: '-',
	previousOperand: '177',
	mode: MODE_SHOW_TOTAL|MODE_INSERT_OPERAND,
	openParenStack: 0,
};

let lastCharacter = '-';

setTimeout(function () {
	render(state);
	console.log(getTotal(state))
});

/**
 * Here we ascertain that the user is finished entering in the expression and has explicitly pressed the equal sign. Whereas other times we would ignore parsing and evaluating errors after an operator is selected, the reason being that the expression may not be fully complete, here we will set the state to show an error message if the evaluator throws an error.
 */
function explicitTotal(state) {
	let newCurrentOperand;
	let newExpressions = [];

	// If the current operand has been modified (signified by the mode being in append operand mode), add it to the expressions list
	if (state.mode & MODE_APPEND_OPERAND) {
		newExpressions = state.expressions.concat([state.currentOperand]);
		console.log('Adding current operand to expressions');
	}

	if (isOperator(last(state.expressions))) {
		let expressionString = `${state.expressions.join(' ')} ${state.currentOperand}`;
		newCurrentOperand = new Evaluator({ data: expressionString }).eval();
	} else {
		try {
			newCurrentOperand = getTotal(state);
		} catch (err) {
			newCurrentOperand = CALCULATOR_ERROR;
		}
	}

	return Object.assign({}, state, {
		currentOperand: newCurrentOperand,
		expressions: newExpressions,
		mode: MODE_SHOW_TOTAL|MODE_INSERT_OPERAND
	});
}

function render(state) {
	let operand;
	let operandLength;

	if ($currentOperand.classList.contains('has-error')) {
		$currentOperand.classList.remove('has-error');
	}

	$expressionsDisplay.textContent = expressionsToDisplayString(state.expressions);

	if (state.mode & MODE_SHOW_TOTAL) {
		// If there is no previous operand, use the current operand as the total
		if (state.previousOperand === '') {
			operand = state.currentOperand;
		} else {
			// We ignore errors because we don't yet know if the expression entered by the user is fully complete
			try {
				operand = getTotal(state);
			} catch (err) {
				console.log(err);
				return;
			}
		}
	} else {
		operand = state.currentOperand;
	}

	if (state.currentOperand === CALCULATOR_ERROR) {
		$currentOperand.textContent = CALCULATOR_ERROR;
		$currentOperand.classList.add('has-error');
	} else {
		$currentOperand.textContent = operand;
	}

	const { fontSize, fontWeight } = getNewFont(operand.length);
	$currentOperand.style.fontWeight = fontWeight;
	$currentOperand.style.fontSize = fontSize;

	let expressionsWidth = $expressionsDisplay.getBoundingClientRect().width;
	let headerWidth = $header.getBoundingClientRect().width;

	if (expressionsWidth + 30 > headerWidth) {
		$expressionOverflow.classList.add('is-showing');
	} else {
		$expressionOverflow.classList.remove('is-showing');
	}
}

function getNewFont(stringLength) {
	let fontSize;
	let fontWeight;

	if (stringLength < 8) {
		fontSize = '60px';
		fontWeight = '200';
	} else if (stringLength <= MAX_NUMBER_LENGTH) {
		fontSize = '28px';
		fontWeight = '300';
	} else if (stringLength >= MAX_NUMBER_LENGTH) {
		fontSize = '24px';
		fontWeight = '300';
	}

	return { fontSize, fontWeight };
}

/**
 * Prepares the expressions array for display
 * @param {Array} array
 * @return {String}
 */
function expressionsToDisplayString(arr) {
	return arr
		.map(function (str, index, array) {
			const s = str.trim();

			if (array[index -1] === '(') {
				return s;
			} else if (s === ')') {
				return s
			} else if (s[0] === '-' && isOperandPart(s[1])) {
				return ' ' + str;
			} else if (s === '√') {
				return ' yroot';
			} else {
				return ' ' + s;
			}

			return str;
		})
		.join('');
}



/**
 * Caluclates the total from the given state
 * @param  {Object} state
 * @return {String}       The total for the expression
 */
function getTotal(state) {
	let expressionString;

	if (state.expressions.length === 0) {
		return String(state.currentOperand);
	}

	if (isOperator(last(state.expressions))) {
		expressionString = state.expressions
			.filter((item, index, array) => index !== array.length - 1)
			.join(' ');
	} else {
		expressionString = state.expressions.join('');
	}

	console.log(`"${expressionString}"`)
	return String(new Evaluator({ data: expressionString }).eval());
}



function appendCurrentOperand(value) {
	let newMode = state.mode;
	let newCurrentOperand = state.currentOperand;

	// Disallow leading zeros
	if (value === '0' && state.currentOperand[0] === '0') {
		return state;
	}

	// Avoid appended multiple decimals
	if (value === '.' && state.currentOperand.includes('.')) {
		return state;
	}

	// 	Switch modes from showing the total to the current operand
	if (state.mode & MODE_SHOW_TOTAL) {
		newMode = MODE_INSERT_OPERAND;
		// console.log('switching to mode insert operand')
	}

	//
	if (state.mode & MODE_INSERT_OPERAND) {
		newCurrentOperand = value;
		newMode = MODE_APPEND_OPERAND;
		// console.log('Moving to mode append operand')
	} else {
		newCurrentOperand += value;
		// console.log('In mode append operand')
	}

	return Object.assign({}, state, {
		currentOperand: newCurrentOperand.substring(0, MAX_NUMBER_LENGTH),
		mode: newMode
	});
}

function addOperator(operator) {
	let { expressions: newExpressions, currentOperator: newOperator } = state;

	// console.log('adding operator:', state)
	// console.log('lastCharacter:', lastCharacter);

	// Don't append operators right after opening parens
	if (lastCharacter === '(')	{
		// console.log('paren is before this');
		return state;
	}

	// Update the current operator instead of adding a new one
	if (isOperator(lastCharacter)) {
		// console.log('Updating current operator')
		newOperator = operator;
		newExpressions = state.expressions
			.filter((item, index, array) => index !== array.length -1)
			.concat([newOperator]);
	} else {
		// console.log('Adding current operand and operator');
		// Handle case where the part on the left is an expression
		if (lastCharacter === ')') {
			newExpressions = state.expressions
											.concat([operator]);
		} else {
			newExpressions = state.expressions
											.concat([state.currentOperand, operator]);
		}

		newOperator = operator;
	}

	return Object.assign({}, state, {
		currentOperator: newOperator,
		previousOperand: state.currentOperand,
		expressions: newExpressions,
		mode: MODE_INSERT_OPERAND|MODE_SHOW_TOTAL
	});
}

function clearExpressions(newState) {
	return Object.assign({}, state, {
		expressions: [],
		currentOperand: '0',
		previousOperand: '',
		currentOperator: '',
		mode: MODE_SHOW_TOTAL|MODE_INSERT_OPERAND,
	}, newState);
}

function negateCurrentOperand() {
	let { mode: newMode, currentOperand: newCurrentOperand }	= state;

	if (state.mode & MODE_SHOW_TOTAL) {
		// NOTE: Maybe a try catch here? getTotal throws, but it shouldn't throw here
		const total = getTotal(state);
		newCurrentOperand = `${(Math.sign(total) === 0) ? '-': ''}${total}`;
		newMode = MODE_APPEND_OPERAND;
		// console.log('Using total for negation')
	} else {
		if (state.currentOperand[0] === '-') {
			newCurrentOperand = state.currentOperand
					.substring(1, state.currentOperand.length);
		} else {
			newCurrentOperand = '-' + state.currentOperand;
		}
		// console.log('Using current operand for negation')
	}

	return Object.assign({}, state, {
		mode: newMode,
		currentOperand: newCurrentOperand
	});
}

function addParen(paren) {
	let { mode: newMode, openParenStack, expressions: newExpressions } = state;

	if (paren === '(') {
			newExpressions = newExpressions.concat(['(']);
			openParenStack++;
		} else {
			if (openParenStack <= 0) {
				return state;
			}

			newExpressions = newExpressions.concat([state.currentOperand, ')']);
			newMode = MODE_SHOW_TOTAL|MODE_INSERT_OPERAND;
			openParenStack--;
		}

	return Object.assign({}, state, {
		expressions: newExpressions,
		mode: newMode,
		openParenStack
	});
}

function backspace() {
	const { currentOperand } = state;
	let newMode = MODE_APPEND_OPERAND;
	let newCurrentOperand = currentOperand.substring(0, currentOperand.length - 1);

	if (newCurrentOperand === '') {
		newCurrentOperand = '0';
		newMode = MODE_INSERT_OPERAND;
	}

	return Object.assign({}, state, {
		currentOperand: newCurrentOperand,
		mode: newMode,
	});
}

function clearCurrentOperand() {
	return Object.assign({}, state, {
		currentOperand: '0',
		mode: MODE_INSERT_OPERAND
	});
}

// Change each function to return state instead of modifying it
function check(value) {
	if (isOperandPart(value)) {
		state = appendCurrentOperand(value);
	}
	else if (isOperator(value)) {
		state = addOperator(value);
	}
	else if (value === '+/-') {
		state = negateCurrentOperand();
	}
	else if (value === 'C') {
		state = clearExpressions();
	}
	else if (value === 'c') {
		state = clearCurrentOperand();
	}
	else if (value === '\b') {
		state = backspace();
	}
	else if(value === '\n') {
		state = explicitTotal(state);
	}
	else if (isParen(value)) {
		state = addParen(value);
	}

	lastCharacter = value;
	render(state);
}

/**
 * Returns the last item in the collection
 * @param {Collection} collection
 * @return {*}
 */
function last(collection) {
	return collection[collection.length - 1];
}

/**
 * Returns true if the value is an operand
 * @param  {String}  value
 * @return {Boolean}
 */
function isOperandPart(value) {
    return RE_OPERAND_PART.test(value);
}

/**
 * Returns true if the value is an operator
 * @param  {String}  value
 * @return {Boolean}
 */
function isOperator(value) {
    return RE_OPERATOR.test(value);
}

/**
 * Returns true if the value is an opening or closing paren.
 * @param {String} value
 * @return {Boolean}
 */
function isParen(value) {
	return RE_PAREN.test(value);
}

/**
 * A very naive way of testing if a string is a number.
 * (Don't use this in production)
 * @param {String} value
 * @return {Boolean}
 */
function isNumber(value) {
	return RE_DIGIT.test(value);
}



// Handle keybindings
window.addEventListener('keypress', function onWindowKeypress(e) {
	const char = String.fromCharCode(e.keyCode);
	// console.log(String.fromCharCode(e.keyCode), e);

	if (char === '-' && e.shiftKey) {
		e.preventDefault();
		check('+/-');
	}	else if (char === '\b') {
		console.log('backspace?')
	} else {
		check(char);
	}
});

window.addEventListener('keydown', function onWindowKeydown(e) {
	const KEY_BACKSPACE = 8;
	const KEY_DELETE = 46;
	const KEY_ENTER = 13;
	const KEY_ESCAPE = 27;

	switch (e.keyCode) {
		case KEY_BACKSPACE:
			check('\b');
			return e.preventDefault();

		case KEY_DELETE:
			check('c');
			return e.preventDefault();

		case KEY_ENTER:
			check('\n');
			return e.preventDefault();

		case KEY_ESCAPE:
			check('C');
			return e.preventDefault();
	}
});





// Debug function for flags
function getFlags(flags) {
	let arr = [];

	if (flags & MODE_SHOW_TOTAL) {
		arr.push('MODE_SHOW_TOTAL');
	}
	if (flags & MODE_INSERT_OPERAND) {
		arr.push('MODE_INSERT_OPERAND');
	}

	if (flags & MODE_APPEND_OPERAND) {
		arr.push('MODE_APPEND_OPERAND');
	}

	return arr.join('|');
}


