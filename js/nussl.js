/*!
 * nussl.js v0.2.0
 * https://github.com/nekoyoubi/nussl/js/nussl.js
 * (c) 2024 http://nekoyoubi.com
 * Released under the MIT License.
 * 
 * ElementWatcher example usage:
 * always().when("button").gets("click").then(element => element.classList.toggle("active"));
 * always().when("button", "input.button").gets("click").after(1000, element => element.classList.toggle("active"));
 * always().when("h1,h2,h3,h4,h5,h6").gets("mouseenter").then(element => element.classList.add("highlight")).and().gets("mouseleave").after(250, element => element.classList.remove("highlight"));
 * once().when("body").gets("load").trigger("click").on("#show-login");
 * only(el => (el.type === "password" ?? false) && window.location.protocol === "https:").when("#login-password").gets("mouseenter").then(element => { element.type = "text"; element.addEventListener("mouseleave", () => element.type = "password"); });
 * only(el => el.innerText?.includes("about") ?? false).when("h1", "h2").exists(elements => elements.forEach(element => console.log(`Header containing 'about' found: ${element}`)));
 * until().any("#element1", "#element2").exists(elements => elements.forEach(element => console.log(`Element found: ${element}`)));
 * until().all("#element1", "#element2").exists(elements => alert("All elements found!"));
 * unless().any("#element1", "#element2").exists(elements => alert("No elements found!"));
 * 
 * ElementManager example usage:
 * find("button").set({ id: "submit-button", class: "btn btn-primary", innerText: "Submit"});
 * find("#ad-row").hide();
 * find("#ad-row").remove();
 * replace("#ad-row").with("div").set({ id: "info-row", class: "row" });
 * create("div").set({ id: "addon-container", class: "container" }).on("body");
 * find("#submit-button") // .or() segment is bypassed on found; .then() segment is applied to either found or created element
 * 	.or().create("button").on("#login-form").set({ id: "submit-button", class: "btn btn-primary", innerText: "Submit" })
 * 	.then().set({ class__$: "btn-lg bg-blue-500" });
 * find("#submit-button").move("form");
 * create("span").set({ id: "error-message", innerText: "An error occurred." }).move("body").up(9999);
 * create("button").set({ id: "alert-button", innerText: "Alert!" }).on("body").up(12345).listen("click", () => alert("Button clicked!"));
 * use(document.querySelector("#alert-button")).hide();
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
		instance.condition = condition ?? (() => true);
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
				if (this.requireAll && foundSelectorsCount === this.selectors.length) {
					if (typeof this.callback === 'function') {
						this.callback(flattenedElements);
					}
				} else if (this.requireAny && flattenedElements.length > 0) {
					if (typeof this.callback === 'function') {
						this.callback(flattenedElements);
					}
				} else if (this.unless && flattenedElements.length === 0) {
					if (typeof this.callback === 'function') {
						this.callback();
					}
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
			// Rerun the evaluation to check if any elements now exist
			evaluateElements();
			if (this.once && forExistence) {
				observer.disconnect();
			}
		};

		// Observe mutations to the document to detect when elements are added/removed
		const observer = new MutationObserver(observerCallback);
		observer.observe(document.body, { childList: true, subtree: true });

		// Initial evaluation for already existing elements
		if (forExistence) {
			evaluateElements();
		}
	}
}

const always = ElementWatcher.always;
const once = ElementWatcher.once;
const until = ElementWatcher.until;
const only = ElementWatcher.only;
const unless = ElementWatcher.unless;


class ElementManager {
	constructor() {
		this.element = null;
		this.found = false;
		this.bypass = false;
		this.replaced = null;
	}

	static find(selector) {
		return new ElementManager().find(selector);
	}

	static create(tag) {
		return new ElementManager().create(tag);
	}

	static replace(selector) {
		return new ElementManager().replace(selector);
	}

	static use(element) {
		return new ElementManager().use(element);
	}

	find(selector) {
		this.element = document.querySelector(selector);
		if (this.element) this.found = true;
		return this;
	}

	create(tag) {
		if (this.bypass) return this;
		this.element = document.createElement(tag);
		return this;
	}

	replace(selector) {
		this.replaced = document.querySelector(selector);
		return this;
	}

	use(element) {
		this.element = element;
		return this;
	}

	or() {
		this.bypass = this.found;
		return this;
	}

	then() {
		this.bypass = false;
		return this;
	}

	on(parentOrSelector) {
		if (this.bypass) return this;
		if (!this.element?.isConnected)
			(
				typeof parentOrSelector === "string" ? document.querySelector(parentOrSelector)
				: parentOrSelector instanceof HTMLElement ? parentOrSelector
				: document.body
			)?.append(this.element);
		return this;
	}

	set(attributes = {}, content = {}) {
		if (this.bypass) return this;
		function getKey(givenKey) {
			return givenKey.match(/^(?:\$__)?(?<val>.+?)(?:__\$)?$/)?.groups?.val ?? givenKey;
		}
		if (attributes) {
			Object.keys(attributes).forEach((givenKey) => {
				const key = getKey(givenKey);
				const old = this.element?.getAttribute(key);
				const nu = attributes[givenKey];
				if (givenKey.endsWith("__$")) {
					this.element.setAttribute(key, (old ?? "") + nu);
				} else if (givenKey.startsWith("$__")) {
					this.element.setAttribute(key, (nu + old ?? ""));
				} else {
					this.element.setAttribute(key, nu);
				}
			});
		}
		if (content) {
			Object.keys(content).forEach((givenKey) => {
				let key = getKey(givenKey);
				const fun =
					typeof content[givenKey] === 'function'	? content[givenKey] :
					(old) => 
						givenKey.endsWith("__$") ? (old ?? "") + content[givenKey] :
						givenKey.startsWith("$__") ? content[givenKey] + (old ?? "") :
						content[givenKey];
				this.element[key] = fun(this.element[key]);
			});
		}
		return this;
	}

	with(elementManager) {
		this.replaced?.replaceWith(elementManager.element);
		return elementManager;
	}

	move(directionOrSelector = "body", amount = 1) {
		if (this.bypass) return this;
		if (["in", "out"].includes(directionOrSelector)) {
			return this[directionOrSelector](amount);
		}
		else if (["up", "down"].includes(directionOrSelector)) {
			while (amount > 0) {
				const sibling = directionOrSelector === "up" ? this.element.previousElementSibling : this.element.nextElementSibling;
				if (!sibling) break;
				let params = [this.element, sibling];
				if (directionOrSelector === "down") params = params.reverse();
				this.element.parentNode.insertBefore(...params);
				amount--;
			}
		} else {
			document.querySelector(directionOrSelector)?.append(this.element);
		}
		return this;
	}

	up(amount = 1) {
		return this.move("up", amount);
	}

	down(amount = 1) {
		return this.move("down", amount);
	}

	out(amount = 1) {
		if (this.bypass) return this;
		while (amount > 0 && this.element.parentNode && this.element.parentNode !== document.body) {
			const parentElement = this.element.parentNode;
			if (parentElement.parentNode)
				parentElement.parentNode.insertBefore(this.element,parentElement.nextSibling);
			amount--;
		}
		return this;
	}

	in(amount = 1) {
		if (this.bypass) return this;
		while (amount > 0) {
			const previousSibling = this.element.previousElementSibling;
			if (!previousSibling) break;
			previousSibling.appendChild(this.element);
			amount--;
		}
		return this;
	}

	hide(hidden = true) {
		if (this.bypass) return this;
		const style = this.element?.getAttribute("style") ?? "";
		const hiddenStyle = ";/*hide--*/;display:none !important;/*--hide*/;";
		if (hidden && !style.includes(hiddenStyle))
			return this.set({ style__$: ";/*hide--*/;display:none !important;/*--hide*/;" });
		else if (!hidden && style.includes(hiddenStyle))
			return this.set({ style: style?.replace(/\/\*hide--\*\/;display:none !important;\/\*--hide\*\//, "") });
		else
			return this;
	}

	remove() {
		if (this.bypass) return this;
		this.element?.remove();
		return this;
	}

	listen(event, callback) {
		if (this.bypass) return this;
		this.element?.addEventListener(event, callback);
		return this;
	}

	trigger(event) {
		if (this.bypass) return this;
		this.element?.dispatchEvent(new Event(event));
		return this;
	}
}

const find = ElementManager.find;
const create = ElementManager.create;
const replace = ElementManager.replace;
const use = ElementManager.use;

/**
 * Ensures that Tailwind CSS is included in the document by finding or creating a link element
 * with the specified attributes and appending it to the document head.
 */
function ensureTailwindCss() {
	find("#nussl-core-tailwindcss").or().
		create("script").set({ src: "https://cdn.tailwindcss.com", id: "nussl-core-tailwindcss", }).on(document.body);
}

/**
 * Adds a CSS string to the document's head as a style element.
 *
 * @param {string} css - The CSS string to be added to the document.
 */
function nusslCss(css) {
	find("#nussl-core-css").or().
		create("style").set({ type: "text/css", id: "nussl-core-css" }, { textContent: css }).on(document.head);
	//style.textContent = css;
}

