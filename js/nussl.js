/*!
 * nussl.js v0.1.0
 * https://github.com/nekoyoubi/nussl/js/nussl.js
 * (c) 2024 http://nekoyoubi.com
 * Released under the MIT License.
 * Example usages:
 * always().when("button").gets("click").then(element => element.classList.toggle("active"));
 * always().when("button", "input.button").gets("click").after(1000, element => element.classList.toggle("active"));
 * always().when("h1,h2,h3,h4,h5,h6").gets("mouseenter").then(element => element.classList.add("highlight")).and().gets("mouseleave").after(250, element => element.classList.remove("highlight"));
 * once().when("body").gets("load").trigger("click").on("#show-login");
 * only(el => (el.type === "password" ?? false) && window.location.protocol === "https:").when("#login-password").gets("mouseenter").then(element => { element.type = "text"; element.addEventListener("mouseleave", () => element.type = "password"); });
 * only(el => el.innerText?.includes("about") ?? false).when("h1", "h2").exists(elements => elements.forEach(element => console.log(`Header containing 'about' found: ${element}`)));
 * until().any("#element1", "#element2").exists(elements => elements.forEach(element => console.log(`Element found: ${element}`)));
 * until().all("#element1", "#element2").exists(elements => alert("All elements found!"));
 * unless().any("#element1", "#element2").exists(elements => alert("No elements found!"));
 */

class ElementWatcher {
	constructor() {
		this.eventHandlers = [];
		this.chain = [];
		this.selectors = [];
	}

	static always() {
		return new ElementWatcher();
	}

	static once() {
		const instance = new ElementWatcher();
		instance.once = true;
		return instance;
	}

	static until() {
		const instance = new ElementWatcher();
		instance.until = true;
		return instance;
	}

	static only(condition) {
		const instance = new ElementWatcher();
		instance.condition = condition;
		return instance;
	}

	static unless() {
		const instance = new ElementWatcher();
		instance.unless = true;
		return instance;
	}

	when(...selectors) {
		this.selectors = selectors;
		return this;
	}

	gets(event) {
		this.chain.push({ event });
		return this;
	}

	after(delay, callback) {
		const last = this.chain[this.chain.length - 1];
		if (last) {
			last.delay = delay;
			last.callback = callback;
		}
		this.processElements(false);
		return this;
	}

	then(callback) {
		const last = this.chain[this.chain.length - 1];
		if (last) {
			last.callback = callback;
		}
		this.processElements(false);
		return this;
	}

	and() {
		return this;
	}

	exists(callback) {
		this.callback = callback;
		this.processElements(true);
		return this;
	}

	trigger(eventName) {
		this.triggerEventName = eventName;
		return this;
	}

	on(targetSelector) {
		this.targetSelector = targetSelector;
		this.processElements(false);
		return this;
	}

	all(...selectors) {
		this.selectors = selectors;
		this.requireAll = true;
		return this;
	}

	any(...selectors) {
		this.selectors = selectors;
		this.requireAny = true;
		return this;
	}

	processElements(forExistence) {
		const evaluateElements = () => {
			const elementGroups = this.selectors.map((selector) =>
				Array.from(document.querySelectorAll(selector))
			);
			const flattenedElements = elementGroups.flat();
			const foundSelectorsCount = elementGroups.filter(
				(group) => group.length > 0
			).length;

			if (forExistence) {
				if (
					this.requireAll &&
					foundSelectorsCount === this.selectors.length
				) {
					this.callback(flattenedElements);
				} else if (this.requireAny && flattenedElements.length > 0) {
					this.callback(flattenedElements);
				} else if (this.unless && flattenedElements.length === 0) {
					this.callback();
				}
			} else {
				flattenedElements.forEach((element) => {
					if (this.condition && !this.condition(element)) return;
					this.chain.forEach((chainItem) => {
						const { event, delay, callback } = chainItem;
						const eventListener = (e) => {
							if (delay) {
								setTimeout(() => callback && callback(element, e), delay);
							} else {
								callback && callback(element, e);
							}
						};
						element.addEventListener(event, eventListener, {
							once: this.once,
						});
						if (this.triggerEventName && this.targetSelector) {
							const target = document.querySelector(this.targetSelector);
							if (target) {
								element.addEventListener(event, () =>
									target.dispatchEvent(new Event(this.triggerEventName))
								, { once: this.once });
							}
						}
					});
				});
			}
		};

		const observerCallback = (mutations, observer) => {
			evaluateElements();
			if (this.once && forExistence) {
				observer.disconnect();
			}
		};

		const observer = new MutationObserver(observerCallback);
		observer.observe(document.body, { childList: true, subtree: true });
		evaluateElements();
	}
}

const always = ElementWatcher.always;
const once = ElementWatcher.once;
const until = ElementWatcher.until;
const only = ElementWatcher.only;
const unless = ElementWatcher.unless;

/**
 * Ensures that Tailwind CSS is included in the document by finding or creating a link element
 * with the specified attributes and appending it to the document head.
 */
function ensureTailwindCss() {
	findOrCreateElement(
		"#nussl-core-tailwindcss",
		"script",
		{ src: "https://cdn.tailwindcss.com", id: "nussl-core-tailwindcss", },
		null,
		document.body
	);
}

/**
 * Adds a CSS string to the document's head as a style element.
 *
 * @param {string} css - The CSS string to be added to the document.
 */
function nusslCss(css) {
	const style = findOrCreateElement("#nussl-core-css", "style", { type: "text/css", id: "nussl-core-css" }, null, document.head);
	style.textContent = css;
}

/**
 * Finds an existing element or creates a new one, setting its attributes and inner content, and appends it to the specified parent element.
 *
 * @param {string} selector - The CSS selector to use to find an existing element.
 * @param {string} tag - The type of HTML element to create (e.g., 'div', 'span', 'p').
 * @param {Object} [attributes={}] - An object containing key-value pairs of attributes to set on the element.
 * @param {Object} [inner={ html: null, innerText: null, textContent: null }] - An object containing 'html', 'innerText', or 'textContent' to set as the inner content of the element.
 * @param {string} [inner.html=null] - HTML content to set inside the element.
 * @param {string} [inner.innerText=null] - Inner text to set inside the element.
 * @param {string} [inner.textContent=null] - Text content to set inside the element.
 * @param {HTMLElement} [parent=document.body] - The parent element to which the new element will be appended. Defaults to document.body.
 * @returns {HTMLElement} The existing or newly created HTML element.
 */
function findOrCreateElement(
	selector,
	tag,
	attributes = {},
	inner = { html: null, innerText: null, textContent: null },
	parent
) {
	const element =
		document.querySelector(selector) ??
		createAndAppendElement(tag, attributes, inner, parent);
	return element;
}

/**
 * Creates a new HTML element, sets its attributes and inner content, and appends it to a parent element.
 *
 * @param {string} tag - The type of HTML element to create (e.g., 'div', 'span', 'p').
 * @param {Object} [attributes={}] - An object containing key-value pairs of attributes to set on the element.
 * @param {Object} [inner={ html: null, innerText: null, textContent: null }] - An object containing 'html', 'innerText', or 'textContent' to set as the inner content of the element.
 * @param {string} [inner.html=null] - HTML content to set inside the element.
 * @param {string} [inner.innerText=null] - Inner text to set inside the element.
 * @param {string} [inner.textContent=null] - Text content to set inside the element.
 * @param {HTMLElement} [parent=document.body] - The parent element to which the new element will be appended. Defaults to document.body.
 * @returns {HTMLElement} The newly created HTML element.
 */
function createAndAppendElement(
	tag,
	attributes = {},
	inner = { html: null, innerText: null, textContent: null },
	parent
) {
	const element = document.createElement(tag);
	inner = inner ?? { html: null, text: null };
	if (attributes)
		Object.keys(attributes).forEach((key) =>
			element.setAttribute(key, attributes[key])
		);
	(parent ?? document.body).append(element);
	if (inner?.innerText) element.innerText = inner.innerText;
	else if (inner?.textContent) element.textContent = inner.textContent;
	else if (inner?.html) element.innerHTML = inner.html;
	return element;
}
