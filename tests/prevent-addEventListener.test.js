/* global QUnit */
/* eslint-disable no-eval */
const { test, module, testDone } = QUnit;
const name = 'prevent-addEventListener';

module(name);

const evalWrapper = eval;

const runScriptlet = (event, func, hit) => {
    const params = {
        name,
        args: [event, func],
        hit,
    };
    const resultString = window.scriptlets.invoke(params);
    evalWrapper(resultString);
};

const clearProperties = (...props) => {
    props.forEach((prop) => {
        delete window[prop];
    });
};

const originalEventLister = window.EventTarget.prototype.addEventListener;

testDone(() => {
    clearProperties('hit');
    window.EventTarget.prototype.addEventListener = originalEventLister;
});

const hit = () => {
    window.hit = 'FIRED';
};

test('ubo alias works', (assert) => {
    const params = {
        name: 'ubo-addEventListener-defuser.js',
        args: ['click', 'clicked'],
        hit,
    };
    const resString = window.scriptlets.invoke(params);

    evalWrapper(resString);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = 'clicked';
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearProperties(testProp);
});

test('does not allow to add event listener', (assert) => {
    runScriptlet('click', 'clicked', hit);

    const testProp = 'testProp';
    const element = document.createElement('div');
    element.addEventListener('click', () => {
        window[testProp] = 'clicked';
    });
    element.click();

    assert.strictEqual(window.hit, 'FIRED', 'hit function fired');
    assert.strictEqual(window[testProp], undefined, 'property should be undefined');
    clearProperties(testProp);
});

test('event listeners not corresponding to scriptlet arguments should be added correctly', (assert) => {
    runScriptlet('click', undefined, hit);

    const focusProp = 'focusProp';
    const element = document.createElement('div');
    element.addEventListener('focus', () => {
        window[focusProp] = 'focused';
    });

    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, undefined, 'hit function not fired');
    assert.strictEqual(window[focusProp], 'focused', 'property should change');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked';
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearProperties(clickProp, focusProp);
});

test('event listeners with handlers matched with regexp not added', (assert) => {
    runScriptlet(undefined, '/click/', hit);

    const element = document.createElement('div');

    const clickProp = 'clickProp';
    element.addEventListener('click', () => {
        window[clickProp] = 'clicked'; // this string matches with regex
    });
    element.click();
    assert.strictEqual(window.hit, 'FIRED', 'hit function should not fire');
    assert.strictEqual(window[clickProp], undefined, 'property should be undefined');
    clearProperties('hit');

    const focusProp = 'focusProp';
    element.addEventListener('focus', () => {
        window[focusProp] = 'clicked'; // this string matches with regex
    });
    element.dispatchEvent(new Event('focus'));
    assert.strictEqual(window.hit, 'FIRED', 'hit function not fired');
    assert.strictEqual(window[focusProp], undefined, 'property should be undefined');
    clearProperties('hit');

    // this event listener should work correctly
    element.addEventListener('click', () => {
        window[focusProp] = 'focus'; // this string doesn't match with regex
    });
    element.click();
    assert.strictEqual(window.hit, undefined, 'hit function should not fire');
    assert.strictEqual(window[focusProp], 'focus', 'property should change');

    clearProperties(clickProp, focusProp);
});
